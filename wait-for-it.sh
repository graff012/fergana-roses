#!/usr/bin/env sh
# https://github.com/vishnubob/wait-for-it

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

wait_for() {
  until nc -z "$host" "$port"; do
    echo "Waiting for $host:$port..."
    sleep 1
  done
}

if [ -z "$host" ] || [ -z "$port" ]; then
  echo "Usage: $0 host port -- command"
  exit 1
fi

wait_for
exec $cmd
