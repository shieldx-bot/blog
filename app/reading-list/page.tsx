import { getAllReading } from '@/lib/posts';
import Link from 'next/link';

export default function ReadingList() {
  const papers = getAllReading();

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back to home
          </Link>
        </nav>

        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Reading List</h1>
          <p className="text-xl text-gray-600">
            Papers and resources on distributed systems and ML infrastructure
          </p>
        </header>

        <div className="space-y-6">
          {papers.map((paper: any) => (
            <article 
              key={paper.slug}
              className="border-b border-gray-200 pb-6"
            >
              <div className="flex gap-4">
                <div className="text-sm text-gray-400 font-mono w-12 flex-shrink-0">
                  {paper.year}
                </div>
                <div className="flex-1">
                  {paper.link ? (
                    <a 
                      href={paper.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {paper.title} →
                    </a>
                  ) : (
                    <h2 className="text-xl font-semibold text-gray-900">
                      {paper.title}
                    </h2>
                  )}
                  <p className="text-gray-600 text-sm mt-1">
                    {paper.authors} · {paper.venue}
                  </p>
                  {paper.note && (
                    <p className="text-gray-500 text-sm mt-2 italic">
                      {paper.note}
                    </p>
                  )}
                  {paper.tags && paper.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {paper.tags.map((tag: string) => (
                        <span 
                          key={tag}
                          className="text-xs text-gray-400"
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
