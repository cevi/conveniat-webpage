#!/bin/sh
# Entrypoint of the SeaweedFS service, shared by the local stack and the deployments (the swarm
# stacks mount it as a config from /cluster/dist_storage_insane/config/<deployment>/).
#
# The app reads its S3 settings from the S3_* variables, named after the store SeaweedFS
# replaced. This script turns them into the S3 identity file, makes sure the buckets exist once
# the gateway answers, then hands the process to weed.
set -eu

: "${S3_ROOT_USER:?}" "${S3_ROOT_PASSWORD:?}" "${S3_ACCESS_KEY_ID:?}" "${S3_SECRET_ACCESS_KEY:?}" "${S3_BUCKET_NAME:?}"
: "${SEAWEEDFS_BUCKETS:=$S3_BUCKET_NAME}"

mkdir -p /etc/seaweedfs /data
cat > /etc/seaweedfs/s3.json <<JSON
{
  "identities": [
    {
      "name": "admin",
      "credentials": [{ "accessKey": "${S3_ROOT_USER}", "secretKey": "${S3_ROOT_PASSWORD}" }],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    },
    {
      "name": "payload",
      "credentials": [{ "accessKey": "${S3_ACCESS_KEY_ID}", "secretKey": "${S3_SECRET_ACCESS_KEY}" }],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    }
  ]
}
JSON

(
  # Bucket setup runs beside the server so that weed stays PID 1 and gets the stop signal.
  i=0
  until curl -sf -o /dev/null http://127.0.0.1:9333/cluster/status \
     && curl -s -o /dev/null http://127.0.0.1:8888/ \
     && curl -s -o /dev/null http://127.0.0.1:9000/; do
    i=$((i + 1))
    if [ "$i" -ge 90 ]; then echo "seaweedfs: components did not come up in time" >&2; exit 1; fi
    sleep 1
  done
  for bucket in ${SEAWEEDFS_BUCKETS}; do
    echo "s3.bucket.create -name ${bucket}" | weed shell -master=127.0.0.1:9333 2>&1 | grep -iv "already exists" || true
  done
  # Presigned browser uploads land under temp/ until the app claims them, so they expire on their own.
  echo "fs.configure -locationPrefix=/buckets/${S3_BUCKET_NAME}/temp/ -ttl=1d -apply" | weed shell -master=127.0.0.1:9333 >/dev/null
  echo "seaweedfs: buckets ready (${SEAWEEDFS_BUCKETS})"
) &

# -ip=127.0.0.1: all components live in this container, so they find each other on loopback
# regardless of which overlay networks the task is attached to. The S3 port is bound on all
# interfaces for the other services.
exec weed server -dir=/data -ip=127.0.0.1 -ip.bind=0.0.0.0 -volume.max=0 -metricsPort=9324 \
  -s3 -s3.port=9000 -s3.ip.bind=0.0.0.0 -s3.config=/etc/seaweedfs/s3.json
