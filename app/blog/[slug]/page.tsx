import { getPostBySlug, getAllPosts, markdownToHtml } from '@/lib/posts';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateStaticParams() {
  const posts = await getAllPosts();
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
    </main>
  );
}
