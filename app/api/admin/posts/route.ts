import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/mongodb';

async function getAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  
  if (!session) {
    return null;
  }
  
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const posts = await db.collection('posts')
      .find({})
      .sort({ updatedAt: -1, pubDate: -1 })
      .toArray();

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, slug, content, tags, published } = body;

    if (!title || !description || !slug || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();

    const post = {
      title,
      description,
      slug,
      bodyMarkdown: content,
      tags: tags || [],
      published: published !== false,
      pubDate: now,
      createdAt: now,
      updatedAt: now,
      lastEditedBy: session.email
    };

    const result = await db.collection('posts').insertOne(post);

    return NextResponse.json({ 
      success: true,
      postId: result.insertedId 
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, title, description, slug, content, tags, published } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const { ObjectId } = require('mongodb');

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title,
          description,
          slug,
          bodyMarkdown: content,
          tags: tags || [],
          published: published !== false,
          updatedAt: new Date(),
          lastEditedBy: session.email
        }
      }
    );

    return NextResponse.json({ 
      success: true,
      modified: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const { ObjectId } = require('mongodb');

    const result = await db.collection('posts').deleteOne({
      _id: new ObjectId(id)
    });

    return NextResponse.json({ 
      success: true,
      deleted: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
