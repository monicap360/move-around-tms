# Ronyx Cron Setup

SSH into the droplet and add these to crontab:

```
crontab -e

0 2 * * * /bin/bash /opt/ronyx/scripts/backup.sh >> /var/log/ronyx-backup.log 2>&1
0 3 * * 0 /bin/bash /opt/ronyx/scripts/backup-full.sh >> /var/log/ronyx-backup-full.log 2>&1
0 4 * * * /bin/bash /opt/ronyx/scripts/cleanup-backups.sh >> /var/log/ronyx-cleanup.log 2>&1
0 * * * * /bin/bash /opt/ronyx/scripts/health-check.sh >> /var/log/ronyx-health.log 2>&1
0 0 1 * * /bin/bash /opt/ronyx/scripts/renew-ssl.sh >> /var/log/ronyx-ssl.log 2>&1
```
