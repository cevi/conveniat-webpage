#!/bin/bash
#
# Fills `number` and `rufname` of every Quartier from its name, "Quartier 5 - Greif" -> 5 and
# "Greif", writes the official "Phoenix" for "Phönix" in the name and the Rufname, and builds the
# unique index on `number` that Payload would otherwise only build on its next start.
#
# Idempotent: a field that is already set is left alone, and a number that disagrees with the
# name is reported, never overwritten. Without `--apply` it only prints what it would change.
#
# It talks to Mongo through a throwaway mongosh container on the stack's network, so it runs on
# the Docker host of the stack and needs nothing from this repository there:
#
#   Local stack (network from `docker inspect <project>-mongo-1`):
#     bash src/scripts/db/fill-quartier-numbers.sh sched-redesign_default
#     bash src/scripts/db/fill-quartier-numbers.sh sched-redesign_default --apply
#
#   Production, only after the release with the `number` and `rufname` fields is deployed and
#   every replica runs it (an editor saving a Quartier on an old replica would otherwise drop
#   the fields again):
#     ssh cevi-tools-s02 'bash -s -- conveniat_backend-net' < src/scripts/db/fill-quartier-numbers.sh
#     ssh cevi-tools-s02 'bash -s -- conveniat_backend-net --apply' < src/scripts/db/fill-quartier-numbers.sh
#
# The database is named `conveniat` on every stack; pass a third argument to use another one.
# The cached Programm and Karte show the new fields once their cache expires or the stack is
# redeployed, since a write straight to Mongo does not flush the page cache.

set -euo pipefail

NETWORK="${1:-}"
MODE="${2:---dry-run}"
DATABASE="${3:-conveniat}"

if [[ -z "$NETWORK" || ( "$MODE" != "--dry-run" && "$MODE" != "--apply" ) ]]; then
  echo "usage: fill-quartier-numbers.sh <docker-network> [--dry-run|--apply] [database]" >&2
  exit 2
fi

APPLY=false
[[ "$MODE" == "--apply" ]] && APPLY=true

# the script travels on stdin and is written inside the container, as its user cannot read /dev/stdin
docker run --rm -i --network "$NETWORK" mongo:8.0.4 sh -c \
  "cat > /tmp/fill.js && mongosh 'mongodb://mongo/$DATABASE' --quiet --eval 'const APPLY = $APPLY;' --file /tmp/fill.js" <<'MONGOSH'
const OFFICIAL = ['Einhorn', 'Kelpie', 'Wolpertinger', 'Kitsune', 'Greif', 'Cerberus', 'Phoenix', 'Baku'];
const SPELLING = { 'Phönix': 'Phoenix' };

const quartiere = db.quartieres.find({}, { name: 1, number: 1, rufname: 1 }).sort({ name: 1 }).toArray();
print(`${quartiere.length} Quartiere, ${APPLY ? 'writing' : 'dry run, nothing is written'}`);

const changes = [];
let problems = 0;
for (const quartier of quartiere) {
  const match = /^Quartier\s+(\d+)\s*[-–]\s*(.+?)\s*$/i.exec(quartier.name ?? '');
  if (match === null) {
    print(`  skip   "${quartier.name}": not named "Quartier <number> - <Rufname>", fill it in the admin panel`);
    problems++;
    continue;
  }
  const number = Number(match[1]);
  const rufname = SPELLING[match[2]] ?? match[2];
  const name = (quartier.name ?? '').replace(match[2], rufname);

  const set = {};
  if (quartier.number === undefined || quartier.number === null) set.number = number;
  else if (quartier.number !== number) {
    print(`  check  "${quartier.name}": number is ${quartier.number}, the name says ${number}; left alone`);
    problems++;
  }
  if (quartier.rufname === undefined || quartier.rufname === null || quartier.rufname === '') set.rufname = rufname;
  else if (SPELLING[quartier.rufname] !== undefined) set.rufname = SPELLING[quartier.rufname];
  if (name !== quartier.name) set.name = name;
  if (!OFFICIAL.includes(set.rufname ?? quartier.rufname ?? rufname)) {
    print(`  check  "${quartier.name}": "${rufname}" is not one of ${OFFICIAL.join(', ')}`);
  }

  if (Object.keys(set).length === 0) print(`  ok     "${quartier.name}"`);
  else {
    print(`  change "${quartier.name}": ${JSON.stringify(set)}`);
    changes.push({ _id: quartier._id, set });
  }
}

const numbers = quartiere.map((quartier) => {
  const change = changes.find(({ _id }) => _id.equals(quartier._id));
  return change !== undefined && change.set.number !== undefined ? change.set.number : quartier.number;
}).filter((number) => number !== undefined && number !== null);
const duplicates = numbers.filter((number, index) => numbers.indexOf(number) !== index);
if (duplicates.length > 0) {
  print(`ABORT: the number ${duplicates.join(', ')} would be used twice, nothing written`);
  quit(1);
}

if (!APPLY) {
  print(`${changes.length} to change, ${problems} to check by hand. Run again with --apply to write.`);
  quit(0);
}

for (const { _id, set } of changes) {
  db.quartieres.updateOne({ _id }, { $set: { ...set, updatedAt: new Date() } });
}
// the same index Payload builds for a unique field, so its own build on the next start is a
// no-op; two Quartiere without a number would break it, so then it waits for the admin panel
if (numbers.length < quartiere.length) {
  print('not every Quartier has a number yet, so the unique index waits for the next start');
} else if (!db.quartieres.getIndexes().some(({ name }) => name === 'number_1')) {
  db.quartieres.createIndex({ number: 1 }, { unique: true, background: true, name: 'number_1' });
  print('created the unique index number_1');
}
print(`${changes.length} changed, ${problems} to check by hand.`);
MONGOSH
