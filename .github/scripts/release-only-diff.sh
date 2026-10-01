#!/bin/bash

# Tells a workflow whether a pull request changes nothing but what release-please writes: the
# changelog, its manifest and the version field in package.json.
#
# The lint and test jobs stop after this step on such a diff. The tree they would check is the
# base branch plus a version string, and the base branch went green in the pull request that put
# it there.
#
# Runs on the merge commit GitHub builds for a pull request, whose first parent is the tip of the
# base branch. That needs a checkout with `fetch-depth: 2`.
#
# The answer is decided by what changed, not by the name of the branch, so a branch named like
# release-please's cannot skip the suite. Any error leaves release_only unset and the suite runs.

set -euo pipefail

other_files=$(git diff --no-renames --name-only HEAD^1 HEAD -- \
  ':(top,exclude)CHANGELOG.md' \
  ':(top,exclude).release-please-manifest.json' \
  ':(top,exclude)package.json')

if [ -n "$other_files" ]; then
  echo "Not a release-only diff, these files changed as well:"
  echo "$other_files"
  exit 0
fi

# package.json may differ in its version and in nothing else: a dependency or a script changed
# there is code, and gets the full suite. A package.json that jq cannot read ends the script.
base_package=$(git show HEAD^1:package.json | jq 'del(.version)')
head_package=$(git show HEAD:package.json | jq 'del(.version)')

if [ "$base_package" != "$head_package" ]; then
  echo "Not a release-only diff, package.json changed beyond its version:"
  diff <(echo "$base_package") <(echo "$head_package") || true
  exit 0
fi

echo "::notice::Release-only diff: only the changelog, the release-please manifest and the version changed, so the remaining steps are skipped."
echo "release_only=true" >> "$GITHUB_OUTPUT"
