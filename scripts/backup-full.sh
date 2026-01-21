#!/bin/bash
set -euo pipefail

echo "Starting full backup..."
/bin/bash /opt/ronyx/scripts/backup.sh
echo "Full backup complete."
