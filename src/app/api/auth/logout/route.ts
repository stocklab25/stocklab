import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // With JWT, logout is handled on the client side
    // The server doesn't need to do anything since JWT is stateless
    // The client should remove the token from localStorage
    
    return NextResponse.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
