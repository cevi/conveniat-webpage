# Bill archive on OneDrive

Every bill that gets mailed is also filed to OneDrive, so the finance team keeps a copy of
what actually went out.

## How it fits together

```
payload  ──writes PDF──►  spool directory  ──uploads──►  OneDrive
                          (shared volume)      (onedrive sidecar)
```

The app never talks to Microsoft. When a bill is mailed, `sendBills` writes the PDF into the
spool at `BILL_ARCHIVE_DIR` and moves on; the `driveone/onedrive` sidecar
([abraunegg/onedrive](https://github.com/abraunegg/onedrive)) watches that directory and
uploads what appears in it.

The split is deliberate. Microsoft only gives us a **personal account** — the organisation
cannot issue service principals — so the OAuth token has to be minted by a human once and
refreshed from then on. Owning that in the app would mean owning token refresh, throttling,
resumable uploads and retries. The sidecar already does all of it, and when it breaks it
breaks somewhere an operator can see.

Files are written under a temporary name and renamed into place, because a rename is the
only filesystem operation the sync client treats as atomic. Without that it will happily
upload a half-written PDF.

## Layout in OneDrive

```
2026/
  Hauptlager conveniat27 – Hof Süd/
    Rechnung-2027-0001_Maximilian Muster.pdf
    Rechnung-2027-0002_Anna Beispiel.pdf
```

Year comes from the date the bill was raised, not the camp year. The invoice number leads
the file name because that is what an incoming payment references, so it is what a bill gets
looked up by.

## One-time setup

The sidecar cannot do anything until somebody signs in. This is interactive and cannot be
scripted.

1. Start a throwaway container against the config volume you are about to use:

   ```bash
   # local
   docker run -it --rm \
     -v conveniat-webpage_onedrive-conf:/onedrive/conf \
     -v conveniat-webpage_bill-archive:/onedrive/data \
     driveone/onedrive:latest

   # production (on a swarm node)
   docker run -it --rm \
     -v /cluster/dist_storage_insane/service_data/conveniat-prod/onedrive-conf:/onedrive/conf \
     -v /cluster/dist_storage_insane/service_data/conveniat-prod/bill-archive:/onedrive/data \
     driveone/onedrive:latest
   ```

2. It prints a URL. Open it, sign in with the personal account that owns the archive, and
   approve. The browser lands on a blank page — copy the **whole address bar** and paste it
   back into the container.

3. The refresh token is written to `/onedrive/conf/refresh_token`. Confirm it is there, then
   stop the container.

**That file is the whole setup.** Back it up. If the config volume is lost, nothing is
archived until someone repeats these steps, and the app will not notice.

## Running it

```bash
# local — not in the default profile, since it is useless before step 2 above
docker compose --profile onedrive up -d onedrive
docker compose logs -f onedrive
```

In production it is a normal service in `docker-compose.prod.yml`, pinned to **one replica**:
two clients sharing a refresh token and a sync database corrupt each other's state.

## Configuration

`src/config/onedrive.config` is mounted read-only into the container. Two settings matter
more than the rest:

- `upload_only` — never pull anything down, so nothing in OneDrive can overwrite a local file.
- `no_remote_delete` — never delete on one side because a file went away on the other.

Together they make this an archive rather than a sync. Without them, somebody tidying the
OneDrive folder empties the spool, or a spool cleanup deletes the archive.

| Variable           | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| `BILL_ARCHIVE_DIR` | Spool directory the app writes into. Unset disables archiving. |

The app logs a warning on every send run when `BILL_ARCHIVE_DIR` is unset, so a stack that
was never configured says so rather than silently dropping the archive.

## When something goes wrong

Filing is **best effort**. A bill that cannot be filed is still a bill somebody is waiting
for, so a failure is reported and the mail still goes out. Failures land in the run's error
list, which the admin panel shows, and in the container log.

Successful filings are recorded on the participant as a `bill_archived:<path>` entry in
`syncHistory`, so a gap can be found by querying rather than by comparing against OneDrive
by hand.

The failure mode worth knowing about: **the app cannot see upload failures.** It only knows
the file reached the spool. If the token is revoked — a password change or an MFA policy
will do it — uploads stop, files pile up in the spool, and nothing in the admin panel says
so. Two things to check when in doubt:

```bash
# anything sitting in the spool for more than a few minutes is not being uploaded
find "$BILL_ARCHIVE_DIR" -name '*.pdf' -mmin +10

docker compose logs onedrive | tail -50   # or: docker service logs conveniat_onedrive
```
