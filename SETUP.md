# Setup Instructions for Päronsplit

## Authentication Issue Fix

The authentication issue was caused by an invalid Supabase API key. Follow these steps to configure the application correctly:

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (or create a new one if needed)
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

The anon key should be a long JWT token starting with "eyJ" and looks something like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

## Step 2: Create Environment File

1. Copy the `.env.example` file to create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and replace the placeholder values with your actual Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

## Step 3: Install Dependencies and Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Step 4: Verify Supabase Database Setup

Make sure your Supabase project has the required tables. You should have:

1. **profiles** table with columns:
   - `id` (uuid, primary key)
   - `user_id` (uuid, references auth.users)
   - `name` (text)
   - `email` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

2. Row Level Security (RLS) policies that allow:
   - Users to insert their own profile
   - Users to read and update their own profile

If these tables don't exist, you'll need to create them in your Supabase SQL Editor.

## Troubleshooting

- If you see "Missing Supabase environment variables" error, make sure your `.env` file exists and contains the correct values
- If login/signup still fails, check the browser console for specific error messages
- Verify that your Supabase project is active and the credentials are correct

## Security Note

Never commit your `.env` file to version control. It's already added to `.gitignore` to prevent accidental commits.
