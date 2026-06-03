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

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <nav className="mb-8">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back to home
          </Link>
        </nav>

        <article>
          <header className="mb-12">
            <time className="text-sm text-gray-500 font-mono">
              {new Date(post.pubDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <h1 className="text-4xl font-bold text-gray-900 mt-2 mb-4">
              {post.title}
            </h1>
            <p className="text-xl text-gray-600">
              {post.description}
            </p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 mt-4">
                {post.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div 
            className="prose prose-lg prose-gray max-w-none
              prose-headings:font-bold prose-headings:text-gray-900
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-900 prose-pre:text-gray-100
              prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic
              prose-ul:list-disc prose-ol:list-decimal
              prose-li:text-gray-700"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </article>

        <footer className="mt-16 pt-8 border-t border-gray-200">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back to all posts
          </Link>
        </footer>
      </div>
    </main>
  );
}
