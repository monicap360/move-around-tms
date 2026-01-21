# Ronyx Render Environment Variables

Set the following variables in the Render.com dashboard:

```
DB_HOST=your-droplet-ip
DB_PORT=5432
DB_NAME=ronyx_production
DB_USER=ronyx_user
DB_PASSWORD=your_secure_password

REDIS_HOST=your-droplet-ip
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

MINIO_ENDPOINT=http://your-droplet-ip:9000
MINIO_ROOT_USER=your_minio_user
MINIO_ROOT_PASSWORD=your_minio_password
AWS_S3_BUCKET=ronyx-tickets

JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key

GOOGLE_VISION_API_KEY=your_google_api_key

STRIPE_SECRET_KEY=your_stripe_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```
