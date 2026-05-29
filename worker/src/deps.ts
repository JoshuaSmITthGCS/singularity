import fs from "node:fs/promises"
import path from "node:path"
import type { Language, TranslationDependencies } from "./types.js"

export async function writeJobFiles({
  dir,
  language,
  code,
  tests,
  dependencies,
}: {
  dir: string
  language: Language
  code: string
  tests: string
  dependencies?: TranslationDependencies
}) {
  if (language === "java") {
    await writeJavaFile(dir, "src/main/java", code, "Solution")
    await writeJavaFile(dir, "src/test/java", tests, "SolutionTest")
    await fs.writeFile(path.join(dir, "pom.xml"), dependencies?.pom_xml || defaultPomXml())
    return
  }

  if (language === "csharp") {
    await fs.writeFile(path.join(dir, "Solution.cs"), code)
    await fs.writeFile(path.join(dir, "SolutionTests.cs"), tests)
    await fs.writeFile(path.join(dir, "Solution.csproj"), dependencies?.csproj || defaultCsProj())
    return
  }

  if (language === "cpp") {
    await fs.writeFile(path.join(dir, "solution.cpp"), code)
    await fs.writeFile(path.join(dir, "solution.h"), "// Auto-generated header")
    await fs.writeFile(path.join(dir, "tests.cpp"), tests)
    await fs.writeFile(path.join(dir, "CMakeLists.txt"), dependencies?.cmake || defaultCMake())
    return
  }

  const extension = language === "typescript" ? "ts" : "js"
  await fs.writeFile(path.join(dir, `solution.${extension}`), code)
  await fs.writeFile(path.join(dir, `solution.test.${extension}`), tests)

  const packageJson = dependencies?.package_json || defaultPackageJson(language)
  await fs.writeFile(path.join(dir, "package.json"), packageJson)
}

function defaultPackageJson(language: Language) {
  return JSON.stringify(
    {
      type: "module",
      scripts: {
        test: "vitest run --reporter=json --outputFile=/reports/report.json",
      },
      devDependencies:
        language === "typescript"
          ? {
              typescript: "latest",
              tsx: "latest",
              vitest: "latest",
            }
          : {
              vitest: "latest",
            },
    },
    null,
    2
  )
}

async function writeJavaFile(dir: string, basePath: string, code: string, fallbackClassName: string) {
  const packageName = code.match(/^\s*package\s+([a-zA-Z_][\w.]*);/m)?.[1]
  const className =
    code.match(/\bpublic\s+(?:abstract\s+|final\s+|sealed\s+|non-sealed\s+)?(?:class|interface|record|enum)\s+([A-Za-z_]\w*)/)?.[1] ??
    code.match(/\b(?:class|interface|record|enum)\s+([A-Za-z_]\w*)/)?.[1] ??
    fallbackClassName
  const packagePath = packageName ? packageName.replaceAll(".", "/") : ""
  const outputDir = path.join(dir, basePath, packagePath)

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(path.join(outputDir, `${className}.java`), code)
}

function defaultPomXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>io.singularity</groupId>
  <artifactId>asset</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.3</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <useModulePath>false</useModulePath>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
`
}

function defaultCsProj() {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.9.0" />
    <PackageReference Include="xunit" Version="2.6.6" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.6">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>
</Project>
`
}

function defaultCMake() {
  return `cmake_minimum_required(VERSION 3.14)
project(SingularityAsset)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Google Test
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
FetchContent_MakeAvailable(googletest)

enable_testing()

# Main library
add_library(solution solution.cpp)

# Tests
add_executable(tests tests.cpp)
target_link_libraries(tests solution GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(tests)
`
}
