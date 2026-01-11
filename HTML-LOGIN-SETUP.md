# Environment Configuration for HTML Login

## Setup Instructions

If you're using the HTML login file (`public/login.html`), you need to configure environment variables.

### Option 1: Server-Side Configuration (Recommended)

Create a configuration endpoint that serves environment variables:

**Create `public/env.js`:**

```javascript
// This file should be generated server-side with your environment variables
window.ENV = {
  SUPABASE_URL: "https://wqeidcatuwqtzwhvmqfr.supabase.co", // Replace with your URL
  SUPABASE_ANON_KEY: "your-anon-key-here", // Replace with rotated key
};
```

**Include in HTML:**

```html
<script src="/env.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### Option 2: Use Next.js Login Page (Recommended)

Instead of the HTML file, use the secure Next.js login page:

- Visit: `/login` (uses environment variables automatically)
- Handles authentication flow properly
- Includes security measures

### Security Notes

⚠️ **Never commit `env.js` with real credentials to git**

Add to `.gitignore`:

```
public/env.js
```

✅ **Production Setup:**

1. Generate `env.js` server-side during deployment
2. Use rotated Supabase credentials
3. Ensure HTTPS is enabled
4. Configure proper CORS settings

### Quick Setup Commands

```bash
# Add to .gitignore
echo "public/env.js" >> .gitignore

# Create template
cat > public/env.js.example << 'EOF'
// Copy to env.js and replace with real values
window.ENV = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here"
};
EOF
```
