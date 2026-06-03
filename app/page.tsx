import { getAllPosts } from '@/lib/posts';
import Link from 'next/link';

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <section className="mb-16">
          <p className="text-sm font-medium text-gray-500 mb-2">CLOUD AI RESEARCH</p>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Academic Minimalism
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Research notes on cloud-native AI systems, distributed training, and infrastructure.
          </p>
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Writing by year</h2>
            <span className="text-sm text-gray-500">No thumbnails. Just text.</span>
          </div>
          
          <div className="space-y-8">
            {posts.map((post) => {
              const year = new Date(post.pubDate).getFullYear();
              return (
                <article key={post.slug} className="border-b border-gray-200 pb-6">
                  <div className="flex gap-6">
                    <time className="text-sm text-gray-400 font-mono w-16 flex-shrink-0">
                      {year}
                    </time>
                    <div className="flex-1">
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {post.title}
                      </Link>
                      <p className="text-gray-600 mt-2 leading-relaxed">
                        {post.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <time>
                          {new Date(post.pubDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex gap-2">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs text-gray-400">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Cloud AI Research Blog</p>
        </footer>
      </div>
    </main>
  );
}
