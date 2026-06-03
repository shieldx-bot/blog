import { getAllProjects } from '@/lib/content';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Projects() {
  const projects = await getAllProjects();

  return (
    <main>
      <div style={{ maxWidth: '1100px', margin: '2rem auto 0', padding: '0 1.25rem' }}>
        <nav style={{ marginBottom: '1.5rem' }}>
          <Link 
            href="/" 
            style={{ 
              color: 'var(--text-soft)', 
              fontSize: '0.92rem',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            ← Back to home
          </Link>
        </nav>

        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{
            margin: 0,
            color: 'var(--text)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 'clamp(2rem, 4vw, 3.25rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.06em',
            fontWeight: 600,
            marginBottom: '0.65rem'
          }}>
            Projects
          </h1>
          <p style={{ 
            margin: 0,
            maxWidth: '62ch',
            color: 'var(--text-soft)',
            fontSize: '1.02rem'
          }}>
            Open-source tools and research prototypes
          </p>
        </header>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {projects.map((project: any) => (
            <article 
              key={project.slug}
              style={{
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: '0',
                display: 'grid',
                gap: '0.65rem'
              }}
            >
              <h2 style={{
                margin: 0,
                fontFamily: 'system-ui, sans-serif',
                fontSize: '1.22rem',
                lineHeight: 1.3,
                fontWeight: 600,
                color: 'var(--text)'
              }}>
                {project.title}
              </h2>
              <p style={{ 
                margin: 0, 
                color: 'var(--text-soft)',
                fontSize: '0.98rem'
              }}>
                {project.description}
              </p>
              {project.content && project.content.trim() && (
                <p style={{ 
                  margin: 0, 
                  color: 'var(--muted)',
                  fontSize: '0.92rem',
                  whiteSpace: 'pre-line'
                }}>
                  {project.content}
                </p>
              )}
              {project.stack && project.stack.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {project.stack.map((tech: string) => (
                    <span 
                      key={tech}
                      style={{
                        display: 'inline-flex',
                        border: '1px solid rgba(63, 103, 84, 0.18)',
                        background: 'rgba(63, 103, 84, 0.08)',
                        color: 'var(--accent-strong)',
                        padding: '0.16rem 0.48rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        fontFamily: 'system-ui, sans-serif'
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.92rem' }}>
                {project.github && (
                  <a 
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}
                  >
                    GitHub →
                  </a>
                )}
                {project.demo && (
                  <a 
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}
                  >
                    Demo →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
