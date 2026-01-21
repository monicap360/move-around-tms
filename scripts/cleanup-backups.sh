#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/ronyx/backups"
RETENTION_DAYS=7

find ${BACKUP_DIR} -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.rdb" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "minio_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +
