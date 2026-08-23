# C# Test Runner for Unity/Game Dev Code
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /workspace

# Note: no dotnet-xunit global tool here. Test execution uses `dotnet test`
# (worker/src/test-runner.ts) against the xunit / xunit.runner.visualstudio
# NuGet packages referenced per-project (worker/src/deps.ts generates the
# .csproj) — the global CLI tool was dead weight and its pinned version has
# since been pulled from NuGet, failing the build outright.

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

# Keep every writable dotnet path off the user's home directory. The container
# runs as a uid this image does not pick (test-runner.ts forces 1000:1000), so
# anything rooted at ~ is a guess — and a dotnet with no writable HOME fails the
# restore before a single test runs. These paths work for any uid.
ENV NUGET_PACKAGES=/opt/nuget-packages \
    DOTNET_CLI_HOME=/tmp/dotnet-cli-home

# Pre-warm the package cache with the exact set worker/src/deps.ts writes into a
# generated Solution.csproj, so the sandbox's `dotnet restore` is a cache hit
# instead of a cold download racing the install-stage timeout. World-writable so
# a job whose .csproj asks for something extra can still restore it — this image
# is an ephemeral, network-off sandbox, not a shared host.
RUN mkdir -p "$NUGET_PACKAGES" /tmp/warmup \
    && printf '%s\n' \
      '<Project Sdk="Microsoft.NET.Sdk">' \
      '  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>' \
      '  <ItemGroup>' \
      '    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.9.0" />' \
      '    <PackageReference Include="xunit" Version="2.6.6" />' \
      '    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.6" />' \
      '  </ItemGroup>' \
      '</Project>' > /tmp/warmup/warmup.csproj \
    && dotnet restore /tmp/warmup/warmup.csproj \
    && rm -rf /tmp/warmup \
    && chmod -R 0777 "$NUGET_PACKAGES"

# Set up non-root user for test execution. worker/src/test-runner.ts
# hardcodes every container to run as uid:gid 1000:1000 (overriding whatever
# USER this Dockerfile sets), so the user created here must be at uid 1000,
# not some other value — only create it if uid 1000 isn't already taken.
RUN if ! id -u 1000 >/dev/null 2>&1; then useradd -m -u 1000 runner; fi
USER 1000:1000

# Default command
CMD ["/bin/bash"]
