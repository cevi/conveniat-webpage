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

## Where the bills go

Not a personal OneDrive, despite the name. The target is a **SharePoint document library**:

|         |                                            |
| ------- | ------------------------------------------ |
| Site    | `ConveniatDue-TeamFinanzen`                |
| Library | `Freigegebene Dokumente`                   |
| Folder  | `Ressort Finanzen/97_Rechnungen_LB/Normal` |

It also shows up in Cyrill's OneDrive as a shortcut named
`conveniat27-Ressort Finanzen - Normal`. **Do not point the client at that shortcut.** It is
a `remoteItem`, and the sync client does not follow those — it would sync the personal drive
and never touch the library. The client is pointed at the library directly via `drive_id`.

The spool root maps to the **root of the library**, and `BILL_ARCHIVE_DIR` points at the
subfolder inside it:

```
BILL_ARCHIVE_DIR=/onedrive/data/Ressort Finanzen/97_Rechnungen_LB/Normal
```

That way the folder structure the app writes is the folder structure that appears in
SharePoint, with no path translation anywhere.

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

### 1. Sign in

Start a throwaway container against the config directory the service will use. Note the
config file is **not** mounted for this step — the client needs to write its token, and a
`drive_id` that is not resolved yet would send it looking for a library it cannot find.

```bash
# production, on a swarm node
docker run -it --rm \
  -e ONEDRIVE_UID=1000 -e ONEDRIVE_GID=1000 \
  -v /cluster/dist_storage_insane/service_data/conveniat-prod/onedrive-conf:/onedrive/conf \
  -v /cluster/dist_storage_insane/service_data/conveniat-prod/bill-archive:/onedrive/data \
  driveone/onedrive:latest

# local
docker run -it --rm \
  -e ONEDRIVE_UID=1000 -e ONEDRIVE_GID=1000 \
  -v conveniat-webpage_onedrive-conf:/onedrive/conf \
  -v conveniat-webpage_bill-archive:/onedrive/data \
  driveone/onedrive:latest
```

It prints a URL. Open it, sign in with the **cevi.ch work account** that has access to the
finance library, and approve. The browser lands on a blank page — copy the **whole address
bar** and paste it back into the container.

The refresh token is written to `/onedrive/conf/refresh_token`. **Back that file up.** If the
config directory is lost, nothing is archived until someone signs in again, and the app will
not notice.

### 2. Resolve the library

The account has more than one drive; the client has to be told which. Ask it:

```bash
docker run -it --rm \
  --entrypoint /usr/local/bin/onedrive \
  -v /cluster/dist_storage_insane/service_data/conveniat-prod/onedrive-conf:/onedrive/conf \
  driveone/onedrive:latest --confdir /onedrive/conf \
  --get-sharepoint-drive-id "ConveniatDue-TeamFinanzen"
```

The default entrypoint starts a sync loop, so it has to be overridden for any command that
is meant to answer a question and exit.

It lists the libraries on that site with their ids. Take the one for **Freigegebene
Dokumente** and put it in `src/config/onedrive.config`:

```
drive_id = "b!..."
```

Without this the client syncs the account's personal OneDrive instead — the wrong drive
entirely, and it will happily start uploading there.

### 3. Dry run before letting it write

```bash
docker run -it --rm \
  --entrypoint /usr/local/bin/onedrive \
  -v /cluster/dist_storage_insane/service_data/conveniat-prod/onedrive-conf:/onedrive/conf \
  -v /cluster/dist_storage_insane/service_data/conveniat-prod/bill-archive:/onedrive/data \
  -v "$PWD/src/config/onedrive.config:/onedrive/conf/config:ro" \
  -v "$PWD/src/config/onedrive.sync_list:/onedrive/conf/sync_list:ro" \
  driveone/onedrive:latest --confdir /onedrive/conf --sync --dry-run --verbose
```

Check that it reports the finance library and only walks
`Ressort Finanzen/97_Rechnungen_LB/Normal`. If it lists the whole library, or anything from a
personal drive, stop: `drive_id` or `sync_list` is wrong, and the next run would write into
the wrong place.

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
