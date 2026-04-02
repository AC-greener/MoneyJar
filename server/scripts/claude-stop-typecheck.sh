#!/bin/sh

set -eu

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"
MAX_LINES=20

if ! command -v pnpm >/dev/null 2>&1; then
  printf '%s\n' '{"decision":"block","reason":"未找到 pnpm，无法完成 TypeScript 收尾检查。请先确认开发环境，再继续修复。"}'
  exit 0
fi

OUTPUT_FILE="$(mktemp)"
cleanup() {
  rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT INT TERM

if (
  cd "$PROJECT_DIR"
  pnpm typecheck >"$OUTPUT_FILE" 2>&1
); then
  exit 0
fi

TOTAL_LINES="$(wc -l <"$OUTPUT_FILE" | tr -d ' ')"
if [ "$TOTAL_LINES" -le "$MAX_LINES" ]; then
  SUMMARY="$(cat "$OUTPUT_FILE")"
else
  SUMMARY="$(sed -n "1,${MAX_LINES}p" "$OUTPUT_FILE")"
fi

printf '%s\n' "[claude-stop-typecheck] pnpm typecheck 失败，以下为前 ${MAX_LINES} 行输出：" >&2
printf '%s\n' "$SUMMARY" >&2
if [ "$TOTAL_LINES" -gt "$MAX_LINES" ]; then
  REMAINING_LINES=$((TOTAL_LINES - MAX_LINES))
  printf '%s\n' "[claude-stop-typecheck] 其余 ${REMAINING_LINES} 行已省略，请在项目根目录运行 pnpm typecheck 查看完整错误。" >&2
fi

printf '%s\n' '{"decision":"block","reason":"pnpm typecheck 未通过，请先修复 TypeScript 报错，再结束本轮任务。若报错属于仓库原有遗留问题，请在结果中明确标注。"}'
