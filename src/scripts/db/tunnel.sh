#!/bin/bash

# This script establishes an SSH tunnel to the remote manager node and
# starts a temporary container that forwards traffic to the internal database services.

TYPE=$1 # prod or dev

if [ "$TYPE" == "prod" ]; then
  # CHANGE THIS LINE:
  NETWORK="conveniat_maintenance-net"

  PG_HOST="postgres"
  MONGO_HOST="mongo"
  NAME="db-tunnel-prod"
  echo "INFO: Establishing tunnel to PRODUCTION..."

elif [ "$TYPE" == "dev" ]; then
  # UPDATED: Use the attachable maintenance network
  NETWORK="conveniat-dev_maintenance-net"
  PG_HOST="postgres"
  MONGO_HOST="mongo"
  NAME="db-tunnel-dev"
  echo "INFO: Establishing tunnel to DEVELOPMENT (Network: $NETWORK)..."

elif [ "$TYPE" == "konekta" ]; then
  # UPDATED: Use the attachable maintenance network
  NETWORK="konekta-dev_maintenance-net"
  PG_HOST="postgres"
  MONGO_HOST="mongo"
  NAME="db-tunnel-konekta"
  echo "INFO: Establishing tunnel to KONEKTA (Network: $NETWORK)..."

else
  echo "Usage: $0 {prod|dev|konekta}"
  exit 1
fi

# We use -t for SSH to allocate a TTY, which helps with signal propagation (Ctrl+C).
# We forward local port 5433 to remote 5433 (Postgres) and 27018 to remote 27018 (Mongo).
# The remote container then forwards these to the internal service VIPs.

ssh -t -i ~/.ssh/id_rsa_cevi_tools -L 5433:127.0.0.1:5433 -L 27018:127.0.0.1:27018 root@10.0.0.13 \
  "docker stop $NAME 2>/dev/null; \
   docker run --rm --init --name $NAME -p 127.0.0.1:5433:5432 -p 127.0.0.1:27018:27017 --network $NETWORK alpine sh -c \
   'apk add --no-cache socat && (socat TCP-LISTEN:5432,fork TCP:$PG_HOST:5432 & socat TCP-LISTEN:27017,fork TCP:$MONGO_HOST:27017)'"