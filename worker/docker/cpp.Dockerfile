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

# Build and install Google Test. The generated CMakeLists.txt links this copy
# via find_package rather than fetching googletest over the network, so the
# install stage stays fast and the test stage needs no network at all.
RUN cd /usr/src/gtest && \
    cmake CMakeLists.txt && \
    make && \
    cp lib/*.a /usr/lib && \
    cd /usr/src/gmock && \
    cmake CMakeLists.txt && \
    make && \
    cp lib/*.a /usr/lib

# The worker starts every sandbox as 1000:1000 (worker/src/test-runner.ts), so
# the image must own that uid — otherwise the build stage runs as a uid with no
# home directory and no ownership of the workspace.
RUN if getent passwd 1000 >/dev/null; then \
      userdel -r "$(getent passwd 1000 | cut -d: -f1)" 2>/dev/null || true; \
    fi \
    && useradd -m -u 1000 runner

ENV HOME=/home/runner

USER runner

# Default command
CMD ["/bin/bash"]
