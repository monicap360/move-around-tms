# SUPABASE DASHBOARD CONFIGURATION FOR PRODUCTION

## Authentication Settings → URL Configuration

### Site URL:

https://app.movearoundtms.com

### Redirect URLs (Add ALL of these):

https://app.movearoundtms.com/auth/callback
https://app.movearoundtms.com/
https://app.movearoundtms.com/login
https://app.movearoundtms.com/**
http://localhost:3000/auth/callback
http://localhost:3000/
http://localhost:3000/login

### Additional URLs:

- Allowed Origins: https://app.movearoundtms.com, http://localhost:3000
- JWT Expiry: 3600 (1 hour)
- Refresh Token Expiry: 604800 (7 days)

## IMPORTANT NOTES:

1. The Site URL MUST be https://app.movearoundtms.com (exactly)
2. Make sure ALL redirect URLs are added
3. Save changes and wait 2-3 minutes for propagation
4. The /\*\* wildcard allows all paths under your domain
