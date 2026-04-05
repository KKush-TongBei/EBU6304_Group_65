#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend-env.sh"
exec "${CATALINA_HOME}/bin/catalina.sh" stop
