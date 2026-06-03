import { NextResponse } from 'next/server';
import { ensureAdminExists } from '@/lib/auth';

export async function GET() {
  try {
    const result = await ensureAdminExists();
    
    if (result) {
      return NextResponse.json({ 
        success: true,
        message: 'Admin user ready' 
      });
    } else {
      return NextResponse.json({ 
        success: false,
        message: 'MongoDB not configured or env vars missing' 
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
