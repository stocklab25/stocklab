# Supabase Authentication Setup

This guide explains how to set up Supabase authentication for the Stock Lab app.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database Configuration (if using Prisma with Supabase)
DATABASE_URL=your_supabase_database_url
DIRECT_URL=your_supabase_direct_connection_url

# JWT Secret (if still needed for legacy features)
JWT_SECRET=your_jwt_secret_key
```

## Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Go to Settings > API
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database Connection

If you're using Supabase as your database:

1. Go to Settings > Database
2. Copy the connection string
3. Use it as your `DATABASE_URL` and `DIRECT_URL`

## Features

The Supabase integration provides:

- **Email/Password Authentication**: Sign up, sign in, sign out
- **Session Management**: Automatic token refresh and session persistence
- **User Metadata**: Store user roles and additional information
- **Secure API Routes**: Token verification for protected endpoints
- **Real-time Auth State**: Automatic UI updates when auth state changes

## Migration from Custom JWT

The app has been updated to use Supabase authentication instead of custom JWT tokens. The main changes:

1. **AuthContext**: Now uses Supabase client instead of custom JWT
2. **API Routes**: Use Supabase token verification
3. **Session Management**: Handled automatically by Supabase
4. **User Data**: Stored in Supabase auth with metadata

## User Roles

User roles are stored in the `user_metadata` field of Supabase auth:

- `ADMIN`: Full access to all features including user management
- `USER`: Standard user access

## API Authentication

All protected API routes now use Supabase token verification:

```typescript
const { user, isValid } = await verifySupabaseAuth(request);
if (!isValid || !user) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
```

## Benefits of Supabase Auth

- **Security**: Built-in security best practices
- **Scalability**: Handles authentication at scale
- **Features**: Password reset, email verification, social auth
- **Maintenance**: No need to manage JWT tokens manually
- **Real-time**: Automatic session synchronization 