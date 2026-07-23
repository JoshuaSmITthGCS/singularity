# Worker deployment (T1.1)

The worker is a long-running Node process that needs a **real Docker daemon**
to launch the 5 sandbox test containers — Netlify (serverless) cannot run it.
This runbook targets a **plain cheap VM**, not a container platform like
Fly.io, because the worker needs to launch *sibling* containers via the host's
Docker socket (Docker-outside-of-Docker), and that's simplest and most
reliable on a box where Docker is just... Docker, not nested inside a
Firecracker microVM. It's also usually the cheapest option that actually
works for this.

## 1. Provision a VM

**Recommended: Hetzner CX22** (2 vCPU, 4 GB RAM, 40 GB disk) — about **$5/mo**,
enough headroom for Java/Maven and C++ builds running inside the sandbox
containers. https://www.hetzner.com/cloud

**Alternative: DigitalOcean** — the $6/mo (1 vCPU/1 GB) tier is too tight once
Java or C++ verification runs; use the $12/mo (2 vCPU/2 GB) Basic Droplet
instead. https://www.digitalocean.com/products/droplets

Either way: Ubuntu 22.04 or 24.04 LTS, add your SSH key at creation, skip
password auth entirely.

## 2. Harden the box (5 minutes)

```bash
ssh root@<VM_IP>
adduser deploy && usermod -aG sudo deploy   # don't run as root day-to-day
ufw allow OpenSSH && ufw enable             # no inbound ports needed beyond SSH —
                                             # the worker only makes outbound calls
apt update && apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
# In /etc/ssh/sshd_config: PasswordAuthentication no, then `systemctl restart sshd`
```

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
# log back in as `deploy` from here on
```

## 4. Clone the repo and build the 5 sandbox images

```bash
git clone https://github.com/<YOUR_ORG>/singularity.git
cd singularity/worker

docker build -t singularity-node-runner       -f docker/node.Dockerfile       docker
docker build -t singularity-typescript-runner -f docker/typescript.Dockerfile docker
docker build -t singularity-java-runner       -f docker/java.Dockerfile       docker
docker build -t singularity-csharp-runner     -f docker/csharp.Dockerfile     docker
docker build -t singularity-cpp-runner        -f docker/cpp.Dockerfile        docker
```

These only need rebuilding when `worker/docker/*.Dockerfile` changes — not on
every worker deploy.

## 5. Set up the shared workspace directory

This is the one non-obvious part of Docker-outside-of-Docker: the worker
container talks to the *host's* Docker socket, so when it asks the host
daemon to bind-mount a workspace directory into a sandbox container, that
path is resolved **on the host**, not inside the worker's own container
filesystem. A directory that only exists inside the worker container would
resolve to empty (or fail) on the host side. The fix is a directory that's
bind-mounted at the *same path* into both:

```bash
sudo mkdir -p /var/singularity/tmp
sudo chmod 777 /var/singularity/tmp   # scratch space, deleted per-job; wide open is fine
```

`docker-compose.yml` already mounts this path and sets
`WORKER_JOB_TMP_DIR=/var/singularity/tmp` to match — don't change one without
the other.

## 6. Configure and start the worker

```bash
cp .env.example .env
nano .env   # fill in NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, WORKER_ID

docker compose up -d --build
docker compose logs -f worker   # should print "Singularity worker worker-prod-1 started"
```

`restart: always` in `docker-compose.yml` means the worker survives crashes
and VM reboots (Docker's own systemd unit is enabled by the install script in
step 3, so Docker itself — and this container with it — comes back after a
reboot with no further action).

## 7. Redeploying after a code change

```bash
cd singularity && git pull
cd worker && docker compose up -d --build
```

The 5 sandbox images don't need rebuilding unless you changed
`worker/docker/*.Dockerfile` — repeat step 4 only in that case.

## 8. Verify it's actually working

```bash
docker compose logs -f worker            # watch it claim and process a variant
docker ps                                # sandbox containers appear/disappear as jobs run
```

From the app: publish a test asset and confirm its source-language variant
flips from `queued` → `testing` → `passed`/`failed` within a few minutes.

## Accepted trade-off: the worker container runs as root

Talking to `/var/run/docker.sock` effectively grants host-level Docker
control, which is only practical as root (matching GIDs between host and
container for a non-root socket-group user is fragile across VM images and
not worth the complexity here). This is standard for Docker-outside-of-Docker
and is an accepted risk specifically because the worker only runs **trusted,
first-party code** (`translator.ts`, `test-runner.ts`, `index.ts`) — the
actual untrusted, LLM-translated content from published assets never executes
in the worker's own process. It only ever runs inside the sandbox containers,
which are hardened separately (dropped capabilities, `no-new-privileges`,
`PidsLimit`, network-off test stage — see `worker/src/test-runner.ts` and
MASTER_PLAN T2.1).
