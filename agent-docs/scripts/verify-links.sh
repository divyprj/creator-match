#!/usr/bin/env bash
set -euo pipefail

network_dir="${1:-agent-docs}"
project_root="$(cd "$(dirname "$0")/../.." && pwd)"
broken=0
total=0

while IFS= read -r -d '' markdown_file; do
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    case "$target" in
      http:*|https:*|mailto:*|\#*) continue ;;
    esac
    resolved="$(cd "$(dirname "$markdown_file")" && realpath -m "$target")"
    total=$((total + 1))
    if [ ! -f "$resolved" ]; then
      printf 'BROKEN: %s -> %s\n' "${markdown_file#"$project_root/"}" "$target"
      broken=$((broken + 1))
    fi
    # -oE rather than -oP: PCRE is unavailable in several shells this repo is verified in,
    # and the previous `|| true` turned that into a silent zero-link pass.
  done < <(grep -oE '\[[^]]*\]\([^)]*\)' "$markdown_file" | sed 's/.*(\(.*\))/\1/')
done < <(find "$project_root/$network_dir" -name '*.md' -print0)

printf 'Checked %s Markdown links. Broken: %s.\n' "$total" "$broken"

if [ "$total" -eq 0 ]; then
  printf 'FAILED: no links were extracted, so this check proved nothing.\n' >&2
  exit 1
fi

test "$broken" -eq 0
