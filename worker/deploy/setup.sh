#!/usr/bin/env bash
set -euo pipefail

# Bootstraps a fresh Ubuntu 22.04/24.04 VM to run the Singularity translation
# worker as a systemd service, using the VM's own native Docker daemon (not
# nested Docker-in-Docker — see docs/PRODUCTION_SETUP.md §A2 for why that
# matters: Fly.io/Railway-style platforms don't support the nested dockerd
# this worker needs for worker/src/test-runner.ts).
#
# Run as root on the VM:
#   curl -fsSL https://raw.githubusercontent.com/JoshuaSmITthGCS/singularity/main/worker/deploy/setup.sh | bash
# or copy the repo up and run ./worker/deploy/setup.sh locally on the VM.

REPO_URL="${SINGULARITY_REPO_URL:-https://github.com/JoshuaSmITthGCS/singularity.git}"
REPO_DIR="/opt/singularity"
BRANCH="${SINGULARITY_BRANCH:-main}"

if ! command -v docker >/dev/null; then
  echo "Docker not found — installing via get.docker.com..."
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v node >/dev/null; then
  echo "Node not found — installing Node 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

corepack enable

if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch origin "$BRANCH"
  git -C "$REPO_DIR" checkout "$BRANCH"
  git -C "$REPO_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
pnpm install --frozen-lockfile
pnpm run worker:build-images

install -m 0644 worker/deploy/singularity-worker.service /etc/systemd/system/singularity-worker.service

if [ ! -f /etc/singularity-worker.env ]; then
  echo "Writing /etc/singularity-worker.env from the example — fill in real secrets before starting."
  install -m 0600 worker/deploy/singularity-worker.env.example /etc/singularity-worker.env
fi

systemctl daemon-reload
systemctl enable singularity-worker

echo ""
echo "Next: edit /etc/singularity-worker.env with real secrets, then run:"
echo "  systemctl start singularity-worker"
echo "  journalctl -u singularity-worker -f"
