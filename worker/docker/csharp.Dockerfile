# C# Test Runner for Unity/Game Dev Code
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /workspace

# Install xUnit test runner globally
RUN dotnet tool install --global dotnet-xunit --version 2.6.6

# Add dotnet tools to PATH
ENV PATH="${PATH}:/root/.dotnet/tools"

# Create a template test project structure
RUN dotnet new xunit -n TestProject && \
    rm -rf TestProject

# Set up non-root user for test execution. worker/src/test-runner.ts
# hardcodes every container to run as uid:gid 1000:1000 (overriding whatever
# USER this Dockerfile sets), so the user created here must be at uid 1000,
# not some other value — only create it if uid 1000 isn't already taken.
RUN if ! id -u 1000 >/dev/null 2>&1; then useradd -m -u 1000 runner; fi
USER 1000:1000

# Default command
CMD ["/bin/bash"]
