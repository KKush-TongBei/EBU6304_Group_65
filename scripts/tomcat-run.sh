#!/usr/bin/env bash
# 构建 WAR、部署到本机 Tomcat 10，并以前台方式启动（Ctrl+C 停止）。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend-env.sh"

if [[ ! -x "${CATALINA_HOME}/bin/catalina.sh" ]]; then
  echo "未找到 Tomcat：CATALINA_HOME=$CATALINA_HOME" >&2
  echo "请将 Tomcat 10+ 解压到 .tools/apache-tomcat-10.1.54 或设置 CATALINA_HOME。" >&2
  exit 1
fi

cd "$EBU6304_REPO_ROOT/java-web"
mvn package "$@"

WAR="$EBU6304_REPO_ROOT/java-web/target/ta-recruit.war"
rm -rf "${CATALINA_HOME}/webapps/ta-recruit" "${CATALINA_HOME}/webapps/ta-recruit.war"
cp "$WAR" "${CATALINA_HOME}/webapps/"

echo "Tomcat 启动中… 上下文路径: /ta-recruit"
echo "健康检查: http://localhost:8080/ta-recruit/api/health"
echo "TA_DATA_DIR=$TA_DATA_DIR"
exec "${CATALINA_HOME}/bin/catalina.sh" run
