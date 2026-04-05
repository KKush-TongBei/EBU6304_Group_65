#!/usr/bin/env bash
# 后端本地开发环境：在任意终端执行
#   source "$(git rev-parse --show-toplevel 2>/dev/null)/scripts/backend-env.sh"
# 或由各脚本自动 source。设置 JAVA_HOME、Maven、Tomcat、TA_DATA_DIR 等。

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export EBU6304_REPO_ROOT="$(cd "$_SCRIPT_DIR/.." && pwd)"
TOOLS="$EBU6304_REPO_ROOT/.tools"

_bundle_jdk="$TOOLS/jdk-17.0.13+11/Contents/Home"
if [[ -x "$_bundle_jdk/bin/java" ]]; then
  export JAVA_HOME="$_bundle_jdk"
elif [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
  :
else
  echo "backend-env: 未找到 JDK 17。请安装 Temurin/OpenJDK 17 并设置 JAVA_HOME，或将 JDK 解压到 .tools/（见 README）。" >&2
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

_bundle_mvn="$TOOLS/apache-maven-3.9.14/bin/mvn"
if [[ -x "$_bundle_mvn" ]]; then
  export PATH="$TOOLS/apache-maven-3.9.14/bin:$PATH"
fi

export CATALINA_HOME="${CATALINA_HOME:-$TOOLS/apache-tomcat-10.1.54}"

# 数据目录：必须可写；勿依赖 Tomcat 的 user.dir
export TA_DATA_DIR="${TA_DATA_DIR:-$EBU6304_REPO_ROOT/java-web/data}"
mkdir -p "$TA_DATA_DIR"

# 本地开发默认密钥（生产务必覆盖 TA_JWT_SECRET）
export TA_JWT_SECRET="${TA_JWT_SECRET:-dev-only-change-me-not-for-production}"
