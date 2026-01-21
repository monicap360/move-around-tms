#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/ronyx"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec ronyx-postgres pg_dump -U ronyx_user ronyx_production | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

docker exec ronyx-redis redis-cli --rdb /data/dump.rdb
docker cp ronyx-redis:/data/dump.rdb $BACKUP_DIR/redis_backup_$DATE.rdb

docker exec ronyx-minio mc mirror /data $BACKUP_DIR/minio_backup_$DATE/

rclone copy $BACKUP_DIR spaces:ronyx-backups/

find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE" >> /var/log/ronyx_backup.log
