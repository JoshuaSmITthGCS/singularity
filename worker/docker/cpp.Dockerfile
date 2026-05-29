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

# Set up non-root user for test execution
RUN useradd -m -u 1001 testrunner
USER testrunner

# Default command
CMD ["/bin/bash"]
