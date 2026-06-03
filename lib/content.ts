import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { cache } from 'react';
import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';

const projectsDirectory = path.join(process.cwd(), 'content/projects');
const readingDirectory = path.join(process.cwd(), 'content/reading');

export interface Project {
  slug: string;
  title: string;
  description: string;
  stack: string[];
  github?: string;
  demo?: string;
  featured?: boolean;
  content?: string;
}

export interface ReadingItem {
  slug: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  note?: string;
  link?: string;
  tags: string[];
  content?: string;
}

export interface AdminProject extends Project {
  source: 'file' | 'mongo';
  mongoId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastEditedBy?: string;
}

export interface AdminReadingItem extends ReadingItem {
  source: 'file' | 'mongo';
  mongoId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastEditedBy?: string;
}

type ProjectDocument = {
  _id: ObjectId;
  slug?: string;
  title?: string;
  description?: string;
  stack?: string[] | string;
  github?: string;
  demo?: string;
  featured?: boolean;
  hidden?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastEditedBy?: string;
  content?: string;
};

type ReadingDocument = {
  _id: ObjectId;
  slug?: string;
  title?: string;
  authors?: string;
  venue?: string;
  year?: number | string;
  note?: string;
  link?: string;
  tags?: string[] | string;
  hidden?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastEditedBy?: string;
  content?: string;
};

type MongoState<T> = {
  visibleBySlug: Map<string, T>;
  hiddenSlugs: Set<string>;
};

function hasSlug<T extends { slug?: string }>(doc: T): doc is T & { slug: string } {
  return Boolean(doc.slug);
}

