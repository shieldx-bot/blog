import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

export function normalizeMdxContent(markdown: string): string {
  const withoutImports = markdown
    .replace(/^\s*import\s+.+$/gm, '')
    .replace(/^\s*export\s+.+$/gm, '');

  return withoutImports.replace(
    /<Callout\s+title=(["'])(.*?)\1\s*>([\s\S]*?)<\/Callout>/g,
    (_match, _quote, title, body) => {
      const calloutBody = body
        .trim()
        .split('\n')
        .map((line: string) => `> ${line}`)
        .join('\n');

      return `\n> **${title}**\n>\n${calloutBody}\n`;
    }
  );
}

export function estimateReadingTime(markdown: string): string {
  const words = markdown
    .replace(/[#>*_`[\]()-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min read`;
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const normalizedMarkdown = normalizeMdxContent(markdown);

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(normalizedMarkdown);

  return result.toString();
}
