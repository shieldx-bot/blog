import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { deleteReading, saveReading } from '@/lib/admin-content';
import { getAdminReading } from '@/lib/content';

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reading = await getAdminReading();

    return NextResponse.json({ reading });
  } catch (error) {
    console.error('Error fetching reading items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const reading = await saveReading(body, session.email);

    return NextResponse.json({
      success: true,
      reading,
    });
  } catch (error) {
    console.error('Error saving reading item:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : message.includes('Missing required') ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || undefined;
    const slug = searchParams.get('slug') || undefined;

    if (!id && !slug) {
      return NextResponse.json({ error: 'Reading slug required' }, { status: 400 });
    }

    const deletedSlug = await deleteReading({ id, slug }, session.email);

    return NextResponse.json({
      success: true,
      slug: deletedSlug,
    });
  } catch (error) {
    console.error('Error deleting reading item:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('required') ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
