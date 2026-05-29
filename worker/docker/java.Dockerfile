FROM maven:3.9-eclipse-temurin-21

RUN useradd -m -u 1000 runner

USER runner
WORKDIR /workspace
