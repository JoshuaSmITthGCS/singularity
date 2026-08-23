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

# Build and install Google Test + Google Mock. Ubuntu's libgtest-dev/
# libgmock-dev packages unpack sources under /usr/src/googletest (with
# /usr/src/gtest as a compatibility symlink to its googletest/ subdir — but
# there's no equivalent symlink for the googlemock/ subdir), so build from
# the real shared root rather than the legacy split gtest/gmock paths.
#
# The generated CMakeLists.txt (worker/src/deps.ts) links this installed copy
# through CMake's built-in FindGTest module rather than fetching googletest per
# job: the install stage is time-boxed and the test stage has no network.
RUN cmake -S /usr/src/googletest -B /usr/src/googletest/build && \
    cmake --build /usr/src/googletest/build && \
    find /usr/src/googletest/build -name "*.a" -exec cp {} /usr/lib \;

# CMake writes to $HOME/.cmake when it can. The container runs as a uid this
# image does not choose (see below), so point HOME somewhere any uid can write
# rather than guessing at a home directory.
ENV HOME=/tmp

# Set up non-root user for test execution. worker/src/test-runner.ts
# hardcodes every container to run as uid:gid 1000:1000 (overriding whatever
# USER this Dockerfile sets), so the user created here must be at uid 1000,
# not some other value — only create it if uid 1000 isn't already taken.
RUN if ! id -u 1000 >/dev/null 2>&1; then useradd -m -u 1000 runner; fi
USER 1000:1000

# Default command
CMD ["/bin/bash"]
