#!/usr/bin/env bash
# 使用仓库 .tools 下的 Node 启动 Vite（无需本机已安装 node/npm）。
# 用法：先在本机另一终端启动后端（如 ./scripts/tomcat-run.sh），再在仓库根目录执行本脚本。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
ARCH=$(uname -m)
case "$ARCH" in
  arm64) NARCH=arm64 ;;
  *) NARCH=x64 ;;
esac
NODE_VER=v20.18.1
NODE_HOME="$REPO/.tools/node-$NODE_VER-darwin-$NARCH"
if [[ ! -x "$NODE_HOME/bin/npm" ]]; then
  echo "未找到 Node：$NODE_HOME" >&2
  echo "请从 https://nodejs.org/ 安装 LTS，或将 Node 解压到上述路径。" >&2
  exit 1
fi
export PATH="$NODE_HOME/bin:$PATH"
cd "$REPO/frontend"
npm install
exec npm run dev
