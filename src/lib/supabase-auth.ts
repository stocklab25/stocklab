import { NextRequest } from 'next/server';
import { supabase } from './supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function verifySupabaseAuth(req: NextRequest): Promise<{ user: AuthenticatedUser | null; isValid: boolean }> {
  try {
    const authHeader = req.headers.get('authorization');
    
    console.log('🔍 Auth Debug - Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'NOT FOUND');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth Debug - No valid Authorization header found');
      return { user: null, isValid: false };
    }

    const token = authHeader.substring(7);
    console.log('🔍 Auth Debug - Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('🔍 Auth Debug - Token length:', token.length);
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Supabase auth error:', error);
      return { user: null, isValid: false };
    }

    console.log('✅ Auth Debug - User authenticated:', user.email);

    // Convert to our app's user format
    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || 'Unknown User',
      role: user.user_metadata?.role || 'USER',
    };

    return { user: authUser, isValid: true };
  } catch (error) {
    console.error('❌ Auth verification error:', error);
    return { user: null, isValid: false };
  }
}

// Helper function to get token from header
export function getTokenFromHeader(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
} 