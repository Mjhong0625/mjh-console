#!/usr/bin/env bash
# 把模板更新推到所有客户 repo。
# 用法： ./sync-template.sh /路径/到/demobet88-template [customers.txt]
# customers.txt 每行：  品牌名 /本机/客户repo路径     （# 开头为注释）
# 注意：会覆盖客户 repo 里的所有代码（保留 .git、.env、data、node_modules）。
#       若某客户有单独改过程序，请先备份或不要列入。
set -euo pipefail
TPL="${1:?给模板路径}"; LIST="${2:-customers.txt}"
[ -f "$TPL/bot.js" ] || { echo "模板路径不对：$TPL"; exit 1; }
VER=$(node -p "require('$TPL/package.json').version")
echo "模板版本 $VER"
read -r -p "确认同步到 $LIST 内所有客户？(y/N) " a; [ "$a" = y ] || exit 0
while read -r name path; do
  [[ -z "${name:-}" || "$name" == \#* ]] && continue
  [ -d "$path/.git" ] || { echo "跳过 $name：不是 git repo"; continue; }
  echo "== $name"
  rsync -a --delete --exclude .git --exclude node_modules --exclude data --exclude .env "$TPL"/ "$path"/
  ( cd "$path"
    if [ -n "$(git status --porcelain)" ]; then
      git add -A && git commit -qm "同步模板 v$VER" && git push -q && echo "  已推送 → Railway 自动部署"
    else echo "  无变更"; fi )
done < "$LIST"
echo "完成。到总汇刷新，确认各品牌版本号都变成 $VER。"
