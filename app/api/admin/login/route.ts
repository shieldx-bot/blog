import { NextRequest, NextResponse } from 'next/server';
import { getAdminByEmail, resetAdminPassword, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const admin = await getAdminByEmail(email);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!admin.password) {
      const configuredEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      const configuredPassword = process.env.ADMIN_PASSWORD;

      if (
        configuredEmail &&
        configuredPassword &&
        admin.email.toLowerCase().trim() === configuredEmail &&
        password === configuredPassword
      ) {
        await resetAdminPassword(email, password);
      } else {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
    }

    const isValid = admin.password
      ? await verifyPassword(password, admin.password)
      : password === process.env.ADMIN_PASSWORD;

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_session', JSON.stringify({
      email: admin.email,
      role: admin.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8 // 8 hours
    });

    return NextResponse.json({ 
      success: true,
      admin: {
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
