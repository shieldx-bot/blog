'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { AdminProject } from '@/lib/content';

type ProjectEditorState = {
  title: string;
  slug: string;
  description: string;
  stackText: string;
  github: string;
  demo: string;
  featured: boolean;
  content: string;
};

type Feedback = {
  kind: 'success' | 'error' | 'info';
  message: string;
};

const emptyEditorState = (): ProjectEditorState => ({
  title: '',
  slug: '',
  description: '',
  stackText: '',
  github: '',
  demo: '',
  featured: false,
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

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function createDraftFromProject(project?: AdminProject | null): ProjectEditorState {
  if (!project) {
    return emptyEditorState();
  }

  return {
    title: project.title,
    slug: project.slug,
    description: project.description,
    stackText: formatList(project.stack || []),
    github: project.github || '',
    demo: project.demo || '',
    featured: project.featured || false,
    content: project.content || '',
  };
}

function sourceLabel(project?: AdminProject | null) {
  if (!project) {
    return 'New draft';
  }

  return project.source === 'mongo' ? 'MongoDB' : 'File';
}

export default function ProjectsAdminPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [query, setQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [draft, setDraft] = useState<ProjectEditorState>(emptyEditorState);
  const router = useRouter();

  const currentProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) || null,
    [projects, selectedSlug]
  );

  const filteredProjects = useMemo(() => {
    const term = query.toLowerCase().trim();

    if (!term) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = [
        project.title,
        project.description,
        project.slug,
        formatList(project.stack || []),
        project.github || '',
        project.demo || '',
        project.source,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [projects, query]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/projects');

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setProjects((data.projects || []) as AdminProject[]);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch {
      setError('An error occurred while loading projects');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchProjects();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [fetchProjects]);

  const startNewProject = () => {
    setSelectedSlug(null);
    setDraft(emptyEditorState());
    setSlugTouched(false);
    setFeedback({ kind: 'info', message: 'New project draft ready.' });
  };

  const loadProject = (project: AdminProject) => {
    setSelectedSlug(project.slug);
    setDraft(createDraftFromProject(project));
    setSlugTouched(true);
    setFeedback({ kind: 'info', message: `Loaded "${project.title}".` });
  };

  const updateField = <K extends keyof ProjectEditorState>(key: K, value: ProjectEditorState[K]) => {
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
        description: draft.description.trim(),
        stack: parseList(draft.stackText),
        github: draft.github.trim(),
        demo: draft.demo.trim(),
        featured: draft.featured,
        content: draft.content,
      };

      const res = await fetch('/api/admin/projects', {
        method: selectedSlug ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save project');
        return;
      }

      const saved = data.project as AdminProject | null;

      await fetchProjects();

      if (saved) {
        setSelectedSlug(saved.slug);
        setDraft(createDraftFromProject(saved));
        setSlugTouched(true);
      }

      setFeedback({
        kind: 'success',
        message: selectedSlug ? 'Project updated successfully.' : 'Project created successfully.',
      });
    } catch {
      setError('An error occurred while saving the project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSlug) {
      setFeedback({ kind: 'info', message: 'Select a saved project first.' });
      return;
    }

    if (!confirm('Delete this project from public listings?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/projects?slug=${encodeURIComponent(selectedSlug)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete project');
        return;
      }

      await fetchProjects();
      startNewProject();
      setFeedback({ kind: 'success', message: 'Project deleted.' });
    } catch {
      setError('An error occurred while deleting the project');
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
    await fetchProjects();
  };

  if (loading) {
    return (
      <main>
        <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.25rem' }}>
          <p style={{ color: 'var(--text-soft)', fontFamily: 'system-ui, sans-serif' }}>Loading projects...</p>
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
              Projects Admin
            </h1>
            <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.95rem' }}>
              Add, edit, and retire projects stored in MongoDB or seeded from files.
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
            <button onClick={startNewProject} style={pillButtonStyle} type="button">
              New project
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
                placeholder="Search projects"
                style={fieldStyle}
              />

              <div style={{ fontSize: '0.84rem', color: 'var(--muted)', fontFamily: 'system-ui, sans-serif' }}>
                {filteredProjects.length} project(s)
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.6rem', maxHeight: '70vh', overflow: 'auto', paddingRight: '0.25rem' }}>
              {filteredProjects.map((project) => {
                const isActive = project.slug === selectedSlug;

                return (
                  <button
                    key={project.slug}
                    onClick={() => loadProject(project)}
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
                        {project.title || '(Untitled)'}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: project.source === 'mongo' ? 'var(--accent-strong)' : 'var(--muted)',
                          fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        {project.source === 'mongo' ? 'Mongo' : 'File'}
                      </span>
                    </div>

                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.35 }}>
                      {project.slug}
                    </div>

                    <div style={{ color: 'var(--text-soft)', fontSize: '0.84rem', lineHeight: 1.4 }}>
                      {project.description}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {project.featured && (
                        <span style={badgeStyle}>Featured</span>
                      )}
                      {project.stack.slice(0, 3).map((item) => (
                        <span key={item} style={tagStyle}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}

              {filteredProjects.length === 0 && (
                <div style={{ color: 'var(--text-soft)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  No projects match your current search.
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
                  {selectedSlug ? 'Edit project' : 'New project'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.9rem' }}>
                  Keep the metadata clean, then let the public page do the heavy lifting.
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
                    placeholder="Project title"
                    style={fieldStyle}
                  />
                </label>

                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Slug</span>
                  <input
                    value={draft.slug}
                    onChange={(e) => updateSlug(e.target.value)}
                    placeholder="project-slug"
                    style={fieldStyle}
                  />
                </label>
              </div>

              <label style={labelGridStyle}>
                <span style={labelTextStyle}>Description</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Short description shown on the public Projects page"
                  rows={4}
                  style={textareaStyle}
                />
              </label>

              <div className="admin-form-grid admin-form-grid-3" style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Stack</span>
                  <input
                    value={draft.stackText}
                    onChange={(e) => updateField('stackText', e.target.value)}
                    placeholder="Go, Kubernetes, Ray"
                    style={fieldStyle}
                  />
                </label>

                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>GitHub</span>
                  <input
                    value={draft.github}
                    onChange={(e) => updateField('github', e.target.value)}
                    placeholder="https://github.com/..."
                    style={fieldStyle}
                  />
                </label>

                <label style={labelGridStyle}>
                  <span style={labelTextStyle}>Demo</span>
                  <input
                    value={draft.demo}
                    onChange={(e) => updateField('demo', e.target.value)}
                    placeholder="https://example.com"
                    style={fieldStyle}
                  />
                </label>
              </div>

              <div className="admin-form-grid admin-form-grid-2" style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={{ ...labelGridStyle, display: 'flex', alignItems: 'center', gap: '0.55rem', paddingTop: '0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(e) => updateField('featured', e.target.checked)}
                  />
                  <span style={labelTextStyle}>Featured</span>
                </label>

                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <span style={labelTextStyle}>Stack count</span>
                  <div style={metaValueStyle}>
                    {parseList(draft.stackText).length} item(s)
                  </div>
                </div>
              </div>

              <label style={labelGridStyle}>
                <span style={labelTextStyle}>Notes / body</span>
                <textarea
                  value={draft.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  placeholder="Optional notes or longer body content"
                  rows={6}
                  style={textareaStyle}
                />
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button onClick={handleSave} disabled={saving} style={primaryButtonStyle} type="button">
                    {saving ? 'Saving...' : 'Save project'}
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
                  Project summary
                </h3>
                <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Use this panel to confirm the public-facing metadata before saving.
                </p>
              </div>

              <SummaryRow label="Selected" value={currentProject?.title || (selectedSlug ? 'Loaded draft' : 'New draft')} />
              <SummaryRow label="Source" value={sourceLabel(currentProject)} />
              <SummaryRow label="Slug" value={draft.slug || 'Not set'} />
              <SummaryRow label="Featured" value={draft.featured ? 'Yes' : 'No'} />
              <SummaryRow label="Stack" value={parseList(draft.stackText).length.toString()} />
              <SummaryRow label="GitHub" value={draft.github || 'Not set'} />
              <SummaryRow label="Demo" value={draft.demo || 'Not set'} />
              <SummaryRow label="Updated" value={formatDate(currentProject?.updatedAt || currentProject?.createdAt)} />
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Projects saved here override the matching file slug on the public page.
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

const metaValueStyle: CSSProperties = {
  padding: '0.7rem 0.8rem',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  background: 'rgba(255, 255, 255, 0.55)',
  color: 'var(--text)',
  fontSize: '0.92rem',
  lineHeight: 1.4,
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

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid rgba(63, 103, 84, 0.18)',
  background: 'rgba(63, 103, 84, 0.08)',
  color: 'var(--accent-strong)',
  padding: '0.16rem 0.48rem',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 600,
  fontFamily: 'system-ui, sans-serif',
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
