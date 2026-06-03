import { getAllPosts } from '@/lib/posts';
import Link from 'next/link';

export default async function Home() {
  const posts = await getAllPosts();

  return (
    <main className="min-h-screen">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.25rem' }}>
        <section style={{ padding: '1.2rem 0 0.95rem', maxWidth: '760px' }}>
          <p style={{ 
            margin: 0,
            color: 'var(--accent)', 
            fontSize: '0.76rem', 
            fontWeight: 600, 
            letterSpacing: '0.16em', 
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif'
          }}>
            CLOUD AI RESEARCH
          </p>
          <h1 style={{ 
            margin: '0.7rem 0 0',
            color: 'var(--text)', 
            fontFamily: 'system-ui, sans-serif',
            fontSize: 'clamp(2rem, 4.2vw, 3.4rem)', 
            lineHeight: 1.08, 
            letterSpacing: '-0.06em', 
            fontWeight: 600 
          }}>
            Academic Minimalism
          </h1>
          <p style={{ 
            margin: '0.7rem 0 0',
            maxWidth: '62ch', 
            color: 'var(--text-soft)', 
            fontSize: '1.02rem' 
          }}>
            Research notes on cloud-native AI systems, distributed training, and infrastructure.
          </p>
        </section>

        <section style={{ padding: '1.35rem 0' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'baseline', 
            justifyContent: 'space-between', 
            gap: '1rem',
            marginBottom: '1.05rem',
            paddingBottom: '0.45rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <h2 style={{ 
              margin: 0,
              color: 'var(--text)',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase'
            }}>
              Writing by year
            </h2>
            <span style={{ color: 'var(--muted)', fontSize: '0.86rem', fontFamily: 'system-ui, sans-serif' }}>
              No thumbnails. Just text.
            </span>
          </div>
          
          <div style={{ display: 'grid' }}>
            {posts.map((post) => {
              const date = new Date(post.pubDate);
              const year = date.getFullYear();
              const month = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              return (
                <article 
                  key={post.slug}
                  style={{
                    display: 'grid',
                    gap: '0.45rem',
                    padding: '1rem 0',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <time style={{ 
                    color: 'var(--muted)', 
                    fontSize: '0.76rem', 
                    fontWeight: 600, 
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: 'system-ui, sans-serif'
                  }}>
                    {month}, {year}
                  </time>
                  <Link 
                    href={`/blog/${post.slug}`}
                    style={{
                      color: 'var(--text)',
                      fontFamily: 'system-ui, sans-serif',
                      fontSize: '1.08rem',
                      lineHeight: 1.38,
                      fontWeight: 600,
                      letterSpacing: '-0.04em'
                    }}
                  >
                    {post.title}
                  </Link>
                  <p style={{ 
                    margin: 0, 
                    maxWidth: '72ch', 
                    color: 'var(--text-soft)', 
                    fontSize: '0.98rem' 
                  }}>
                    {post.description}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                      {post.tags.slice(0, 3).map((tag) => (
                        <span 
                          key={tag}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
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
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
