#!/bin/bash

# This script pushes the local database state to the remote DEVELOPMENT infrastructure.
# IT DOES NOT SUPPORT PRODUCTION FOR SAFETY REASONS.

# Ensure we are in the project root
cd "$(dirname "$0")/../../.."

echo "----------------------------------------------------------"
echo "DB PUSH: Local -> Remote DEV"
echo "Make sure your tunnel is open (pnpm db:tunnel-dev)"
echo "----------------------------------------------------------"

read -p "DANGER: This will OVERWRITE the remote DEV stack (Postgres + Mongo). Continue? (y/N) " confirm
if [[ ! $confirm == [yY] ]]; then
  echo "ABORTED."
  exit 1
fi

set -e

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "ERROR: .env file not found!"
  exit 1
fi

echo "INFO: Pushing Postgres to Dev..."
POSTGRES_ID=$(docker compose ps -q postgres)
if [ -z "$POSTGRES_ID" ]; then
  echo "ERROR: Local Postgres container is not running. Start it first with 'docker compose up -d postgres'."
  exit 1
fi
read -s -p "Enter Remote Dev PG Password: " PGPASSWORD_REMOTE; echo
docker exec -i $POSTGRES_ID pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists --no-owner --no-privileges | \
docker run -i --rm --network host -e PGPASSWORD=$PGPASSWORD_REMOTE postgres:17 \
  psql -h localhost -p 5433 -U conveniat27 -d conveniat27

echo "INFO: Pushing MongoDB to Dev..."
MONGO_ID=$(docker compose ps -q mongo)
if [ -z "$MONGO_ID" ]; then
  echo "ERROR: Local MongoDB container is not running. Start it first with 'docker compose up -d mongo'."
  exit 1
fi
docker exec -i $MONGO_ID mongodump --archive | \
docker run -i --rm --network host mongo:latest \
  mongorestore --host localhost --port 27018 --archive --drop

echo "SUCCESS: Local state pushed to remote DEV."
