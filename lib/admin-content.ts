import { ObjectId, type Collection } from 'mongodb';
import { getDatabase } from './mongodb';
import { revalidateTag } from 'next/cache';
import { TAGS } from './cache';
import {
  parseListField,
  slugify,
  type AdminProject,
  type AdminReadingItem,
} from './content';

type BaseRecord = {
  _id: ObjectId;
  slug?: string;
  hidden?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastEditedBy?: string;
  content?: string;
};

type ProjectRecord = BaseRecord & {
  title?: string;
  description?: string;
  stack?: string[] | string;
  github?: string;
  demo?: string;
  featured?: boolean;
};

type ReadingRecord = BaseRecord & {
  title?: string;
  authors?: string;
  venue?: string;
  year?: number | string;
  note?: string;
  link?: string;
  tags?: string[] | string;
};

type SluggableRecord = {
  slug?: string;
  hidden?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastEditedBy?: string;
};

export type ProjectPayload = {
  id?: string;
  originalSlug?: string;
  title?: string;
  slug?: string;
  description?: string;
  stack?: string[] | string;
  github?: string;
  demo?: string;
  featured?: boolean;
  content?: string;
};

export type ReadingPayload = {
  id?: string;
  originalSlug?: string;
  title?: string;
  slug?: string;
  authors?: string;
  venue?: string;
  year?: number | string;
  note?: string;
  link?: string;
  tags?: string[] | string;
  content?: string;
};

function toISOString(value: Date | string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function parseYear(value: number | string | undefined, fallback = new Date().getFullYear()) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSlug(value: string | undefined) {
  return slugify(value || '');
}

function validateProjectPayload(body: ProjectPayload) {
  if (!body.title?.trim() || !body.slug?.trim() || !body.description?.trim()) {
    return 'Missing required project fields';
  }

  return null;
}

function validateReadingPayload(body: ReadingPayload) {
  if (
    !body.title?.trim() ||
    !body.slug?.trim() ||
    !body.authors?.trim() ||
    !body.venue?.trim() ||
    body.year === undefined ||
    body.year === null ||
    String(body.year).trim() === ''
  ) {
    return 'Missing required reading fields';
  }

  return null;
}

function serializeProject(doc: ProjectRecord): AdminProject {
  return {
    slug: doc.slug || '',
    title: doc.title || '',
    description: doc.description || '',
    stack: parseListField(doc.stack),
    github: doc.github || undefined,
    demo: doc.demo || undefined,
    featured: doc.featured === true,
    content: doc.content || '',
    source: 'mongo',
    mongoId: doc._id.toString(),
    createdAt: toISOString(doc.createdAt),
    updatedAt: toISOString(doc.updatedAt),
    lastEditedBy: doc.lastEditedBy,
  };
}

function serializeReading(doc: ReadingRecord): AdminReadingItem {
  return {
    slug: doc.slug || '',
    title: doc.title || '',
    authors: doc.authors || '',
    venue: doc.venue || '',
    year: parseYear(doc.year),
    note: doc.note || undefined,
    link: doc.link || undefined,
    tags: parseListField(doc.tags),
    content: doc.content || '',
    source: 'mongo',
    mongoId: doc._id.toString(),
    createdAt: toISOString(doc.createdAt),
    updatedAt: toISOString(doc.updatedAt),
    lastEditedBy: doc.lastEditedBy,
  };
}

async function hideSlug<T extends SluggableRecord>(collection: Collection<T>, slug: string, editedBy: string) {
  const now = new Date();
  const filter = { slug } as unknown as Parameters<typeof collection.updateMany>[0];
  const update = {
    $set: {
      hidden: true,
      updatedAt: now,
      lastEditedBy: editedBy,
    },
  } as unknown as Parameters<typeof collection.updateMany>[1];
  const result = await collection.updateMany(
    filter,
    update
  );

  if (result.matchedCount === 0) {
    const insert = {
      slug,
      hidden: true,
      createdAt: now,
      updatedAt: now,
      lastEditedBy: editedBy,
    } as unknown as Parameters<typeof collection.insertOne>[0];

    await collection.insertOne(insert);
  }
}

export async function getProjectCollection() {
  const db = await getDatabase();
  return db.collection<ProjectRecord>('projects');
}

export async function getReadingCollection() {
  const db = await getDatabase();
  return db.collection<ReadingRecord>('reading');
}

export async function saveProject(payload: ProjectPayload, editedBy: string): Promise<AdminProject> {
  const validationError = validateProjectPayload(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  const collection = await getProjectCollection();
  const slug = normalizeSlug(payload.slug);
  const originalSlug = normalizeSlug(payload.originalSlug);
  const now = new Date();
  const content = payload.content?.trim() || '';

  if (originalSlug && originalSlug !== slug) {
    await hideSlug(collection, originalSlug, editedBy);
  }

  const baseFields: Omit<ProjectRecord, '_id'> = {
    slug,
    title: payload.title!.trim(),
    description: payload.description!.trim(),
    stack: parseListField(payload.stack),
    github: payload.github?.trim() || undefined,
    demo: payload.demo?.trim() || undefined,
    featured: payload.featured === true,
    content,
    hidden: false,
    createdAt: now,
    updatedAt: now,
    lastEditedBy: editedBy,
  };

  if (payload.id) {
    const existing = await collection.findOne({ _id: new ObjectId(payload.id) });

    if (!existing) {
      throw new Error('Project not found');
    }

    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...baseFields,
          createdAt: existing.createdAt || now,
          updatedAt: now,
        },
      }
    );

    const updated = await collection.findOne({ _id: existing._id });

    if (!updated) {
      throw new Error('Project update failed');
    }

    await revalidateTag(TAGS.PROJECTS, 'max');

    return serializeProject(updated);
  }

  const existingBySlug = await collection.findOne(
    { slug },
    { sort: { updatedAt: -1, createdAt: -1 } }
  );

  if (existingBySlug) {
    await collection.updateOne(
      { _id: existingBySlug._id },
      {
        $set: {
          ...baseFields,
          createdAt: existingBySlug.createdAt || now,
          updatedAt: now,
        },
      }
    );

    const updated = await collection.findOne({ _id: existingBySlug._id });

    if (!updated) {
      throw new Error('Project update failed');
    }

      await revalidateTag(TAGS.PROJECTS, 'max');

      return serializeProject(updated);
  }

  const inserted = await collection.insertOne(baseFields as unknown as Parameters<typeof collection.insertOne>[0]);
  const created = await collection.findOne({ _id: inserted.insertedId });

  if (!created) {
    throw new Error('Project creation failed');
  }
  await revalidateTag(TAGS.PROJECTS, 'max');

  return serializeProject(created);
}

