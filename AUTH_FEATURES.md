# Authentication Features

## Login Screen Features

The login screen (`/login`) now includes:

### 1. **Sign In** (Default View)
- Email and password fields
- "Sign In" button to authenticate
- Error messages for failed login attempts

### 2. **Forgot Password** Link
- Click "Forgot Password?" to switch to password reset mode
- No need to leave the login page
- Toggle back to sign in with "← Back to Sign In"

### 3. **Create Account** Link
- "New here? Create an account" link at the bottom
- Redirects to `/signup` page

## Password Reset Flow

### Step 1: Request Reset
1. User clicks "Forgot Password?" on login page
2. Enters their email address
3. Clicks "Send Reset Link"
4. System sends password reset email via Supabase Auth

### Step 2: Reset Password
1. User receives email with reset link
2. Clicks link → redirects to `/reset-password`
3. Enters new password (twice for confirmation)
4. Clicks "Reset Password"
5. Success → auto-redirects to `/login` after 2 seconds

### Step 3: Login with New Password
1. User returns to login page
2. Signs in with new password

## Signup Flow

The signup page (`/signup`) allows new users to create accounts:

### Features:
- Email and password registration
- Optional domain restrictions (set via `NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS` env var)
- Email verification (if enabled in Supabase settings)
- Link to return to login page

### Email Confirmation:
If email confirmation is enabled in your Supabase project:
1. User signs up
2. Receives verification email
3. Clicks verification link
4. Can then log in

## Configuration

### Supabase Email Settings

To enable password reset and email verification:

1. **Go to Supabase Dashboard** → Your Project → Authentication → Email Templates

2. **Configure Email Templates:**
   - **Confirm Signup**: Sent when new users register
   - **Reset Password**: Sent when users request password reset
   - **Magic Link**: Optional for passwordless login

3. **Email Provider Settings:**
   - By default, Supabase uses their built-in email service (limited)
   - For production, configure SMTP settings with your email provider:
     - Project Settings → Configuration → Auth → SMTP Settings
     - Add: Host, Port, User, Password, Sender email

4. **Redirect URLs:**
   - Set Site URL in Authentication settings
   - Add redirect URLs for your domains
   - Example: `https://yourdomain.com`, `http://localhost:3000`

### Environment Variables

In your `.env.local`:

```bash
# Required - from Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - restrict signup to specific domains (comma-separated)
NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS=solistrucking.com,yourdomain.com
```

## Security Features

✅ **Password Requirements:**
- Minimum 6 characters (enforced client-side)
- Supabase enforces additional security rules server-side

✅ **Session Management:**
- Supabase handles token refresh automatically
- Sessions expire based on your Supabase JWT settings

✅ **Password Reset Security:**
- Reset links are single-use
- Reset links expire (default: 1 hour)
- Old password becomes invalid immediately after reset

✅ **Email Verification:**
- Optional but recommended for production
- Prevents fake account creation
- Enable in Supabase → Authentication → Settings → Email Auth

## User Experience

### Success States:
- ✅ "Password reset email sent! Check your inbox."
- ✅ "Check your email for a verification link."
- ✅ "Password Reset Successful! Redirecting..."

### Error States:
- ❌ Invalid credentials
- ❌ Passwords don't match
- ❌ Email domain not allowed
- ❌ Invalid or expired reset link

## Testing Locally

1. **Test Forgot Password:**
   ```
   - Go to http://localhost:3000/login
   - Click "Forgot Password?"
   - Enter test email
   - Check Supabase logs or your inbox for reset email
   ```

2. **Test Signup:**
   ```
   - Go to http://localhost:3000/signup
   - Enter email and password
   - Check for verification email (if enabled)
   - Verify email, then login
   ```

3. **Monitor Emails:**
   - Check Supabase → Authentication → Logs for email status
   - View sent emails in your SMTP provider dashboard

## Troubleshooting

### "Email not sent" or "SMTP error"
- Check Supabase → Project Settings → Configuration → Auth → SMTP Settings
- Verify SMTP credentials are correct
- Check email rate limits (default Supabase has low limits)

### "Invalid reset link"
- Link may have expired (default: 1 hour)
- Link can only be used once
- User should request a new reset email

### "Domain not allowed"
- Check `NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS` in `.env.local`
- Remove or update to allow desired domains

### Email verification required but no email sent
- Enable email confirmation: Supabase → Authentication → Settings
- Check "Enable Email Confirmations"
- Verify SMTP settings are configured

## Production Checklist

Before deploying to production:

- [ ] Configure custom SMTP provider (SendGrid, Mailgun, AWS SES, etc.)
- [ ] Customize email templates in Supabase dashboard
- [ ] Enable email confirmation for signups
- [ ] Set appropriate Site URL and Redirect URLs
- [ ] Test password reset flow end-to-end
- [ ] Test signup flow with email verification
- [ ] Configure `NEXT_PUBLIC_ALLOWED_SIGNUP_DOMAINS` if restricting signups
- [ ] Review Supabase Auth policies and RLS settings
- [ ] Set up monitoring for auth-related errors

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Password Reset Flow](https://supabase.com/docs/guides/auth/passwords)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
