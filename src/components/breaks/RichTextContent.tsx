import { sanitizeBreakDescription } from "@/lib/breaks/sanitize-html";

type RichTextContentProps = {
  html: string;
  className?: string;
};

export function RichTextContent({ html, className = "" }: RichTextContentProps) {
  const sanitized = sanitizeBreakDescription(html);

  if (!sanitized) {
    return null;
  }

  return (
    <div
      className={`rich-text-content text-base leading-7 text-muted ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
