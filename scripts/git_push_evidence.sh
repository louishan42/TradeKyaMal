#!/usr/bin/env bash
# Commit evidence/ changes and push, auto-resolving rebase conflicts in evidence paths.
set -euo pipefail

BRANCH="${1:?branch required}"
COMMIT_MSG="${2:?commit message required}"
PATHS="${3:-evidence/ incoming/}"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# shellcheck disable=SC2086
git add $PATHS

if git diff --staged --quiet; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "$COMMIT_MSG"

for attempt in 1 2 3; do
  if git pull --rebase origin "$BRANCH"; then
    git push origin "HEAD:$BRANCH"
    exit 0
  fi

  echo "Rebase conflict (attempt $attempt) — keeping this run's evidence files."
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
      evidence/*|incoming/*)
        git checkout --theirs -- "$file" 2>/dev/null || true
        git add -- "$file" 2>/dev/null || true
        ;;
    esac
  done < <(git diff --name-only --diff-filter=U)

  git add evidence/ incoming/ 2>/dev/null || true
  if GIT_EDITOR=true git rebase --continue; then
    continue
  fi

  git rebase --abort || true
  echo "Rebase failed on attempt $attempt."
  exit 1
done

echo "Failed to push after 3 attempts."
exit 1
