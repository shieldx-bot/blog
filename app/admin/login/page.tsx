'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '0 1.25rem' }}>
        <h1 style={{
          margin: '0 0 0.5rem',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '2rem',
          fontWeight: 600,
          letterSpacing: '-0.04em',
          color: 'var(--text)'
        }}>
          Admin Login
        </h1>
        <p style={{ 
          margin: '0 0 2rem', 
          color: 'var(--text-soft)',
          fontSize: '0.95rem'
        }}>
          Sign in to manage blog posts
        </p>

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

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            <label style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-soft)',
              fontFamily: 'system-ui, sans-serif'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'grid', gap: '0.4rem' }}>
            <label style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-soft)',
              fontFamily: 'system-ui, sans-serif'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem 1.25rem',
              border: 0,
              borderRadius: '999px',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'system-ui, sans-serif',
              marginTop: '0.5rem'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
