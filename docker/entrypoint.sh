#!/bin/sh
# Keeps the static assets of previous builds reachable across a rolling deploy.
#
# Each image only carries its own `.next/static`. The swarm stacks mount a shared directory at
# `.next/static-persistent` into the app container and serve `/_next/static/` from that same
# directory through nginx, so a browser that still runs the previous build can fetch a chunk after
# the container that built it is gone. Nothing populated that directory before this script
# existed, which is why chunk requests after a rollover answered 404.
#
# The file names are content hashes, so a name that is already there holds these exact bytes, and
# nginx may be sending it to a browser on another node right now. Such a file is never written
# again: a rewrite empties it first, and nginx sends whatever it finds with a 200 that browsers
# keep for a year. It is only touched, so a chunk that is still part of the current build stays
# inside the retention, while one that no build ships anymore ages out and is pruned. A missing
# file is written under a temporary name and published with `ln`, which creates the name at once,
# also on NFS, and fails if another replica published it first. The retention only has to outlive
# a client's session and its service worker precache; the app reloads itself on a stale bundle
# anyway.
set -eu

STATIC_DIR=/app/.next/static
PERSISTENT_DIR=/app/.next/static-persistent
RETENTION_DAYS=14

publish_static() (
  cd "$STATIC_DIR" || exit 1
  find . -type f | while IFS= read -r file; do
    target="$PERSISTENT_DIR/$file"
    if [ -e "$target" ]; then
      touch -c "$target" || exit 1
    else
      mkdir -p "$(dirname "$target")"
      partial="$target.partial-$$"
      cp "$file" "$partial" || exit 1
      ln "$partial" "$target" 2>/dev/null || [ -e "$target" ] || exit 1
      rm -f "$partial"
    fi
  done
)

if [ -d "$PERSISTENT_DIR" ]; then
  if [ -w "$PERSISTENT_DIR" ]; then
    if publish_static; then
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
