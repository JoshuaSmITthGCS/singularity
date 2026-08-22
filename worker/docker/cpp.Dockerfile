# C++ Test Runner for Unreal Engine Code
FROM ubuntu:22.04

# Prevent timezone prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /workspace

# Install build tools and Google Test
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    g++ \
    clang \
    libgtest-dev \
    libgmock-dev \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Build and install Google Test
RUN cd /usr/src/gtest && \
    cmake CMakeLists.txt && \
    make && \
    cp lib/*.a /usr/lib && \
    cd /usr/src/gmock && \
    cmake CMakeLists.txt && \
    make && \
    cp lib/*.a /usr/lib

# Set up non-root user for test execution. worker/src/test-runner.ts
# hardcodes every container to run as uid:gid 1000:1000 (overriding whatever
# USER this Dockerfile sets), so the user created here must be at uid 1000,
# not some other value — only create it if uid 1000 isn't already taken.
RUN if ! id -u 1000 >/dev/null 2>&1; then useradd -m -u 1000 runner; fi
USER 1000:1000

# Default command
CMD ["/bin/bash"]
