FROM maven:3.9-eclipse-temurin-21

# worker/src/test-runner.ts hardcodes every container to run as uid:gid
# 1000:1000, overriding whatever USER this Dockerfile sets — so what actually
# matters is that uid 1000 exists and has a usable home dir, not what it's
# named. This base image already ships a uid-1000 user; only create one if
# it doesn't (keeps this Dockerfile portable across base image changes).
RUN if ! id -u 1000 >/dev/null 2>&1; then useradd -m -u 1000 runner; fi

USER 1000:1000
WORKDIR /workspace
