# C# Test Runner for Unity/Game Dev Code
FROM mcr.microsoft.com/dotnet/sdk:8.0

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

# The worker starts every sandbox as 1000:1000 (worker/src/test-runner.ts), so
# the image must own that uid. A mismatch leaves dotnet with no writable HOME and
# the NuGet restore fails before a single test runs.
RUN if getent passwd 1000 >/dev/null; then \
      userdel -r "$(getent passwd 1000 | cut -d: -f1)" 2>/dev/null || true; \
    fi \
    && useradd -m -u 1000 runner

ENV HOME=/home/runner
ENV PATH="${PATH}:/home/runner/.dotnet/tools"

USER runner

# Pre-warm the NuGet cache with the exact package set worker/src/deps.ts writes
# into a generated Solution.csproj, so the sandbox's `dotnet restore` is a cache
# hit instead of a cold download racing the install-stage timeout. Warming as
# root would populate the wrong home directory.
RUN mkdir -p /home/runner/warmup \
    && printf '%s\n' \
      '<Project Sdk="Microsoft.NET.Sdk">' \
      '  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>' \
      '  <ItemGroup>' \
      '    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.9.0" />' \
      '    <PackageReference Include="xunit" Version="2.6.6" />' \
      '    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.6" />' \
      '  </ItemGroup>' \
      '</Project>' > /home/runner/warmup/warmup.csproj \
    && dotnet restore /home/runner/warmup/warmup.csproj \
    && rm -rf /home/runner/warmup

WORKDIR /workspace

CMD ["/bin/bash"]
