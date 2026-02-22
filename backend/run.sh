#!/bin/bash
# Script to run the backend using local Maven installation

# Use the local maven we downloaded
MAVEN_HOME=../tools/apache-maven-3.9.6
export PATH=$MAVEN_HOME/bin:$PATH

echo "Running backend with local Maven from $MAVEN_HOME..."
mvn spring-boot:run
