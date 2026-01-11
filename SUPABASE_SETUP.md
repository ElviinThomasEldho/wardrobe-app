# Wardrobe App - Supabase Backend Setup

This document provides instructions for setting up your Wardrobe App with Supabase as the backend.

## Prerequisites

- Node.js and npm installed
- Expo CLI installed (`npm install -g @expo/cli`)
- Supabase account and project created

## Setup Instructions

### 1. Get Your Supabase Project Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy your Project URL and anon/public key

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp supabase.env.example .env.local
   ```

2. Update `.env.local` with your actual Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Link Your Supabase Project

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project (replace `your-project-ref` with your actual project reference):
   ```bash
   supabase link --project-ref your-project-ref
   ```

### 4. Apply Database Migrations

1. Apply the initial schema migration:
   ```bash
   supabase db push
   ```

   Or if you prefer to run migrations manually:
   ```bash
   supabase migration up
   ```

### 5. Install Dependencies

```bash
npm install
```

### 6. Start the Development Server

```bash
npm start
```

## Database Schema

The app uses the following main tables:

- **items**: Stores wardrobe items with categories, colors, styles, and occasions
- **outfits**: Stores outfit combinations with ratings
- **outfit_items**: Junction table linking outfits to items
- **user_prefs**: Stores user preferences and custom taxonomy

## Authentication

The app includes:
- Email/password authentication
- User session management
- Row Level Security (RLS) policies for data isolation

## Storage

Images are stored in Supabase Storage with:
- Public access for wardrobe images
- User-specific folders for organization
- 50MB file size limit
- Support for JPEG, PNG, and WebP formats

## Features

- **User Authentication**: Sign up, sign in, sign out
- **Wardrobe Management**: Add, edit, delete wardrobe items
- **Outfit Creation**: Create outfits from wardrobe items
- **Custom Taxonomy**: Add custom occasions and styles
- **Image Storage**: Upload and manage item images
- **Data Sync**: Real-time synchronization across devices

## API Functions

The app uses Supabase's built-in features:
- Real-time subscriptions for live updates
- Row Level Security for data protection
- Storage API for image management
- Auth API for user management

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure your Supabase URL and anon key are correct
2. **Database Connection**: Verify your project is linked and migrations are applied
3. **Image Upload Issues**: Check storage bucket permissions and file size limits

### Getting Help

- Check the Supabase documentation: https://supabase.com/docs
- Review the migration files in `supabase/migrations/`
- Check the console for error messages

## Next Steps

1. Test the authentication flow
2. Add some wardrobe items
3. Create your first outfit
4. Customize the app's styling and features as needed

## Migration from SQLite

If you're migrating from the previous SQLite version:
1. Export your existing data
2. Apply the Supabase migrations
3. Import your data using the new API functions
4. Update any custom code to use the new Supabase client
