import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { deleteProject, saveProject } from '@/lib/admin-content';
import { getAdminProjects } from '@/lib/content';

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await getAdminProjects();

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
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
    const project = await saveProject(body, session.email);

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Error saving project:', error);
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
      return NextResponse.json({ error: 'Project slug required' }, { status: 400 });
    }

    const deletedSlug = await deleteProject({ id, slug }, session.email);

    return NextResponse.json({
      success: true,
      slug: deletedSlug,
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('required') ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
