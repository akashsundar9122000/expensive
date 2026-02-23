#!/bin/bash
# Script to run the backend using the Maven wrapper
# Must use JDK 17 (Maven 3.6.3 is incompatible with JDK 25)

export JAVA_HOME=/Users/akash/Library/Java/JavaVirtualMachines/jdk-17.0.12.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

echo "Running backend with Java $(java -version 2>&1 | head -1) ..."
./mvnw spring-boot:run
