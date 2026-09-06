#!/bin/sh
# Keeps the static assets of previous builds reachable across a rolling deploy.
#
# Each image only carries its own `.next/static`. The swarm stacks mount a shared directory at
# `.next/static-persistent` into the app container and serve `/_next/static/` from that same
# directory through nginx, so a browser that still runs the previous build can fetch a chunk after
# the container that built it is gone. Nothing populated that directory before this script
# existed, which is why chunk requests after a rollover answered 404.
#
# Files are copied without preserving timestamps on purpose: a chunk that is still part of the
# current build gets a fresh mtime on every deploy, while one that no build ships anymore ages out
# and is pruned. The retention only has to outlive a client's session and its service worker
# precache; the app reloads itself on a stale bundle anyway.
set -eu

STATIC_DIR=/app/.next/static
PERSISTENT_DIR=/app/.next/static-persistent
RETENTION_DAYS=14

if [ -d "$PERSISTENT_DIR" ]; then
  if [ -w "$PERSISTENT_DIR" ]; then
    if cp -R "$STATIC_DIR/." "$PERSISTENT_DIR/"; then
      find "$PERSISTENT_DIR" -type f -mtime +"$RETENTION_DAYS" -delete
      find "$PERSISTENT_DIR" -mindepth 1 -type d -empty -delete
    else
      echo "entrypoint: could not copy static assets into $PERSISTENT_DIR, serving this build only" >&2
    fi
  else
    echo "entrypoint: $PERSISTENT_DIR is mounted but not writable by $(id -un), serving this build only" >&2
  fi
fi

exec node server.js
