# Supabase Setup Guide

Complete guide for setting up your Supabase backend for the Classy & Beautiful website.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Classy Beautiful
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to Bulgaria (e.g., Frankfurt)
5. Click "Create new project" and wait for setup to complete

## 2. Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" or press `Ctrl+Enter`
6. Verify all tables were created (check the **Table Editor** tab)

## 3. Run Reservations Migration

1. In **SQL Editor**, create another new query
2. Copy the entire contents of `supabase/migrations/001_reservations.sql`
3. Paste and run
4. Verify the `reservations` and `admin_settings` tables were created

## 4. Run Seed Data

1. In **SQL Editor**, create another new query
2. Copy the entire contents of `supabase/seed.sql`
3. Paste and run
4. Go to **Table Editor** > **procedures** to verify data was inserted

## 5. Create Storage Bucket for Images

1. Go to **Storage** in the left sidebar
2. Click "Create a new bucket"
3. Fill in:
   - **Name**: `images`
   - **Public bucket**: ✅ **Check this box** (images need to be publicly accessible)
4. Click "Create bucket"

### Configure Storage Policies

After creating the bucket, set up access policies:

1. Click on the `images` bucket
2. Go to **Policies** tab
3. Click "New Policy"
4. Choose "For full customization" and create these policies:

**Policy 1: Public Read Access**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');
```

**Policy 2: Authenticated Upload** (for admin)
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'images');
```

**Policy 3: Authenticated Delete** (for admin)
```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'images');
```

Or simply enable public access:
1. Click on the `images` bucket
2. Click "Configuration"
3. Toggle "Public bucket" to ON

## 6. Get API Credentials

1. Go to **Settings** > **API** in the left sidebar
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## 7. Configure Environment Variables

1. In your project root, create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Replace with your actual values from step 5

## 8. Verify Setup

Run these checks in the **SQL Editor**:

```sql
-- Check procedures
SELECT COUNT(*) FROM procedures;
-- Should return 50+ procedures

-- Check schedules
SELECT COUNT(*) FROM schedules;
-- Should return 13+ schedule closures

-- Check reservations table
SELECT COUNT(*) FROM reservations;
-- Should return 0 (no reservations yet)

-- Check admin_settings
SELECT * FROM admin_settings;
-- Should show admin_email and notification_enabled settings

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
-- Should show: procedures, schedules, reservation_logs, carousel_images, reservations, admin_settings
```

## 9. Test Storage Upload

1. Go to **Storage** > **images** bucket
2. Try uploading a test image manually
3. Click on the uploaded image
4. Copy the public URL - it should look like:
   `https://xxxxx.supabase.co/storage/v1/object/public/images/test.jpg`
5. Open that URL in a browser to verify public access works

## Admin Panel Access

Once setup is complete:

1. Visit your website
2. Scroll to the footer
3. Click the copyright text **3 times quickly**
4. An "Админ панел" link will appear
5. Click it to go to `/admin`
6. Login with:
   - **Username**: `CvetiAdm`
   - **Password**: `CBCveti356-`

## Troubleshooting

### Images not loading in carousel
- Verify storage bucket is public
- Check the image URLs in browser console
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct in `.env.local`

### Cannot upload images in admin
- Check storage policies are set correctly
- Verify bucket name is exactly `images`
- Check browser console for errors

### Database errors
- Verify all tables were created (check Table Editor)
- Re-run `schema.sql` if needed
- Check for typos in table/column names

### Admin login not working
- Credentials are case-sensitive
- Username: `CvetiAdm` (capital C, capital A)
- Password: `CBCveti356-` (exactly as shown)

## Configure Admin Notifications

To receive email notifications when new reservations are made:

1. In **Table Editor**, go to `admin_settings`
2. Find the row with `setting_key` = `admin_email`
3. Set `setting_value` to your admin email address
4. Ensure `notification_enabled` is set to `true`

For email sending to work, you also need to:
1. Sign up at [resend.com](https://resend.com) 
2. Get your API key
3. Add to `.env.local`:
```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Classy & Beautiful <noreply@your-domain.com>
```

## Next Steps

After setup:
1. Upload carousel images via admin panel
2. Add/edit procedures as needed
3. Set discounts on popular procedures
4. Add schedule closures for holidays
5. Test the reservation flow
6. Configure admin email for notifications

## Database Maintenance

### Regular tasks:
- Review and update discounts monthly
- Add schedule closures before holidays
- Clean old reservation_logs (optional, after 6-12 months)

### Backup:
Supabase automatically backs up your database. To create manual backup:
1. Go to **Database** > **Backups**
2. Click "Create backup"
