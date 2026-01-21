# Ronyx Security & Firewall Setup (Digital Ocean)

Run these commands on the droplet:

```
ufw default deny incoming
ufw default allow outgoing

ufw allow ssh

ufw allow from 44.234.0.0/16 to any port 5432
ufw allow from 44.235.0.0/16 to any port 5432
ufw allow from 44.236.0.0/16 to any port 5432

ufw allow from 44.234.0.0/16 to any port 6379
ufw allow from 44.235.0.0/16 to any port 6379
ufw allow from 44.236.0.0/16 to any port 6379

ufw enable

apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban

adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades
```
