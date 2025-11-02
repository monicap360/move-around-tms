# SMS Ticket Upload Setup Guide

## Overview
Drivers can text photos of delivery tickets directly to a phone number. The system automatically processes the image, extracts ticket data, and adds it to their profile.

## ✅ Features
- **Weekly restrictions**: Only accepts tickets during current pay week (Friday-Thursday)
- **Driver matching**: Automatically matches phone number to driver profile
- **OCR processing**: Extracts partner, material, quantity, and calculates pay
- **Instant feedback**: Sends confirmation text with extracted data

---

## 🚀 Setup Instructions

### 1. Create Twilio Account
1. Go to [Twilio.com](https://www.twilio.com/try-twilio) and sign up
2. Get a phone number (free trial gives you one)
3. Note your **Account SID** and **Auth Token** from the dashboard

### 2. Add Environment Variables
Add these to your `.env.local` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### 3. Configure Twilio Webhook
1. Go to **Twilio Console** → **Phone Numbers** → **Manage** → **Active Numbers**
2. Click your phone number
3. Scroll to **Messaging Configuration**
4. Set **A MESSAGE COMES IN** webhook to:
   ```
   https://movearoundtms.app/api/webhooks/sms
   ```
5. Method: **HTTP POST**
6. Click **Save**

### 4. Add Driver Phone Numbers
Run this SQL in your Supabase SQL Editor:

```sql
-- Add phone numbers for your drivers (use E.164 format: +1XXXXXXXXXX)
UPDATE drivers SET phone = '+15551234567', email = 'driver1@example.com' WHERE name = 'John Doe';
UPDATE drivers SET phone = '+15559876543', email = 'driver2@example.com' WHERE name = 'Jane Smith';

-- Verify
SELECT id, name, phone, email FROM drivers WHERE phone IS NOT NULL;
```

**Important**: Phone numbers must be in E.164 format:
- ✅ Good: `+15551234567`
- ❌ Bad: `555-123-4567`, `(555) 123-4567`

### 5. Test SMS Upload
1. Send a text to your Twilio number: **+1-555-123-4567**
2. Attach a photo of a delivery ticket
3. You should receive a confirmation text like:
   ```
   ✅ Ticket received!

   Partner: Martin Marietta
   Material: Gravel
   Qty: 15.5 Tons
   Pay: $387.50

   Status: Pending Manager Review
   ```

---

## 🔒 Security & Restrictions

### Weekly Upload Window
- **Allowed**: Friday 12:00 AM to Thursday 11:59 PM
- **Blocked**: Outside current pay week

Drivers who text outside the pay week receive:
```
❌ You can only upload tickets during the current pay week (Friday-Thursday).
```

### Phone Number Validation
Drivers must have their phone number in the database. Unknown numbers receive:
```
❌ Phone number not registered. Contact your manager to add your number.
```

---

## 📱 Driver Instructions

Share this with your drivers:

### How to Text Your Tickets
1. Take a clear photo of your delivery ticket
2. Text the photo to: **+1-555-123-4567**
3. System will automatically:
   - Extract ticket info (partner, material, quantity)
   - Match it to your profile
   - Calculate your pay
   - Submit for manager approval
4. You'll receive a confirmation text with the details
5. Check your profile at `movearoundtms.app/driver/profile` to see all your tickets

### Tips for Best Results
- ✅ Use good lighting
- ✅ Make sure text is readable
- ✅ Include the whole ticket in the photo
- ✅ Only text during your current pay week (Friday-Thursday)
- ❌ Don't text blurry or dark photos
- ❌ Don't text tickets from previous weeks

---

## 🛠️ Troubleshooting

### "Phone number not registered"
**Solution**: Manager needs to add driver's phone to database:
```sql
UPDATE drivers SET phone = '+15551234567' WHERE name = 'Driver Name';
```

### "Failed to scan ticket"
**Causes**:
- Photo is too blurry
- Text is not readable
- Lighting is too dark

**Solution**: Ask driver to retake photo with better lighting and clarity

### "You can only upload tickets during the current pay week"
**Solution**: This is working as designed. Driver must wait until Friday to upload next week's tickets.

### No response from system
**Checks**:
1. Verify Twilio webhook URL is correct: `https://movearoundtms.app/api/webhooks/sms`
2. Check Twilio logs for errors
3. Verify environment variables are set in production
4. Check `/api/webhooks/sms` route is deployed

---

## 💰 Costs

### Twilio Pricing (as of 2025)
- **Phone number**: $1.15/month
- **Incoming SMS**: $0.0075 per message
- **Outgoing SMS**: $0.0079 per message
- **Example**: 100 tickets/month = ~$1.54/month + $1.15 = **$2.69/month**

### Free Trial
- Twilio gives $15 credit on trial accounts
- Perfect for testing before going live

---

## 🔄 Workflow Example

1. **Driver**: Delivers 15.5 tons of gravel to Martin Marietta job site
2. **Driver**: Takes photo of delivery ticket with phone
3. **Driver**: Texts photo to `+1-555-123-4567`
4. **System**: 
   - Receives SMS webhook from Twilio
   - Verifies driver phone number in database
   - Checks upload is during current pay week
   - Downloads image from Twilio
   - Uploads to Supabase Storage
   - Calls OCR Edge Function
   - Extracts: Partner (Martin Marietta), Material (Gravel), Qty (15.5 Tons)
   - Matches driver automatically
   - Calculates pay ($25/ton × 15.5 = $387.50)
   - Inserts ticket with status "Pending Manager Review"
   - Sends confirmation text to driver
5. **Manager**: Reviews ticket at `/admin/review-tickets`
6. **Manager**: Approves ticket
7. **Driver**: Sees approved ticket in profile with pay amount
8. **Payroll**: Ticket appears in weekly payroll summary

---

## 📊 Database Schema

The migration adds these columns to `drivers`:

```sql
drivers {
  id uuid PRIMARY KEY
  name text
  phone text          -- E.164 format: +15551234567
  email text          -- Matches Supabase auth user
  pay_type text
  ...
}
```

**Indexes**:
- `idx_drivers_phone` on `phone` (for fast SMS lookups)
- `idx_drivers_email` on `email` (for auth matching)

---

## 🎯 Next Steps

1. Run migration: `020_add_driver_phone_email.sql`
2. Set up Twilio account and get phone number
3. Add environment variables to production
4. Configure Twilio webhook
5. Add driver phone numbers to database
6. Test with a sample ticket photo
7. Share phone number and instructions with drivers

---

## 🆘 Support

If drivers have issues:
1. Check their phone number is in the database
2. Verify they're texting during the current pay week
3. Ask them to retake photo with better quality
4. Check Twilio webhook logs for errors
5. Verify all environment variables are set

For technical issues, check:
- `/api/webhooks/sms` route logs
- Supabase Edge Function logs (`ocr-scan`)
- Twilio webhook logs in dashboard
