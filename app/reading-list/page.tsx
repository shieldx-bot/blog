import { getAllReading } from '@/lib/posts';
import Link from 'next/link';

export default function ReadingList() {
  const papers = getAllReading();

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
            Reading List
          </h1>
          <p style={{ 
            margin: 0,
            maxWidth: '62ch',
            color: 'var(--text-soft)',
            fontSize: '1.02rem'
          }}>
            Papers and resources on distributed systems and ML infrastructure
          </p>
        </header>

        <div style={{ display: 'grid' }}>
          {papers.map((paper: any) => (
            <article 
              key={paper.slug}
              style={{
                display: 'grid',
                gap: '0.5rem',
                padding: '1rem 0',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ 
                  color: 'var(--muted)', 
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  width: '3rem',
                  flexShrink: 0,
                  fontFamily: 'system-ui, sans-serif'
                }}>
                  {paper.year}
                </div>
                <div style={{ flex: 1 }}>
                  {paper.link ? (
                    <a 
                      href={paper.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--text)',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '1.08rem',
                        lineHeight: 1.38,
                        fontWeight: 600,
                        letterSpacing: '-0.04em',
                        display: 'block'
                      }}
                    >
                      {paper.title} →
                    </a>
                  ) : (
                    <h2 style={{
                      margin: 0,
                      color: 'var(--text)',
                      fontFamily: 'system-ui, sans-serif',
                      fontSize: '1.08rem',
                      lineHeight: 1.38,
                      fontWeight: 600,
                      letterSpacing: '-0.04em'
                    }}>
                      {paper.title}
                    </h2>
                  )}
                  <p style={{ 
                    margin: '0.3rem 0 0', 
                    color: 'var(--text-soft)', 
                    fontSize: '0.92rem' 
                  }}>
                    {paper.authors} · {paper.venue}
                  </p>
                  {paper.note && (
                    <p style={{ 
                      margin: '0.5rem 0 0', 
                      color: 'var(--muted)', 
                      fontSize: '0.9rem',
                      fontStyle: 'italic'
                    }}>
                      {paper.note}
                    </p>
                  )}
                  {paper.tags && paper.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                      {paper.tags.map((tag: string) => (
                        <span 
                          key={tag}
                          style={{
                            color: 'var(--muted)',
                            fontSize: '0.75rem',
                            fontFamily: 'system-ui, sans-serif'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
