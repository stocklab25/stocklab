import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/prisma/services/user.service';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import prisma from '@/lib/db';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

function checkAuth(req: NextRequest): { user: User | null; isValid: boolean } {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return { user: null, isValid: false };
    }

    const user = verifyToken(token);
    if (!user) {
      return { user: null, isValid: false };
    }

    return { user, isValid: true };
  } catch (error) {
    console.error('Auth check error:', error);
    return { user: null, isValid: false };
  }
}

// GET /api/users - Get all users (admin only)
export async function GET(req: NextRequest) {
  try {
    const { user, isValid } = checkAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can view all users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role') || undefined;
    const search = searchParams.get('search') || '';

    const users = await UserService.getUsers({
      page,
      limit,
      role: role as any,
      search,
      showDeleted: false,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const { user, isValid } = checkAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can create users
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { email, name, password, role = 'USER' } = await req.json();

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or USER' },
        { status: 400 }
      );
    }

    const newUser = await UserService.createUser({
      email: email.toLowerCase(),
      name,
      password,
      role,
    });

    // Remove password from response
    const { password: userPassword, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      data: userWithoutPassword,
      success: true,
      message: 'User created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof Error && error.message === 'Email already exists') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 