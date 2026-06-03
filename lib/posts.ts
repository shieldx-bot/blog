import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { cache } from 'react';
import { getDatabase } from './mongodb';
import { markdownToHtml as renderMarkdownToHtml } from './markdown';

const postsDirectory = path.join(process.cwd(), 'content/posts');
const projectsDirectory = path.join(process.cwd(), 'content/projects');
const readingDirectory = path.join(process.cwd(), 'content/reading');

export interface Post {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  updatedDate?: string;
  author?: string;
  tags?: string[];
  content: string;
}

type PostDocument = {
  slug?: string;
  title?: string;
  description?: string;
  pubDate?: Date | string;
  updatedDate?: Date | string;
  author?: string;
  tags?: string[];
  bodyMarkdown?: string;
};

function normalizeDate(value: Date | string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : value;
}

function normalizeSlug(value: string) {
  return value.replace(/\.mdx?$/, '');
}

function toPostFromFile(fileName: string): Post {
  const slug = normalizeSlug(fileName);
  const fullPath = path.join(postsDirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || '',
    description: data.description || '',
    pubDate: normalizeDate(data.pubDate),
    updatedDate: data.updatedDate ? normalizeDate(data.updatedDate) : undefined,
    author: data.author,
    tags: data.tags || [],
    content,
  };
}

function toPostFromDocument(doc: PostDocument): Post | null {
  if (!doc.slug) {
    return null;
  }

  return {
    slug: doc.slug,
    title: doc.title || '',
    description: doc.description || '',
    pubDate: normalizeDate(doc.pubDate),
    updatedDate: doc.updatedDate ? normalizeDate(doc.updatedDate) : undefined,
    author: doc.author,
    tags: doc.tags || [],
    content: doc.bodyMarkdown || '',
  };
}

async function getMongoDbPosts(): Promise<Post[]> {
  try {
    const db = await getDatabase();
    const posts = await db.collection<PostDocument>('posts')
      .find({ published: { $ne: false } })
      .sort({ pubDate: -1 })
      .toArray();

    return posts
      .map((doc) => toPostFromDocument(doc))
      .filter((post): post is Post => post !== null);
  } catch {
    console.warn('MongoDB not available, falling back to file system');
    return [];
  }
}

function getFileSystemPosts(): Post[] {
  const fileNames = fs.readdirSync(postsDirectory);
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.md') || fileName.endsWith('.mdx'))
    .map(toPostFromFile);

  return posts.sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
}

function mergePosts(...sources: Post[][]): Post[] {
  const postsBySlug = new Map<string, Post>();

  for (const source of sources) {
    for (const post of source) {
      postsBySlug.set(post.slug, post);
    }
  }

  return Array.from(postsBySlug.values()).sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
}

export const getAllPosts = cache(async (): Promise<Post[]> => {
  const mongoPosts = await getMongoDbPosts();

  return mergePosts(getFileSystemPosts(), mongoPosts);
});

async function getPostBySlugFromFileSystem(slug: string): Promise<Post | null> {
  const fileNames = fs.readdirSync(postsDirectory);
  const fileName = fileNames.find((file) => normalizeSlug(file) === slug);

  if (!fileName) {
    return null;
  }

  return toPostFromFile(fileName);
}

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const mongoPosts = await getMongoDbPosts();
  const mongoPost = mongoPosts.find((post) => post.slug === slug);

  if (mongoPost) {
    return mongoPost;
  }

  return getPostBySlugFromFileSystem(slug);
});

export async function markdownToHtml(markdown: string): Promise<string> {
  return renderMarkdownToHtml(markdown);
}

export function getAllProjects() {
  const fileNames = fs.readdirSync(projectsDirectory);
  return fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(projectsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        ...data,
      };
    });
}

export function getAllReading() {
  type ReadingItem = {
    slug: string;
    year: number;
    [key: string]: unknown;
  };

  const fileNames = fs.readdirSync(readingDirectory);
  const items = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(readingDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        ...data,
      };
    }) as ReadingItem[];

  return items.sort((a, b) => b.year - a.year);
}
