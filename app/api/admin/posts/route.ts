import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

type AdminSession = {
  email: string;
  role: string;
};

type AdminPostRecord = {
  _id: ObjectId;
  title?: string;
  description?: string;
  slug?: string;
  bodyMarkdown?: string;
  tags?: string[];
  published?: boolean;
  featured?: boolean;
  pubDate?: Date | string;
  updatedDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  author?: string;
  readingTime?: string;
  lastEditedBy?: string;
};

type AdminPostPayload = {
  id?: string;
  title?: string;
  description?: string;
  slug?: string;
  content?: string;
  tags?: string[] | string;
  published?: boolean;
  featured?: boolean;
  pubDate?: string;
  updatedDate?: string;
  author?: string;
  readingTime?: string;
};

async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(session.value) as AdminSession;
  } catch {
    return null;
  }
}

function toDateString(value: Date | string | undefined, fallback?: string) {
  if (!value) {
    return fallback || new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : value;
}

function parseTags(value: string[] | string | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter(Boolean);
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function serializePost(post: AdminPostRecord) {
  return {
    _id: post._id.toString(),
    title: post.title || '',
    description: post.description || '',
    slug: post.slug || '',
    content: post.bodyMarkdown || '',
    tags: post.tags || [],
    published: post.published !== false,
    featured: post.featured || false,
    pubDate: toDateString(post.pubDate),
    updatedDate: post.updatedDate ? toDateString(post.updatedDate) : null,
    createdAt: post.createdAt ? toDateString(post.createdAt) : null,
    updatedAt: post.updatedAt ? toDateString(post.updatedAt) : null,
    author: post.author || '',
    readingTime: post.readingTime || '',
    lastEditedBy: post.lastEditedBy || '',
  };
}

function validatePayload(body: AdminPostPayload) {
  if (!body.title?.trim() || !body.description?.trim() || !body.slug?.trim() || !body.content?.trim()) {
    return 'Missing required fields';
  }

  return null;
}

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const posts = await db.collection<AdminPostRecord>('posts')
      .find({})
      .sort({ updatedAt: -1, pubDate: -1 })
      .toArray();

    return NextResponse.json({
      posts: posts.map(serializePost),
    });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as AdminPostPayload;
    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();
    const slug = body.slug!.trim();

    const existingPost = await db.collection('posts').findOne({ slug });

    if (existingPost) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }

    const post: Omit<AdminPostRecord, '_id'> = {
      title: body.title!.trim(),
      description: body.description!.trim(),
      slug,
      bodyMarkdown: body.content!,
      tags: parseTags(body.tags),
      published: body.published !== false,
      featured: body.featured || false,
      pubDate: body.pubDate ? new Date(body.pubDate) : now,
      updatedDate: body.updatedDate ? new Date(body.updatedDate) : now,
      createdAt: now,
      updatedAt: now,
      author: body.author?.trim() || session.email,
      readingTime: body.readingTime?.trim() || '',
      lastEditedBy: session.email,
    };

    const result = await db.collection('posts').insertOne(post);

    return NextResponse.json({
      success: true,
      post: serializePost({ _id: result.insertedId, ...post }),
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as AdminPostPayload;

    if (!body.id) {
      return NextResponse.json(
        { error: 'Post ID required' },
        { status: 400 }
      );
    }

    const validationError = validatePayload(body);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const existing = await db.collection<AdminPostRecord>('posts').findOne({
      _id: new ObjectId(body.id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const slug = body.slug!.trim();
    const slugConflict = await db.collection('posts').findOne({
      slug,
      _id: { $ne: new ObjectId(body.id) },
    });

    if (slugConflict) {
      return NextResponse.json(
        { error: 'A different post already uses this slug' },
        { status: 409 }
      );
    }

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(body.id) },
      {
        $set: {
          title: body.title!.trim(),
          description: body.description!.trim(),
          slug,
          bodyMarkdown: body.content!,
          tags: parseTags(body.tags),
          published: body.published !== false,
          featured: body.featured || false,
          pubDate: body.pubDate ? new Date(body.pubDate) : existing.pubDate || new Date(),
          updatedDate: body.updatedDate ? new Date(body.updatedDate) : new Date(),
          updatedAt: new Date(),
          author: body.author?.trim() || existing.author || session.email,
          readingTime: body.readingTime?.trim() || existing.readingTime || '',
          lastEditedBy: session.email,
        },
      }
    );

    const updatedPost = await db.collection<AdminPostRecord>('posts').findOne({
      _id: new ObjectId(body.id),
    });

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount,
      post: updatedPost ? serializePost(updatedPost) : null,
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const result = await db.collection('posts').deleteOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
