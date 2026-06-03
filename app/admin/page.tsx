'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { estimateReadingTime, markdownToHtml } from '@/lib/markdown';
import Link from 'next/link';
import type { CSSProperties } from 'react';

type AdminPost = {
  _id: string;
  title: string;
  description: string;
  slug: string;
  content: string;
  tags: string[];
  published: boolean;
  featured: boolean;
  pubDate: string;
  updatedDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  author: string;
  readingTime: string;
  lastEditedBy: string;
};

type EditorState = {
  title: string;
  description: string;
  slug: string;
  content: string;
  tagsText: string;
  published: boolean;
  featured: boolean;
  pubDate: string;
  updatedDate: string;
  author: string;
  readingTime: string;
};

type Feedback = {
  kind: 'success' | 'error' | 'info';
  message: string;
};

const emptyEditorState = (): EditorState => {
  const now = new Date().toISOString().slice(0, 16);

  return {
    title: '',
    description: '',
    slug: '',
    content: '',
    tagsText: '',
    published: false,
    featured: false,
    pubDate: now,
    updatedDate: now,
    author: '',
    readingTime: '',
  };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTags(tags: string[]) {
  return tags.join(', ');
}

function formatStatus(post: AdminPost) {
  return post.published ? 'Published' : 'Draft';
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createDraftFromPost(post?: AdminPost | null): EditorState {
  if (!post) {
    return emptyEditorState();
  }

  return {
    title: post.title,
    description: post.description,
    slug: post.slug,
    content: post.content,
    tagsText: formatTags(post.tags),
    published: post.published,
    featured: post.featured,
    pubDate: toDatetimeLocal(post.pubDate),
    updatedDate: toDatetimeLocal(post.updatedDate || post.updatedAt || post.pubDate),
    author: post.author,
    readingTime: post.readingTime,
  };
}

function insertAtSelection(
  textarea: HTMLTextAreaElement | null,
  before: string,
  after = '',
  placeholder = ''
) {
  if (!textarea) {
    return '';
  }

  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const nextValue =
    value.slice(0, selectionStart) +
    before +
    selected +
    after +
    value.slice(selectionEnd);

  return nextValue;
}

export default function AdminDashboard() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor');
  const [draft, setDraft] = useState<EditorState>(emptyEditorState);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const currentPost = useMemo(
    () => posts.find((post) => post._id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesQuery = [post.title, post.description, post.slug, formatTags(post.tags)]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase().trim());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && post.published) ||
        (statusFilter === 'draft' && !post.published);

      return matchesQuery && matchesStatus;
    });
  }, [posts, query, statusFilter]);

  const currentReadingTime = useMemo(() => {
    return draft.readingTime.trim() || estimateReadingTime(draft.content);
  }, [draft.content, draft.readingTime]);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/posts');

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();

      if (res.ok) {
        const nextPosts = (data.posts || []) as AdminPost[];
        setPosts(nextPosts);
      } else {
        setError(data.error || 'Failed to fetch posts');
      }
    } catch {
      setError('An error occurred while loading posts');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchPosts();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [fetchPosts]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const html = await markdownToHtml(draft.content);
        setPreviewHtml(html);
      } catch {
        setPreviewHtml('<p>Preview unavailable.</p>');
      } finally {
        setPreviewLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(handle);
  }, [draft.content]);

  const startNewPost = () => {
    setSelectedPostId(null);
    setDraft(emptyEditorState());
    setSlugTouched(false);
    setPreviewMode('editor');
    setFeedback({ kind: 'info', message: 'New draft ready.' });
  };

  const loadPost = (post: AdminPost) => {
    setSelectedPostId(post._id);
    setDraft(createDraftFromPost(post));
    setSlugTouched(true);
    setPreviewMode('editor');
    setFeedback({ kind: 'info', message: `Loaded "${post.title}".` });
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const updateField = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateTitle = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const updateSlug = (value: string) => {
    setSlugTouched(true);
    updateField('slug', value);
  };

  const applyToolbarAction = (before: string, after = '', placeholder = '') => {
    const nextValue = insertAtSelection(textareaRef.current, before, after, placeholder);
    if (!nextValue) {
      return;
    }

    updateField('content', nextValue);
    textareaRef.current?.focus();
  };

  const savePost = async (publishedOverride?: boolean) => {
    setSaving(true);
    setError('');
    setFeedback(null);

    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        slug: slugify(draft.slug),
        content: draft.content,
        tags: parseTags(draft.tagsText),
        published: publishedOverride ?? draft.published,
        featured: draft.featured,
        pubDate: fromDatetimeLocal(draft.pubDate),
        updatedDate: fromDatetimeLocal(draft.updatedDate || draft.pubDate),
        author: draft.author.trim(),
        readingTime: draft.readingTime.trim() || currentReadingTime,
      };

      const res = await fetch('/api/admin/posts', {
        method: selectedPostId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          id: selectedPostId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save post');
        return;
      }

      const savedPost = data.post as AdminPost | null;

      if (savedPost) {
        setPosts((prev) => {
          const withoutCurrent = prev.filter((post) => post._id !== savedPost._id);
          return [savedPost, ...withoutCurrent].sort((a, b) => {
            return new Date(b.updatedAt || b.pubDate).getTime() - new Date(a.updatedAt || a.pubDate).getTime();
          });
        });
        setSelectedPostId(savedPost._id);
        setDraft(createDraftFromPost(savedPost));
        setSlugTouched(true);
      } else {
        await fetchPosts();
      }

      setFeedback({
        kind: 'success',
        message: selectedPostId ? 'Post updated successfully.' : 'Post created successfully.',
      });
    } catch {
      setError('An error occurred while saving the post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPostId) {
      setFeedback({ kind: 'info', message: 'Select a saved post first.' });
      return;
    }

    if (!confirm('Delete this post permanently?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts?id=${selectedPostId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete post');
        return;
      }

      setPosts((prev) => prev.filter((post) => post._id !== selectedPostId));
      startNewPost();
      setFeedback({ kind: 'success', message: 'Post deleted.' });
    } catch {
      setError('An error occurred while deleting the post');
    }
  };

  const handleRefresh = async () => {
    setError('');
    await fetchPosts();
  };

  const handleDuplicate = () => {
    setSelectedPostId(null);
    setDraft((prev) => ({
      ...prev,
      slug: prev.slug ? `${prev.slug}-copy` : '',
    }));
    setSlugTouched(true);
    setFeedback({ kind: 'info', message: 'Duplicate ready as a new draft.' });
  };

  if (loading) {
    return (
      <main>
        <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.25rem' }}>
          <p style={{ color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>Loading editor...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="admin-shell" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.25rem 1.25rem 2rem' }}>
        <div className="admin-topbar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <h1 style={{
              margin: 0,
              fontFamily: 'system-ui, sans-serif',
              fontSize: '2rem',
              fontWeight: 600,
              letterSpacing: '-0.04em',
              color: 'var(--text)',
            }}>
              Blog Editor
            </h1>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.95rem' }}>
              Write, preview, publish, and manage posts from one workspace.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              href="/admin"
              style={{
                padding: '0.55rem 0.95rem',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                background: 'rgba(63, 103, 84, 0.12)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              Blog
            </Link>
            <Link
              href="/admin/projects"
              style={{
                padding: '0.55rem 0.95rem',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              Projects
            </Link>
            <Link
              href="/admin/reading"
              style={{
                padding: '0.55rem 0.95rem',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              Reading
            </Link>
            <button
              onClick={startNewPost}
              style={{
                padding: '0.55rem 0.95rem',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              New post
            </button>
            <button
              onClick={handleRefresh}
              style={{
                padding: '0.55rem 0.95rem',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.55rem 0.95rem',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                background: 'transparent',
                color: 'var(--text-soft)',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {(error || feedback) && (
          <div
            style={{
              padding: '0.8rem 1rem',
              marginBottom: '1rem',
              border: `1px solid ${
                error
                  ? 'rgba(220, 38, 38, 0.35)'
                  : feedback?.kind === 'success'
                    ? 'rgba(34, 197, 94, 0.35)'
                    : 'rgba(59, 130, 246, 0.35)'
              }`,
              background: error
                ? 'rgba(220, 38, 38, 0.06)'
                : feedback?.kind === 'success'
                  ? 'rgba(34, 197, 94, 0.06)'
                  : 'rgba(59, 130, 246, 0.06)',
              borderRadius: '0.6rem',
              color: error ? '#991b1b' : 'var(--text)',
              fontSize: '0.92rem',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {error || feedback?.message}
          </div>
        )}

        <div className="admin-layout" style={{
          display: 'grid',
          gap: '1rem',
          alignItems: 'start',
        }}>
          <aside className="admin-panel admin-panel-left" style={{
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '1rem',
            position: 'sticky',
            top: '1rem',
            background: 'var(--surface-strong)',
          }}>
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts"
                style={{
                  width: '100%',
                  padding: '0.7rem 0.8rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }}
              />

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(['all', 'published', 'draft'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    style={{
                      padding: '0.35rem 0.7rem',
                      border: '1px solid var(--border)',
                      borderRadius: '999px',
                      background: statusFilter === value ? 'rgba(63, 103, 84, 0.12)' : 'transparent',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.84rem', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                {filteredPosts.length} post(s)
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.6rem', maxHeight: '70vh', overflow: 'auto', paddingRight: '0.25rem' }}>
              {filteredPosts.map((post) => {
                const isActive = post._id === selectedPostId;

                return (
                  <button
                    key={post._id}
                    onClick={() => loadPost(post)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.8rem',
                      border: `1px solid ${isActive ? 'rgba(63, 103, 84, 0.35)' : 'var(--border)'}`,
                      borderRadius: '0.5rem',
                      background: isActive ? 'rgba(63, 103, 84, 0.06)' : 'transparent',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      alignItems: 'start',
                    }}>
                      <strong style={{
                        color: 'var(--text)',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '0.95rem',
                        lineHeight: 1.3,
                      }}>
                        {post.title || '(Untitled)'}
                      </strong>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: post.published ? 'var(--accent-strong)' : '#92400e',
                        fontFamily: 'system-ui, sans-serif',
                      }}>
                        {formatStatus(post)}
                      </span>
                    </div>

                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.35 }}>
                      {post.slug}
                    </div>

                    <div style={{ color: 'var(--text-soft)', fontSize: '0.84rem', lineHeight: 1.4 }}>
                      {post.description}
                    </div>
                  </button>
                );
              })}

              {filteredPosts.length === 0 && (
                <div style={{ color: 'var(--text-soft)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  No posts match your current filters.
                </div>
              )}
            </div>
          </aside>

          <section className="admin-panel admin-panel-editor" style={{
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '1rem',
            background: 'var(--surface-strong)',
            minWidth: 0,
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <h2 style={{
                  margin: 0,
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}>
                  {selectedPostId ? 'Edit post' : 'New post'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.9rem' }}>
                  Draft and publish markdown or MDX content.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setPreviewMode('editor')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    background: previewMode === 'editor' ? 'rgba(63, 103, 84, 0.12)' : 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  Editor
                </button>
                <button
                  onClick={() => setPreviewMode('preview')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    background: previewMode === 'preview' ? 'rgba(63, 103, 84, 0.12)' : 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  Preview
                </button>
              </div>
            </div>

            {previewMode === 'editor' ? (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div className="admin-form-grid admin-form-grid-2" style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Title
                    </span>
                    <input
                      value={draft.title}
                      onChange={(e) => updateTitle(e.target.value)}
                      placeholder="Post title"
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.8rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Slug
                    </span>
                    <input
                      value={draft.slug}
                      onChange={(e) => updateSlug(e.target.value)}
                      placeholder="post-slug"
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.8rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                    Description
                  </span>
                  <textarea
                    value={draft.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Short description for list and metadata"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.8rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </label>

                <div className="admin-form-grid admin-form-grid-3" style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Author
                    </span>
                    <input
                      value={draft.author}
                      onChange={(e) => updateField('author', e.target.value)}
                      placeholder="Author name"
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.8rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Published at
                    </span>
                    <input
                      type="datetime-local"
                      value={draft.pubDate}
                      onChange={(e) => updateField('pubDate', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.8rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Updated at
                    </span>
                    <input
                      type="datetime-local"
                      value={draft.updatedDate}
                      onChange={(e) => updateField('updatedDate', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.8rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>
                </div>

                <div className="admin-form-grid admin-form-grid-4" style={{ display: 'grid', gap: '0.75rem' }}>
                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Tags
                    </span>
                    <input
                      value={draft.tagsText}
                      onChange={(e) => updateField('tagsText', e.target.value)}
                      placeholder="AI, Systems, Observability"
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.8rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Reading time
                    </span>
                    <input
                      value={draft.readingTime}
                      onChange={(e) => updateField('readingTime', e.target.value)}
                      placeholder={currentReadingTime}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.8rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.35rem' }}>
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(e) => updateField('featured', e.target.checked)}
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Featured
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.35rem' }}>
                    <input
                      type="checkbox"
                      checked={draft.published}
                      onChange={(e) => updateField('published', e.target.checked)}
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                      Published
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <button onClick={() => applyToolbarAction('# ', '', 'Heading')} style={toolbarButtonStyle} type="button">#</button>
                  <button onClick={() => applyToolbarAction('## ', '', 'Heading')} style={toolbarButtonStyle} type="button">H2</button>
                  <button onClick={() => applyToolbarAction('**', '**', 'bold')} style={toolbarButtonStyle} type="button">B</button>
                  <button onClick={() => applyToolbarAction('*', '*', 'italic')} style={toolbarButtonStyle} type="button">I</button>
                  <button onClick={() => applyToolbarAction('`', '`', 'code')} style={toolbarButtonStyle} type="button">{'<>'}</button>
                  <button onClick={() => applyToolbarAction('$', '$', 'math')} style={toolbarButtonStyle} type="button">$x$</button>
                  <button onClick={() => applyToolbarAction('$$\n', '\n$$', 'math block')} style={toolbarButtonStyle} type="button">$$</button>
                  <button onClick={() => applyToolbarAction('> ', '', 'Quote')} style={toolbarButtonStyle} type="button">&quot;</button>
                  <button onClick={() => applyToolbarAction('- ', '', 'List item')} style={toolbarButtonStyle} type="button">-</button>
                  <button onClick={() => applyToolbarAction('1. ', '', 'List item')} style={toolbarButtonStyle} type="button">1.</button>
                  <button onClick={() => applyToolbarAction('[', '](https://example.com)', 'link text')} style={toolbarButtonStyle} type="button">Link</button>
                  <button onClick={() => applyToolbarAction('<Callout title="Core Insight">\n', '\n</Callout>', 'Callout body')} style={toolbarButtonStyle} type="button">Callout</button>
                </div>

                <label style={{ display: 'grid', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>
                    Content
                  </span>
                  <textarea
                    ref={textareaRef}
                    value={draft.content}
                    onChange={(e) => updateField('content', e.target.value)}
                    placeholder="Write markdown or MDX here"
                    rows={22}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      fontSize: '0.95rem',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      lineHeight: 1.7,
                      resize: 'vertical',
                    }}
                  />
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      onClick={() => savePost(false)}
                      disabled={saving}
                      style={primaryButtonStyle}
                      type="button"
                    >
                      {saving ? 'Saving...' : 'Save draft'}
                    </button>
                    <button
                      onClick={() => savePost(true)}
                      disabled={saving}
                      style={primaryButtonStyle}
                      type="button"
                    >
                      {saving ? 'Saving...' : 'Publish'}
                    </button>
                    <button onClick={handleDuplicate} style={secondaryButtonStyle} type="button">
                      Duplicate
                    </button>
                    <button onClick={handleDelete} style={dangerButtonStyle} type="button">
                      Delete
                    </button>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                    Suggested reading time: {currentReadingTime}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div className="admin-preview-stats" style={{
                  display: 'grid',
                  gap: '0.75rem',
                }}>
                  <MetaBox label="Status" value={draft.published ? 'Published' : 'Draft'} />
                  <MetaBox label="Slug" value={draft.slug || 'Not set'} />
                  <MetaBox label="Reading time" value={currentReadingTime} />
                  <MetaBox label="Featured" value={draft.featured ? 'Yes' : 'No'} />
                </div>

                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    minHeight: '540px',
                  }}
                >
                  {previewLoading ? (
                    <p style={{ color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>Rendering preview...</p>
                  ) : (
                    <article>
                      <header style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                          {draft.published ? 'Published' : 'Draft'} • {draft.featured ? 'Featured' : 'Standard'}
                        </p>
                        <h3 style={{
                          margin: '0.55rem 0 0',
                          fontSize: '1.8rem',
                          lineHeight: 1.1,
                          letterSpacing: '-0.05em',
                          color: 'var(--text)',
                          fontFamily: 'system-ui, sans-serif',
                        }}>
                          {draft.title || 'Untitled post'}
                        </h3>
                        <p style={{ margin: '0.65rem 0 0', color: 'var(--text-soft)', lineHeight: 1.6 }}>
                          {draft.description || 'A short description will appear here.'}
                        </p>
                      </header>

                      <div
                        className="post-content"
                        style={{ lineHeight: 1.8, color: 'var(--text-soft)' }}
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    </article>
                  )}
                </div>
              </div>
            )}
          </section>

          <aside className="admin-panel admin-panel-right" style={{
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '1rem',
            position: 'static',
            top: 'auto',
            background: 'var(--surface-strong)',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              <div>
                <h3 style={{
                  margin: '0 0 0.35rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  Post summary
                </h3>
                <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Keep the list metadata tight, then use the preview to catch layout or markdown issues before you publish.
                </p>
              </div>

              <SummaryRow label="Selected" value={currentPost?.title || (selectedPostId ? 'Loaded' : 'New draft')} />
              <SummaryRow label="Published" value={draft.published ? 'Yes' : 'No'} />
              <SummaryRow label="Featured" value={draft.featured ? 'Yes' : 'No'} />
              <SummaryRow label="Tags" value={parseTags(draft.tagsText).length.toString()} />
              <SummaryRow label="Words" value={draft.content.trim().split(/\s+/).filter(Boolean).length.toString()} />
              <SummaryRow label="Reading" value={currentReadingTime} />
              <SummaryRow label="Author" value={draft.author || 'Not set'} />
              <SummaryRow label="Updated" value={formatDate(draft.updatedDate || draft.pubDate)} />
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Markdown notes, MDX callouts, and math expressions are supported in preview and on the public site.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

const toolbarButtonStyle: CSSProperties = {
  padding: '0.38rem 0.65rem',
  border: '1px solid var(--border)',
  borderRadius: '0.45rem',
  background: 'transparent',
  color: 'var(--text)',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '0.85rem',
  fontWeight: 600,
};

const primaryButtonStyle: CSSProperties = {
  padding: '0.55rem 0.9rem',
  border: 0,
  borderRadius: '999px',
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '0.92rem',
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  padding: '0.55rem 0.9rem',
  border: '1px solid var(--border)',
  borderRadius: '999px',
  background: 'transparent',
  color: 'var(--text)',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '0.92rem',
  fontWeight: 700,
};

const dangerButtonStyle: CSSProperties = {
  padding: '0.55rem 0.9rem',
  border: '1px solid rgba(220, 38, 38, 0.35)',
  borderRadius: '999px',
  background: 'rgba(220, 38, 38, 0.06)',
  color: '#991b1b',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '0.92rem',
  fontWeight: 700,
};

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '0.5rem',
      padding: '0.7rem 0.75rem',
      background: 'rgba(255, 255, 255, 0.55)',
    }}>
      <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
        {label}
      </div>
      <div style={{ marginTop: '0.25rem', color: 'var(--text)', fontSize: '0.92rem', lineHeight: 1.4 }}>
        {value}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, max-content)',
      gap: '0.35rem 1rem',
      alignItems: 'start',
      paddingBottom: '0.65rem',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.86rem', fontFamily: 'system-ui, sans-serif' }}>
        {label}
      </span>
      <span style={{
        color: 'var(--text)',
        fontSize: '0.86rem',
        textAlign: 'right',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        minWidth: 0,
      }}>
        {value}
      </span>
    </div>
  );
}
