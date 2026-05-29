# Quick Start - Unreal C++ & C# Demo

## 5-Minute Demo Setup

### Prerequisites
- Docker installed and running
- Terminal/command line access

### Step 1: Build Docker Images (3 minutes)
```bash
cd /Users/eyerise/Documents/sigularity
pnpm run worker:build-images
```

This builds:
- ✅ C# test runner (.NET 8 + xUnit)
- ✅ C++ test runner (GCC + Google Test)
- ✅ TypeScript/JavaScript runners (already built)
- ✅ Java runner (already built)

**Expected output**: "Successfully tagged singularity-csharp-runner" and "singularity-cpp-runner"

### Step 2: Verify Images (30 seconds)
```bash
docker images | grep singularity
```

You should see:
```
singularity-csharp-runner       latest    ...
singularity-cpp-runner          latest    ...
singularity-node-runner         latest    ...
singularity-typescript-runner   latest    ...
singularity-java-runner         latest    ...
```

### Step 3: Test C# (Unity) Code (1 minute)
```bash
cd demo

# Create test project structure
mkdir -p unity-test
cp unity-jump-controller.cs unity-test/Solution.cs
cp unity-jump-controller-tests.cs unity-test/SolutionTests.cs

# Create .csproj file
cat > unity-test/Solution.csproj << 'EOF'
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.9.0" />
    <PackageReference Include="xunit" Version="2.6.6" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.6" />
  </ItemGroup>
</Project>
EOF

# Run tests in Docker
docker run --rm \
  -v $(pwd)/unity-test:/workspace:rw \
  singularity-csharp-runner \
  sh -c "dotnet restore && dotnet test --verbosity normal"
```

**Expected**: All tests pass ✅

### Step 4: Test C++ (Unreal) Code (2 minutes)
```bash
# Create test project structure
mkdir -p unreal-test
cp unreal-jump-controller.h unreal-test/
cp unreal-jump-controller.cpp unreal-test/
cp unreal-jump-controller-tests.cpp unreal-test/tests.cpp

# Create CMakeLists.txt
cat > unreal-test/CMakeLists.txt << 'EOF'
cmake_minimum_required(VERSION 3.14)
project(UnrealJumpDemo)

set(CMAKE_CXX_STANDARD 17)

# Mock Unreal Engine types for testing
add_library(unreal_mocks INTERFACE)
target_include_directories(unreal_mocks INTERFACE ${CMAKE_CURRENT_SOURCE_DIR})

# Google Test
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
FetchContent_MakeAvailable(googletest)

enable_testing()

# Tests
add_executable(tests tests.cpp)
target_link_libraries(tests unreal_mocks GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(tests)
EOF

# Create Unreal mocks (simplified for demo)
cat > unreal-test/unreal_mocks.h << 'EOF'
#pragma once
#include <cmath>
#include <algorithm>

// Mock Unreal types for testing
struct FVector {
    float X, Y, Z;
    FVector() : X(0), Y(0), Z(0) {}
    FVector(float x, float y, float z) : X(x), Y(y), Z(z) {}
    static FVector ZeroVector;
    static FVector UpVector;
};
FVector FVector::ZeroVector = FVector(0, 0, 0);
FVector FVector::UpVector = FVector(0, 0, 1);

namespace FMath {
    inline float Sqrt(float x) { return std::sqrt(x); }
    inline float Max(float a, float b) { return std::max(a, b); }
    inline float Abs(float x) { return std::abs(x); }
}

// Minimal Unreal component mocks
class UActorComponent {
public:
    virtual void BeginPlay() {}
    virtual void TickComponent(float, int, void*) {}
};

class ACharacter {};
class UCharacterMovementComponent {
public:
    bool IsMovingOnGround() { return true; }
    void AddForce(FVector) {}
    float GravityScale = 1.0f;
};

#define UPROPERTY(...)
#define UFUNCTION(...)
#define UCLASS(...)
#define GENERATED_BODY()
EOF

# Build and run tests
docker run --rm \
  -v $(pwd)/unreal-test:/workspace:rw \
  singularity-cpp-runner \
  sh -c "cmake -B build -S . && cmake --build build && cd build && ctest --output-on-failure"
```

**Expected**: All tests pass ✅

### Step 5: Compare Results
Both test suites should pass with identical physics:
- Jump velocity calculations match (6.26 m/s = 626 cm/s)
- Gravity acceleration is consistent
- All 5+ tests pass on both platforms

## Visual Demo (Optional)

### Show Translation in Action
```bash
# Display Unity source
echo "=== UNITY C# SOURCE ==="
head -n 40 unity-jump-controller.cs

echo ""
echo "=== UNREAL C++ TRANSLATION ==="
head -n 50 unreal-jump-controller.cpp

echo ""
echo "KEY CONVERSIONS:"
echo "- Coordinate: Y-up → Z-up"
echo "- Units: meters → centimeters (×100)"
echo "- Gravity: -9.81 m/s² → -980 cm/s²"
echo "- Jump height: 2.0m → 200cm"
echo "- Move speed: 5.0 m/s → 500 cm/s"
```

## What This Proves

✅ **C# and C++ support** is fully working
✅ **Unreal Engine translation** with physics conversion
✅ **Unity → Unreal** code translation preserves behavior
✅ **Test translation** from xUnit to Google Test
✅ **Physics equations** converted correctly (×100 multiplier)
✅ **Coordinate systems** remapped (Y-up → Z-up)

## Next Steps

### Test the Full Pipeline
1. Start the worker: `pnpm worker`
2. Create an asset via the marketplace
3. Upload Unity C# jump controller
4. Watch it translate to Unreal C++, Java, TypeScript automatically
5. All variants tested in Docker
6. Asset published with 5 language versions

### Show to Investors
- **Unique capability**: Only marketplace that does Unity ↔ Unreal
- **Game dev focus**: 80% of indies use Unity or Unreal
- **Physics accuracy**: AI understands kinematic equations
- **Pre-verified**: Tests prove it works before purchase

## Troubleshooting

### Docker build fails
```bash
# Retry with verbose output
docker build --no-cache -t singularity-csharp-runner -f docker/csharp.Dockerfile docker
```

### Tests don't run
```bash
# Check Docker is running
docker ps

# Verify image exists
docker images singularity-csharp-runner
```

### Can't find files
```bash
# Make sure you're in the demo directory
pwd  # Should show .../singularity/demo
ls -la *.cs *.cpp *.h
```

## Contact

Questions? Check:
- Main docs: `/Users/eyerise/Documents/sigularity/EXPANSION_PLAN.md`
- Demo README: `/Users/eyerise/Documents/sigularity/demo/README.md`
- Technical guide: `/Users/eyerise/Documents/sigularity/CLAUDE.md`
