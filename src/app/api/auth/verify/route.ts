import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
} 
