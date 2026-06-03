'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { AdminReadingItem } from '@/lib/content';

type ReadingEditorState = {
  title: string;
  slug: string;
  authors: string;
  venue: string;
  year: string;
  note: string;
  link: string;
  tagsText: string;
  content: string;
};

type Feedback = {
  kind: 'success' | 'error' | 'info';
  message: string;
};

const emptyEditorState = (): ReadingEditorState => ({
  title: '',
  slug: '',
  authors: '',
  venue: '',
  year: String(new Date().getFullYear()),
  note: '',
  link: '',
  tagsText: '',
  content: '',
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(value: string[]) {
  return value.join(', ');
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

function createDraftFromReading(reading?: AdminReadingItem | null): ReadingEditorState {
  if (!reading) {
    return emptyEditorState();
  }

  return {
    title: reading.title,
    slug: reading.slug,
    authors: reading.authors,
    venue: reading.venue,
    year: String(reading.year || new Date().getFullYear()),
    note: reading.note || '',
    link: reading.link || '',
    tagsText: formatList(reading.tags || []),
    content: reading.content || '',
  };
}

function sourceLabel(reading?: AdminReadingItem | null) {
  if (!reading) {
    return 'New draft';
  }

  return reading.source === 'mongo' ? 'MongoDB' : 'File';
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export default function ReadingAdminPage() {
  const [readingItems, setReadingItems] = useState<AdminReadingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [query, setQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [draft, setDraft] = useState<ReadingEditorState>(emptyEditorState);
  const router = useRouter();

  const currentReading = useMemo(
    () => readingItems.find((reading) => reading.slug === selectedSlug) || null,
    [readingItems, selectedSlug]
  );

  const filteredReading = useMemo(() => {
    const term = query.toLowerCase().trim();

    if (!term) {
      return readingItems;
    }

    return readingItems.filter((reading) => {
      const haystack = [
        reading.title,
        reading.authors,
        reading.venue,
        reading.slug,
        String(reading.year),
        formatList(reading.tags || []),
        reading.note || '',
        reading.link || '',
        reading.source,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [readingItems, query]);

  const fetchReading = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reading');

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setReadingItems((data.reading || []) as AdminReadingItem[]);
      } else {
        setError(data.error || 'Failed to fetch reading items');
      }
    } catch {
      setError('An error occurred while loading reading items');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchReading();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [fetchReading]);

  const startNewReading = () => {
    setSelectedSlug(null);
    setDraft(emptyEditorState());
    setSlugTouched(false);
    setFeedback({ kind: 'info', message: 'New reading draft ready.' });
  };

  const loadReading = (reading: AdminReadingItem) => {
    setSelectedSlug(reading.slug);
    setDraft(createDraftFromReading(reading));
    setSlugTouched(true);
    setFeedback({ kind: 'info', message: `Loaded "${reading.title}".` });
  };

  const updateField = <K extends keyof ReadingEditorState>(key: K, value: ReadingEditorState[K]) => {
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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setFeedback(null);

    try {
      const payload = {
        title: draft.title.trim(),
        slug: slugify(draft.slug),
        originalSlug: selectedSlug || undefined,
        authors: draft.authors.trim(),
        venue: draft.venue.trim(),
        year: draft.year.trim() ? Number(draft.year) : undefined,
        note: draft.note.trim(),
        link: draft.link.trim(),
        tags: parseList(draft.tagsText),
        content: draft.content,
      };

      const res = await fetch('/api/admin/reading', {
        method: selectedSlug ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save reading item');
        return;
      }

      const saved = data.reading as AdminReadingItem | null;

      await fetchReading();

      if (saved) {
        setSelectedSlug(saved.slug);
        setDraft(createDraftFromReading(saved));
        setSlugTouched(true);
      }

      setFeedback({
        kind: 'success',
        message: selectedSlug ? 'Reading item updated successfully.' : 'Reading item created successfully.',
      });
    } catch {
      setError('An error occurred while saving the reading item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlug) {
      setFeedback({ kind: 'info', message: 'Select a saved reading item first.' });
      return;
    }

    if (!confirm('Delete this reading item from public listings?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reading?slug=${encodeURIComponent(selectedSlug)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete reading item');
        return;
      }

      await fetchReading();
      startNewReading();
      setFeedback({ kind: 'success', message: 'Reading item deleted.' });
    } catch {
      setError('An error occurred while deleting the reading item');
    }
  };

  const handleDuplicate = () => {
    setSelectedSlug(null);
    setDraft((prev) => ({
      ...prev,
      slug: prev.slug ? `${prev.slug}-copy` : '',
    }));
    setSlugTouched(true);
    setFeedback({ kind: 'info', message: 'Duplicate ready as a new draft.' });
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleRefresh = async () => {
    setError('');
    await fetchReading();
  };

  if (loading) {
    return (
      <main>
        <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.25rem' }}>
          <p style={{ color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>Loading reading items...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="admin-shell" style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.25rem 1.25rem 2rem' }}>
        <div
          className="admin-topbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'grid', gap: '0.25rem' }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'system-ui, sans-serif',
                fontSize: '2rem',
                fontWeight: 600,
                letterSpacing: '-0.04em',
                color: 'var(--text)',
              }}
            >
              Reading Admin
            </h1>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.95rem' }}>
              Add, edit, and retire reading list entries from MongoDB or seeded files.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/admin" style={navLinkStyle}>
              Blog
            </Link>
            <Link href="/admin/projects" style={navLinkStyle}>
              Projects
            </Link>
            <Link href="/admin/reading" style={navLinkStyle}>
              Reading
            </Link>
            <button onClick={startNewReading} style={pillButtonStyle} type="button">
              New item
            </button>
            <button onClick={handleRefresh} style={pillButtonStyle} type="button">
              Refresh
            </button>
            <button onClick={handleLogout} style={pillButtonStyle} type="button">
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

        <div className="admin-layout" style={{ display: 'grid', gap: '1rem', alignItems: 'start' }}>
          <aside
            className="admin-panel admin-panel-left"
            style={{
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '1rem',
              position: 'sticky',
              top: '1rem',
              background: 'var(--surface-strong)',
            }}
          >
            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reading items"
                style={fieldStyle}
              />

              <div style={{ fontSize: '0.84rem', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                {filteredReading.length} item(s)
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.6rem', maxHeight: '70vh', overflow: 'auto', paddingRight: '0.25rem' }}>
              {filteredReading.map((reading) => {
                const isActive = reading.slug === selectedSlug;

                return (
                  <button
                    key={reading.slug}
                    onClick={() => loadReading(reading)}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'start' }}>
                      <strong
                        style={{
                          color: 'var(--text)',
                          fontFamily: 'system-ui, sans-serif',
                          fontSize: '0.95rem',
                          lineHeight: 1.3,
                        }}
                      >
                        {reading.title || '(Untitled)'}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: reading.source === 'mongo' ? 'var(--accent-strong)' : 'var(--muted)',
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        {reading.source === 'mongo' ? 'Mongo' : 'File'}
                      </span>
                    </div>

                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.35 }}>
                      {reading.year} · {reading.slug}
                    </div>

                    <div style={{ color: 'var(--text-soft)', fontSize: '0.84rem', lineHeight: 1.4 }}>
                      {reading.authors}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {reading.tags.slice(0, 3).map((item) => (
                        <span key={item} style={tagStyle}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}

              {filteredReading.length === 0 && (
                <div style={{ color: 'var(--text-soft)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  No reading items match your current search.
                </div>
              )}
            </div>
          </aside>

          <section
            className="admin-panel admin-panel-editor"
            style={{
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '1rem',
              background: 'var(--surface-strong)',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  {selectedSlug ? 'Edit reading item' : 'New reading item'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.9rem' }}>
                  Keep the bibliographic metadata tight, then add notes when you need them.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div className="admin-form-grid admin-form-grid-2" style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Title</span>
                  <input
                    value={draft.title}
                    onChange={(e) => updateTitle(e.target.value)}
                    placeholder="Paper title"
                    style={fieldStyle}
                  />
                </label>

                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Slug</span>
                  <input
                    value={draft.slug}
                    onChange={(e) => updateSlug(e.target.value)}
                    placeholder="paper-slug"
                    style={fieldStyle}
                  />
                </label>
              </div>

              <div className="admin-form-grid admin-form-grid-3" style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Authors</span>
                  <input
                    value={draft.authors}
                    onChange={(e) => updateField('authors', e.target.value)}
                    placeholder="Benjamin H. Sigelman et al."
                    style={fieldStyle}
                  />
                </label>

                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Venue</span>
                  <input
                    value={draft.venue}
                    onChange={(e) => updateField('venue', e.target.value)}
                    placeholder="Google Research"
                    style={fieldStyle}
                  />
                </label>

                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Year</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft.year}
                    onChange={(e) => updateField('year', e.target.value)}
                    placeholder="2024"
                    style={fieldStyle}
                  />
                </label>
              </div>

              <label style={labelGridStyle}>
                <span style={labelTextStyle}>Note</span>
                <textarea
                  value={draft.note}
                  onChange={(e) => updateField('note', e.target.value)}
                  placeholder="Short note shown on the public reading list"
                  rows={4}
                  style={textareaStyle}
                />
              </label>

              <div className="admin-form-grid admin-form-grid-2" style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Link</span>
                  <input
                    value={draft.link}
                    onChange={(e) => updateField('link', e.target.value)}
                    placeholder="https://arxiv.org/..."
                    style={fieldStyle}
                  />
                </label>

                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Tags</span>
                  <input
                    value={draft.tagsText}
                    onChange={(e) => updateField('tagsText', e.target.value)}
                    placeholder="Scaling, LLMs, Observability"
                    style={fieldStyle}
                  />
                </label>
              </div>

              <label style={labelGridStyle}>
                <span style={labelTextStyle}>Notes / body</span>
                <textarea
                  value={draft.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  placeholder="Optional longer note or commentary"
                  rows={6}
                  style={textareaStyle}
                />
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button onClick={handleSave} disabled={saving} style={primaryButtonStyle} type="button">
                    {saving ? 'Saving...' : 'Save item'}
                  </button>
                  <button onClick={handleDuplicate} style={secondaryButtonStyle} type="button">
                    Duplicate
                  </button>
                  <button onClick={handleDelete} style={dangerButtonStyle} type="button">
                    Delete
                  </button>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                  Notes words: {wordCount(draft.content)}
                </div>
              </div>
            </div>
          </section>

          <aside
            className="admin-panel admin-panel-right"
            style={{
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '1rem',
              position: 'static',
              top: 'auto',
              background: 'var(--surface-strong)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              <div>
                <h3
                  style={{
                    margin: '0 0 0.35rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  Reading summary
                </h3>
                <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Track the reference data here before it reaches the public list.
                </p>
              </div>

              <SummaryRow label="Selected" value={currentReading?.title || (selectedSlug ? 'Loaded draft' : 'New draft')} />
              <SummaryRow label="Source" value={sourceLabel(currentReading)} />
              <SummaryRow label="Slug" value={draft.slug || 'Not set'} />
              <SummaryRow label="Year" value={draft.year || 'Not set'} />
              <SummaryRow label="Tags" value={parseList(draft.tagsText).length.toString()} />
              <SummaryRow label="Link" value={draft.link || 'Not set'} />
              <SummaryRow label="Authors" value={draft.authors || 'Not set'} />
              <SummaryRow label="Updated" value={formatDate(currentReading?.updatedAt || currentReading?.createdAt)} />
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Reading entries saved here override the matching file slug on the public page.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

const navLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.55rem 0.95rem',
  border: '1px solid var(--border)',
  borderRadius: '999px',
  background: 'transparent',
  color: 'var(--text)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '0.92rem',
  fontWeight: 600,
};

const pillButtonStyle: CSSProperties = {
  padding: '0.55rem 0.95rem',
  border: '1px solid var(--border)',
  borderRadius: '999px',
  background: 'transparent',
  color: 'var(--text)',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: 600,
};

const labelGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
};

const labelTextStyle: CSSProperties = {
  fontSize: '0.86rem',
  fontWeight: 600,
  color: 'var(--text-soft)',
  fontFamily: 'system-ui, sans-serif',
};

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
};

const textareaStyle: CSSProperties = {
  ...fieldStyle,
  resize: 'vertical',
  lineHeight: 1.7,
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

const tagStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--muted)',
  padding: '0.16rem 0.48rem',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 600,
  fontFamily: 'system-ui, sans-serif',
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, max-content)',
        gap: '0.35rem 1rem',
        alignItems: 'start',
        paddingBottom: '0.65rem',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--muted)', fontSize: '0.86rem', fontFamily: 'system-ui, sans-serif' }}>{label}</span>
      <span
        style={{
          color: 'var(--text)',
          fontSize: '0.86rem',
          textAlign: 'right',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          minWidth: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}
