import { NextRequest } from 'next/server';
import { supabase } from './supabase';

export interface AuthResult {
  user: any;
  isValid: boolean;
}

export async function verifySupabaseAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, isValid: false };
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, isValid: false };
    }

    return { user, isValid: true };
  } catch (error) {
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
