'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminSetup() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/seed');
      const data = await res.json();
      
      if (data.success) {
        setMessage('✅ Admin user created successfully!');
        checkStatus();
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (err: any) {
      setMessage('❌ Error: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <main>
        <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.25rem' }}>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.25rem' }}>
        <h1 style={{
          margin: '0 0 1rem',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '2rem',
          fontWeight: 600,
          letterSpacing: '-0.04em',
          color: 'var(--text)'
        }}>
          Admin Setup
        </h1>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* MongoDB Status */}
          <div style={{
            padding: '1.25rem',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            background: status?.mongodb ? 'rgba(34, 197, 94, 0.06)' : 'rgba(220, 38, 38, 0.06)'
          }}>
            <h2 style={{
              margin: '0 0 0.75rem',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text)'
            }}>
              {status?.mongodb ? '✅' : '❌'} MongoDB Connection
            </h2>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-soft)' }}>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>URI:</strong> {status?.env.hasMongoUri ? '✅ Configured' : '❌ Missing'}
              </p>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Database:</strong> {status?.env.hasMongoDb ? '✅ Configured' : '❌ Missing'}
              </p>
              {status?.mongodbError && (
                <p style={{ margin: '0.5rem 0', color: '#dc2626' }}>
                  Error: {status.mongodbError}
                </p>
              )}
            </div>
          </div>

          {/* Admin User Status */}
          <div style={{
            padding: '1.25rem',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            background: status?.admin ? 'rgba(34, 197, 94, 0.06)' : 'rgba(251, 191, 36, 0.06)'
          }}>
            <h2 style={{
              margin: '0 0 0.75rem',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text)'
            }}>
              {status?.admin ? '✅' : '⚠️'} Admin User
            </h2>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-soft)' }}>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Email:</strong> {status?.env.hasAdminEmail ? '✅ Configured' : '❌ Missing'}
              </p>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Password:</strong> {status?.env.hasAdminPassword ? '✅ Configured' : '❌ Missing'}
              </p>
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Admin Users:</strong> {status?.adminCount || 0}
              </p>
            </div>

            {status?.mongodb && !status?.admin && status?.env.hasAdminEmail && status?.env.hasAdminPassword && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                style={{
                  marginTop: '1rem',
                  padding: '0.65rem 1.25rem',
                  border: 0,
                  borderRadius: '999px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: seeding ? 'not-allowed' : 'pointer',
                  opacity: seeding ? 0.6 : 1,
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                {seeding ? 'Creating Admin...' : 'Create Admin User'}
              </button>
            )}
          </div>

          {message && (
            <div style={{
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              background: message.includes('✅') ? 'rgba(34, 197, 94, 0.06)' : 'rgba(220, 38, 38, 0.06)',
              fontSize: '0.9rem',
              fontFamily: 'system-ui, sans-serif'
            }}>
              {message}
            </div>
          )}

          {/* Instructions */}
          <div style={{
            padding: '1.25rem',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            background: 'rgba(63, 103, 84, 0.06)'
          }}>
            <h2 style={{
              margin: '0 0 0.75rem',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text)'
            }}>
              📝 Setup Instructions
            </h2>
            <ol style={{ 
              margin: 0, 
              paddingLeft: '1.5rem',
              fontSize: '0.9rem',
              color: 'var(--text-soft)',
              lineHeight: 1.7
            }}>
              <li>Add MongoDB connection string to <code>MONGODB_URI</code></li>
              <li>Add database name to <code>MONGODB_DB</code></li>
              <li>Add admin email to <code>ADMIN_EMAIL</code></li>
              <li>Add admin password to <code>ADMIN_PASSWORD</code></li>
              <li>Click "Create Admin User" button above</li>
              <li>Go to <Link href="/admin/login" style={{ color: 'var(--accent)' }}>/admin/login</Link> to sign in</li>
            </ol>
          </div>

          {status?.admin && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link 
                href="/admin/login"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '999px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                Go to Login →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
