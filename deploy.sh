#!/usr/bin/env bash
# ==============================================================================
# DYPIU Recruitment Portal Deployment Wrapper
# Calls canonical production intranet deployment script: deploy-intranet.sh
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/deploy-intranet.sh" "$@"
