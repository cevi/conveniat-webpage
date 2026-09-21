#!/bin/bash

# This script extracts the build information from the frontend

timestamp=$(date "+%a %b %d %Y %H:%M:%S GMT%z (%Z)")

version=$(node -pe "require('./package.json').version")

# Build identity, in order of preference: the values the CI workflow passes in, then the
# checkout's .git (a branch checkout or a detached HEAD, which is what a release checkout is),
# then a marker that says neither was available.
if [ -n "${BUILD_GIT_HASH:-}" ]; then
  git_commit="$BUILD_GIT_HASH"
  git_branch="${BUILD_GIT_REF:-unknown}"
elif [ -f ".git/HEAD" ]; then
  head=$(cat .git/HEAD)
  case "$head" in
    ref:*)
      ref=${head#ref: }
      git_commit=$(cat ".git/$ref" 2>/dev/null || echo "unknown")
      git_branch=${ref#refs/heads/}
      ;;
    *)
      git_commit="$head"
      git_branch="detached"
      ;;
  esac
else
  git_commit="unknown"
  git_branch="unknown"
fi

build_info="
const build = {
    version: \"${version}\",
    timestamp: \"${timestamp}\",
    git: {
        branch: \"${git_branch}\",
        hash: \"$(printf "%.8s" "$git_commit")\"
    }
};

export default build;
"

# Write to file
echo "${build_info}" > ./src/build.ts
