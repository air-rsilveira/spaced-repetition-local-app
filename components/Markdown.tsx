import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownProps {
  /** Raw markdown source; may be empty (renders nothing, without error). */
  children: string;
}

/**
 * Markdown — reusable wrapper over `react-markdown` configured with `remark-gfm`.
 *
 * Server Component (no state, stateless rendering). Used for rendering markdown
 * previews in the CardForm and later consumed by the review slice.
 *
 * GitHub Flavored Markdown emphasis such as `**bold**` renders as a `<strong>`
 * element. An empty string renders an empty preview without error.
 *
 * Requirements: 5.3, 5.4, 5.5
 */
export default function Markdown({ children }: MarkdownProps) {
  return (
    <div className="prose prose-sm max-w-none text-aws-gray-900 dark:text-aws-white">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