function normalizeSlug(value: string) {
  return value.replace(/\.mdx?$/, '');
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeNumber(value: unknown, fallback = new Date().getFullYear()): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value: Date | string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function fileProjectFromMatter(fileName: string): AdminProject {
  const slug = normalizeSlug(fileName);
  const fullPath = path.join(projectsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: String(data.title || ''),
    description: String(data.description || ''),
    stack: normalizeStringArray(data.stack),
    github: data.github ? String(data.github) : undefined,
    demo: data.demo ? String(data.demo) : undefined,
    featured: normalizeBoolean(data.featured),
    content,
    source: 'file',
  };
}

function fileReadingFromMatter(fileName: string): AdminReadingItem {
  const slug = normalizeSlug(fileName);
  const fullPath = path.join(readingDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: String(data.title || ''),
    authors: String(data.authors || ''),
    venue: String(data.venue || ''),
    year: normalizeNumber(data.year),
    note: data.note ? String(data.note) : undefined,
    link: data.link ? String(data.link) : undefined,
    tags: normalizeStringArray(data.tags),
    content,
    source: 'file',
  };
}

function projectFromDocument(doc: ProjectDocument): AdminProject | null {
  if (!doc.slug) {
    return null;
  }

  return {
    slug: doc.slug,
    title: doc.title || '',
    description: doc.description || '',
    stack: normalizeStringArray(doc.stack),
    github: doc.github,
    demo: doc.demo,
    featured: doc.featured === true,
    content: doc.content || '',
    source: 'mongo',
    mongoId: doc._id.toString(),
    createdAt: formatDate(doc.createdAt),
    updatedAt: formatDate(doc.updatedAt),
    lastEditedBy: doc.lastEditedBy,
  };
}

function readingFromDocument(doc: ReadingDocument): AdminReadingItem | null {
  if (!doc.slug) {
    return null;
  }

  return {
    slug: doc.slug,
    title: doc.title || '',
    authors: doc.authors || '',
    venue: doc.venue || '',
    year: normalizeNumber(doc.year),
    note: doc.note,
    link: doc.link,
    tags: normalizeStringArray(doc.tags),
    content: doc.content || '',
    source: 'mongo',
    mongoId: doc._id.toString(),
    createdAt: formatDate(doc.createdAt),
    updatedAt: formatDate(doc.updatedAt),
    lastEditedBy: doc.lastEditedBy,
  };
}

function latestBySlug<T extends { slug: string; hidden?: boolean; createdAt?: Date | string; updatedAt?: Date | string }>(
  docs: T[]
): Map<string, T> {
  const bySlug = new Map<string, T>();

  for (const doc of docs) {
    const current = bySlug.get(doc.slug);

    if (!current) {
      bySlug.set(doc.slug, doc);
      continue;
    }

    const currentTime = new Date(current.updatedAt || current.createdAt || 0).getTime();
    const nextTime = new Date(doc.updatedAt || doc.createdAt || 0).getTime();

    if (nextTime >= currentTime) {
      bySlug.set(doc.slug, doc);
    }
  }

  return bySlug;
}

function mergeBySlug<T extends { slug: string }>(
  fileItems: T[],
  mongoVisibleBySlug: Map<string, T>,
  hiddenSlugs: Set<string>
): T[] {
  const merged = new Map<string, T>();

  for (const item of fileItems) {
    if (hiddenSlugs.has(item.slug)) {
      continue;
    }

    const mongoItem = mongoVisibleBySlug.get(item.slug);
    merged.set(item.slug, mongoItem || item);
  }

  for (const [slug, mongoItem] of mongoVisibleBySlug.entries()) {
    if (hiddenSlugs.has(slug)) {
      continue;
    }

    if (!merged.has(slug)) {
      merged.set(slug, mongoItem);
    }
  }

  return Array.from(merged.values());
}

function sortProjects(items: AdminProject[]): AdminProject[] {
  return items.sort((a, b) => {
    const featuredDelta = Number(b.featured) - Number(a.featured);

    if (featuredDelta !== 0) {
      return featuredDelta;
    }

    return a.title.localeCompare(b.title);
  });
}

function sortReading(items: AdminReadingItem[]): AdminReadingItem[] {
  return items.sort((a, b) => {
    const yearDelta = b.year - a.year;

    if (yearDelta !== 0) {
      return yearDelta;
    }

    return a.title.localeCompare(b.title);
  });
}

async function loadProjectState(): Promise<MongoState<AdminProject>> {
  try {
    const db = await getDatabase();
    const docs = await db.collection<ProjectDocument>('projects').find({}).toArray();
    const latestDocs = latestBySlug(docs.filter(hasSlug));
    const visibleBySlug = new Map<string, AdminProject>();
    const hiddenSlugs = new Set<string>();

    for (const [slug, doc] of latestDocs.entries()) {
      if (doc.hidden) {
        hiddenSlugs.add(slug);
        continue;
      }

      const project = projectFromDocument(doc);

      if (project) {
        visibleBySlug.set(slug, project);
      }
    }

    return { visibleBySlug, hiddenSlugs };
  } catch {
    return { visibleBySlug: new Map(), hiddenSlugs: new Set() };
  }
}

async function loadReadingState(): Promise<MongoState<AdminReadingItem>> {
  try {
    const db = await getDatabase();
    const docs = await db.collection<ReadingDocument>('reading').find({}).toArray();
    const latestDocs = latestBySlug(docs.filter(hasSlug));
    const visibleBySlug = new Map<string, AdminReadingItem>();
    const hiddenSlugs = new Set<string>();

    for (const [slug, doc] of latestDocs.entries()) {
      if (doc.hidden) {
        hiddenSlugs.add(slug);
        continue;
      }

      const reading = readingFromDocument(doc);

      if (reading) {
        visibleBySlug.set(slug, reading);
      }
    }

    return { visibleBySlug, hiddenSlugs };
  } catch {
    return { visibleBySlug: new Map(), hiddenSlugs: new Set() };
  }
}

function publicProjectProjection(project: AdminProject): Project {
  return {
    slug: project.slug,
    title: project.title,
    description: project.description,
    stack: project.stack,
    github: project.github,
    demo: project.demo,
    featured: project.featured,
    content: project.content,
  };
}

function publicReadingProjection(reading: AdminReadingItem): ReadingItem {
  return {
    slug: reading.slug,
    title: reading.title,
    authors: reading.authors,
    venue: reading.venue,
    year: reading.year,
    note: reading.note,
    link: reading.link,
    tags: reading.tags,
    content: reading.content,
  };
}

function loadFileProjects(): AdminProject[] {
  return fs
    .readdirSync(projectsDirectory)
    .filter((fileName) => fileName.endsWith('.md') || fileName.endsWith('.mdx'))
    .map((fileName) => fileProjectFromMatter(fileName));
}

function loadFileReading(): AdminReadingItem[] {
  return fs
    .readdirSync(readingDirectory)
    .filter((fileName) => fileName.endsWith('.md') || fileName.endsWith('.mdx'))
    .map((fileName) => fileReadingFromMatter(fileName));
}

export const getAdminProjects = cache(async (): Promise<AdminProject[]> => {
  const fileProjects = loadFileProjects();
  const { visibleBySlug, hiddenSlugs } = await loadProjectState();

  return sortProjects(mergeBySlug(fileProjects, visibleBySlug, hiddenSlugs));
});

export const getAdminReading = cache(async (): Promise<AdminReadingItem[]> => {
  const fileReading = loadFileReading();
  const { visibleBySlug, hiddenSlugs } = await loadReadingState();

  return sortReading(mergeBySlug(fileReading, visibleBySlug, hiddenSlugs));
});

export const getAllProjects = cache(async (): Promise<Project[]> => {
  return (await getAdminProjects()).map(publicProjectProjection);
});

export const getAllReading = cache(async (): Promise<ReadingItem[]> => {
  return (await getAdminReading()).map(publicReadingProjection);
});

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseListField(value: string[] | string | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
