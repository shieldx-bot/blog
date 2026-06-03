import { getPostBySlug, getAllPosts, markdownToHtml } from '@/lib/posts';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import 'katex/dist/katex.min.css';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function Post({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const htmlContent = await markdownToHtml(post.content);
  const date = new Date(post.pubDate);

  return (
    <main>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 0' }}>
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

        <article>
          <header style={{ 
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '1.5rem'
          }}>
            <time style={{ 
              display: 'block',
              color: 'var(--muted)', 
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              marginBottom: '0.7rem'
            }}>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
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
              {post.title}
            </h1>
            <p style={{ 
              margin: 0,
              maxWidth: '62ch',
              color: 'var(--text-soft)',
              fontSize: '1.02rem'
            }}>
              {post.description}
            </p>
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.8rem' }}>
                {post.tags.map((tag) => (
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
          </header>

          <div 
            className="post-content"
            style={{
              fontSize: '1.02rem',
              lineHeight: 1.78,
              color: 'var(--text-soft)'
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </article>
      </div>
      <style jsx global>{`
        .post-content h2,
        .post-content h3,
        .post-content h4 {
          margin: 1.8rem 0 0.8rem;
          color: var(--text);
          font-family: system-ui, sans-serif;
          line-height: 1.18;
          letter-spacing: -0.04em;
          fontWeight: 600;
        }
        .post-content h2 { font-size: 1.55rem; }
        .post-content h3 { font-size: 1.22rem; }
        .post-content p { margin: 1.3rem 0; }
        .post-content a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 0.18em;
        }
        .post-content a:hover { color: var(--accent-strong); }
        .post-content ul, .post-content ol { 
          padding-left: 1.25rem;
          margin: 1.3rem 0;
        }
        .post-content li + li { margin-top: 0.35rem; }
        .post-content blockquote {
          margin: 1.3rem 0;
          padding: 0.95rem 1rem;
          border-left: 2px solid var(--accent);
          background: rgba(63, 103, 84, 0.06);
          font-style: italic;
        }
        .post-content pre {
          position: relative;
          overflow: auto;
          padding: 1.05rem 1rem;
          margin: 1.3rem 0;
          border: 1px solid rgba(16, 20, 24, 0.14);
          background: #2e3440;
          color: #eceff4;
        }
        .post-content pre code {
          display: block;
          line-height: 1.7;
          font-size: 0.91rem;
          font-family: 'SFMono-Regular', 'Consolas', monospace;
        }
        .post-content :not(pre) > code {
          padding: 0.14rem 0.36rem;
          border: 1px solid rgba(63, 103, 84, 0.12);
          border-radius: 0.25rem;
          background: rgba(63, 103, 84, 0.06);
          color: var(--accent-strong);
          font-size: 0.92em;
          font-family: 'SFMono-Regular', 'Consolas', monospace;
        }
        .post-content table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
          margin: 1.3rem 0;
          border-top: 1px solid var(--border);
        }
        .post-content th,
        .post-content td {
          padding: 0.7rem 0.65rem;
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
      `}</style>
    </main>
  );
}
