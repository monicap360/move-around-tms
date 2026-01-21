#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/ronyx/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/ronyx/backup_${DATE}.log"
RETENTION_DAYS=7
DIGITALOCEAN_SPACES_BUCKET="ronyx-backups"

mkdir -p /var/log/ronyx
mkdir -p ${BACKUP_DIR}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

log "Starting Ronyx backup process..."

log "Backing up PostgreSQL database..."
if docker exec ronyx-postgres pg_dump -U ronyx_user ronyx_production | gzip > ${BACKUP_DIR}/ronyx_db_${DATE}.sql.gz; then
    DB_SIZE=$(du -h ${BACKUP_DIR}/ronyx_db_${DATE}.sql.gz | cut -f1)
    log "Database backup complete: ${DB_SIZE}"
else
    log "Database backup failed."
    exit 1
fi

log "Backing up Redis..."
if docker exec ronyx-redis redis-cli --rdb /data/dump.rdb > /dev/null 2>&1; then
    docker cp ronyx-redis:/data/dump.rdb ${BACKUP_DIR}/ronyx_redis_${DATE}.rdb
    REDIS_SIZE=$(du -h ${BACKUP_DIR}/ronyx_redis_${DATE}.rdb | cut -f1)
    log "Redis backup complete: ${REDIS_SIZE}"
else
    log "Redis backup may have failed, continuing."
fi

log "Backing up file storage..."
if docker exec ronyx-minio mc mirror /data ${BACKUP_DIR}/minio_${DATE}/ --quiet; then
    MINIO_SIZE=$(du -sh ${BACKUP_DIR}/minio_${DATE}/ | cut -f1)
    log "MinIO backup complete: ${MINIO_SIZE}"
else
    log "MinIO backup may have failed, continuing."
fi

log "Backing up Docker volumes..."
tar -czf ${BACKUP_DIR}/docker_volumes_${DATE}.tar.gz \
    /var/lib/docker/volumes/ronyx_* \
    2>/dev/null || true

cat > ${BACKUP_DIR}/backup_manifest_${DATE}.json << EOF
{
  "backup_date": "$(date -Iseconds)",
  "tenant": "ronyx",
  "components": {
    "database": "ronyx_db_${DATE}.sql.gz",
    "redis": "ronyx_redis_${DATE}.rdb",
    "minio": "minio_${DATE}",
    "docker_volumes": "docker_volumes_${DATE}.tar.gz"
  },
  "sizes": {
    "database": "${DB_SIZE}",
    "redis": "${REDIS_SIZE:-unknown}",
    "minio": "${MINIO_SIZE:-unknown}"
  }
}
EOF

if [ -f "/root/.config/rclone/rclone.conf" ]; then
    log "Uploading to Digital Ocean Spaces..."
    rclone copy ${BACKUP_DIR}/ronyx_db_${DATE}.sql.gz spaces:${DIGITALOCEAN_SPACES_BUCKET}/daily/ 2>> ${LOG_FILE} && \
    log "Uploaded to Spaces"
fi

log "Cleaning up old backups..."
find ${BACKUP_DIR} -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.rdb" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "minio_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +
find /var/log/ronyx -name "backup_*.log" -mtime +30 -delete

if command -v curl &> /dev/null; then
    curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
        -d chat_id=${TELEGRAM_CHAT_ID} \
        -d text="Ronyx backup completed: ${DATE}" \
        > /dev/null 2>&1 || true
fi

log "Backup completed successfully."
log "Backup location: ${BACKUP_DIR}"
log "Total size: $(du -sh ${BACKUP_DIR} | cut -f1)"
