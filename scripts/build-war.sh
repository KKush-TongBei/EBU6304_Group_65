#!/usr/bin/env bash
# 在 java-web 下执行 mvn package，使用 backend-env 中的 JDK/Maven。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend-env.sh"
cd "$EBU6304_REPO_ROOT/java-web"
exec mvn package "$@"
