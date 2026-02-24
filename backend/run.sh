#!/bin/bash
# Script to run the backend using the Maven wrapper
# Must use JDK 17 (Maven 3.6.3 is incompatible with JDK 25)

set -euo pipefail

export JAVA_HOME=/Users/akash/Library/Java/JavaVirtualMachines/jdk-17.0.12.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

START_PORT=${BACKEND_PORT:-8080}
MAX_ATTEMPTS=20
port="$START_PORT"

find_pid_by_port() {
	local target_port="$1"
	lsof -tiTCP:"$target_port" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

for ((i = 0; i < MAX_ATTEMPTS; i++)); do
	pid="$(find_pid_by_port "$port")"

	if [[ -z "$pid" ]]; then
		break
	fi

	cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
	if [[ "$cmd" == *"backend-0.0.1-SNAPSHOT.jar"* || "$cmd" == *"com.expensify.backend.BackendApplication"* ]]; then
		echo "Stopping existing backend process on port $port (PID $pid)..."
		kill "$pid" || true
		sleep 1
		pid="$(find_pid_by_port "$port")"
		if [[ -z "$pid" ]]; then
			break
		fi
	fi

	if [[ "$port" == "$START_PORT" ]]; then
		echo "Port $port is busy by another process. Searching for a free port..."
	fi
	port=$((port + 1))
done

if [[ -n "$(find_pid_by_port "$port")" ]]; then
	echo "Could not find a free port after $MAX_ATTEMPTS attempts starting from $START_PORT."
	echo "Set BACKEND_PORT to a free port and try again."
	exit 1
fi

echo "Running backend with Java $(java -version 2>&1 | head -1) on port $port ..."
./mvnw spring-boot:run -Dspring-boot.run.arguments="--server.port=$port"
