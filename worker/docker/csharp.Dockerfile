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

# Set up non-root user for test execution
RUN useradd -m -u 1001 testrunner
USER testrunner

# Default command
CMD ["/bin/bash"]
