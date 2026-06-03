import { getAllProjects } from '@/lib/posts';
import Link from 'next/link';

export default function Projects() {
  const projects = getAllProjects();

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Projects</h1>
          <p className="text-xl text-gray-600">
            Open-source tools and research prototypes
          </p>
        </header>

        <div className="grid gap-8">
          {projects.map((project: any) => (
            <article 
              key={project.slug}
              className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {project.title}
              </h2>
              <p className="text-gray-600 mb-4">
                {project.description}
              </p>
              {project.stack && project.stack.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.stack.map((tech: string) => (
                    <span 
                      key={tech}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-4 text-sm">
                {project.github && (
                  <a 
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    GitHub →
                  </a>
                )}
                {project.demo && (
                  <a 
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Demo →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
