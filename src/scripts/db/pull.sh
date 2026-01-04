#!/bin/bash

# This script pulls the database state from the remote infrastructure (via the tunnel)
# and restores it into the local Docker containers.

set -e

# Ensure we are in the project root
cd "$(dirname "$0")/../../.."

# Load .env for local credentials
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "ERROR: .env file not found!"
  exit 1
fi

echo "----------------------------------------------------------"
echo "DB PULL: Remote -> Local"
echo "Make sure your tunnel is open (pnpm db:tunnel-prod/dev)"
echo "----------------------------------------------------------"

echo "INFO: Pulling Postgres..."
POSTGRES_ID=$(docker compose ps -q postgres)
if [ -z "$POSTGRES_ID" ]; then
  echo "ERROR: Local Postgres container is not running. Start it first with 'docker compose up -d postgres'."
  exit 1
fi
read -s -p "Enter Remote Postgres Password: " PGPASSWORD_REMOTE; echo
docker run -i --rm --network host -e PGPASSWORD=$PGPASSWORD_REMOTE postgres:17 \
  pg_dump -h localhost -p 5433 -U conveniat27 --clean --if-exists --no-owner --no-privileges conveniat27 | \
docker exec -i $POSTGRES_ID psql -U $POSTGRES_USER -d $POSTGRES_DB

echo "INFO: Pulling MongoDB..."
MONGO_ID=$(docker compose ps -q mongo)
if [ -z "$MONGO_ID" ]; then
  echo "ERROR: Local MongoDB container is not running. Start it first with 'docker compose up -d mongo'."
  exit 1
fi
docker run -i --rm --network host mongo:latest \
  mongodump --host localhost --port 27018 --archive | \
docker exec -i $MONGO_ID mongorestore --archive --drop

echo "SUCCESS: Remote state pulled to local."