export async function saveReading(payload: ReadingPayload, editedBy: string): Promise<AdminReadingItem> {
  const validationError = validateReadingPayload(payload);
  if (validationError) {
    throw new Error(validationError);
  }

  const collection = await getReadingCollection();
  const slug = normalizeSlug(payload.slug);
  const originalSlug = normalizeSlug(payload.originalSlug);
  const now = new Date();
  const content = payload.content?.trim() || '';

  if (originalSlug && originalSlug !== slug) {
    await hideSlug(collection, originalSlug, editedBy);
  }

  const baseFields: Omit<ReadingRecord, '_id'> = {
    slug,
    title: payload.title!.trim(),
    authors: payload.authors!.trim(),
    venue: payload.venue!.trim(),
    year: parseYear(payload.year),
    note: payload.note?.trim() || undefined,
    link: payload.link?.trim() || undefined,
    tags: parseListField(payload.tags),
    content,
    hidden: false,
    createdAt: now,
    updatedAt: now,
    lastEditedBy: editedBy,
  };

  if (payload.id) {
    const existing = await collection.findOne({ _id: new ObjectId(payload.id) });

    if (!existing) {
      throw new Error('Reading item not found');
    }

    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...baseFields,
          createdAt: existing.createdAt || now,
          updatedAt: now,
        },
      }
    );

    const updated = await collection.findOne({ _id: existing._id });

    if (!updated) {
      throw new Error('Reading update failed');
    }

    await revalidateTag(TAGS.READING, 'max');

    return serializeReading(updated);
  }

  const existingBySlug = await collection.findOne(
    { slug },
    { sort: { updatedAt: -1, createdAt: -1 } }
  );

  if (existingBySlug) {
    await collection.updateOne(
      { _id: existingBySlug._id },
      {
        $set: {
          ...baseFields,
          createdAt: existingBySlug.createdAt || now,
          updatedAt: now,
        },
      }
    );

    const updated = await collection.findOne({ _id: existingBySlug._id });

    if (!updated) {
      throw new Error('Reading update failed');
    }

      await revalidateTag(TAGS.READING, 'max');

      return serializeReading(updated);
  }

  const inserted = await collection.insertOne(baseFields as unknown as Parameters<typeof collection.insertOne>[0]);
  const created = await collection.findOne({ _id: inserted.insertedId });

  if (!created) {
    throw new Error('Reading creation failed');
  }
  await revalidateTag(TAGS.READING, 'max');

  return serializeReading(created);
}

export async function deleteProject(payload: { id?: string; slug?: string }, editedBy: string) {
  const collection = await getProjectCollection();
  let slug = normalizeSlug(payload.slug);

  if (payload.id) {
    const existing = await collection.findOne({ _id: new ObjectId(payload.id) });

    if (existing?.slug) {
      slug = existing.slug;
    }
  }

  if (!slug) {
    throw new Error('Project slug required');
  }

  await hideSlug(collection, slug, editedBy);
  await revalidateTag(TAGS.PROJECTS, 'max');

  return slug;
}

export async function deleteReading(payload: { id?: string; slug?: string }, editedBy: string) {
  const collection = await getReadingCollection();
  let slug = normalizeSlug(payload.slug);

  if (payload.id) {
    const existing = await collection.findOne({ _id: new ObjectId(payload.id) });

    if (existing?.slug) {
      slug = existing.slug;
    }
  }

  if (!slug) {
    throw new Error('Reading slug required');
  }

  await hideSlug(collection, slug, editedBy);
  await revalidateTag(TAGS.READING, 'max');

  return slug;
}
