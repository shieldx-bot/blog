import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cloud AI Research Blog",
  description: "Research notes on cloud-native AI systems and infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <div style={{ 
          maxWidth: '1100px', 
          margin: '0 auto', 
          padding: '0.9rem 1.25rem 2.5rem' 
        }}>
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.95rem 0 0.85rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <Link 
              href="/" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                color: 'var(--text)',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                fontSize: '1rem'
              }}
            >
              <span style={{
                width: '0.7rem',
                height: '0.7rem',
                borderRadius: '999px',
                background: 'var(--accent)'
              }} />
              Cloud AI Research
            </Link>
            <nav style={{
              display: 'flex',
              gap: '1.2rem',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.92rem'
            }}>
              <Link 
                href="/" 
                style={{ color: 'var(--text-soft)' }}
              >
                Home
              </Link>
              <Link 
                href="/projects" 
                style={{ color: 'var(--text-soft)' }}
              >
                Projects
              </Link>
              <Link 
                href="/reading-list" 
                style={{ color: 'var(--text-soft)' }}
              >
                Reading
              </Link>
            </nav>
          </header>
          {children}
          <footer style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.9rem 0 0',
            marginTop: '2rem',
            borderTop: '1px solid var(--border)',
            color: 'var(--muted)',
            fontSize: '0.86rem',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <p style={{ margin: 0 }}>
              © {new Date().getFullYear()} Cloud AI Research Blog
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
