'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/posts');
      
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      
      if (res.ok) {
        setPosts(data.posts || []);
      } else {
        setError(data.error || 'Failed to fetch posts');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/admin/posts?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchPosts();
      } else {
        alert('Failed to delete post');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  if (loading) {
    return (
      <main>
        <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1.25rem' }}>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1.25rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)'
        }}>
          <h1 style={{
            margin: 0,
            fontFamily: 'system-ui, sans-serif',
            fontSize: '2rem',
            fontWeight: 600,
            letterSpacing: '-0.04em',
            color: 'var(--text)'
          }}>
            Admin Dashboard
          </h1>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: '999px',
              background: 'transparent',
              color: 'var(--text-soft)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            Logout
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            background: 'rgba(220, 38, 38, 0.06)',
            borderRadius: '0.5rem',
            color: '#991b1b',
            fontSize: '0.92rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            margin: '0 0 1rem',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '1.2rem',
            fontWeight: 600,
            color: 'var(--text)'
          }}>
            Posts ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <p style={{ color: 'var(--text-soft)' }}>
              No posts found in MongoDB. Posts are being served from /content/posts folder.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {posts.map((post) => (
                <div
                  key={post._id}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    display: 'grid',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: 0,
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: 'var(--text)'
                      }}>
                        {post.title}
                      </h3>
                      <p style={{ 
                        margin: '0.3rem 0 0', 
                        color: 'var(--text-soft)',
                        fontSize: '0.9rem'
                      }}>
                        {post.description}
                      </p>
                      <div style={{ 
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--muted)',
                        fontFamily: 'system-ui, sans-serif'
                      }}>
                        Slug: {post.slug} • 
                        {post.published ? ' Published' : ' Draft'} •
                        Updated: {new Date(post.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(post._id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        border: '1px solid rgba(220, 38, 38, 0.35)',
                        borderRadius: '999px',
                        background: 'rgba(220, 38, 38, 0.06)',
                        color: '#991b1b',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontFamily: 'system-ui, sans-serif'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '1rem',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          background: 'rgba(63, 103, 84, 0.06)'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text)'
          }}>
            💡 Note
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-soft)' }}>
            Posts are currently served from the <code>/content/posts</code> folder. 
            To use MongoDB for post management, add posts through the API or migrate existing content.
          </p>
        </div>
      </div>
    </main>
  );
}
