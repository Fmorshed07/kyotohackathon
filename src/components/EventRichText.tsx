import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EventRichTextProps = {
  content: string;
  className?: string;
};

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[0.9em] text-primary">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
};

/**
 * Lightweight event brief renderer — headings, lists, bold/italic, links.
 * Keeps organiser copy readable without a full markdown dependency.
 */
export function EventRichText({ content, className }: EventRichTextProps) {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-4 text-base leading-relaxed text-muted-foreground", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const headingMatch = lines[0]?.match(/^(#{1,3})\s+(.+)$/);

        if (headingMatch && lines.length === 1) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          if (level === 1) {
            return (
              <h2 key={blockIndex} className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {renderInline(text, `h1-${blockIndex}`)}
              </h2>
            );
          }
          if (level === 2) {
            return (
              <h3 key={blockIndex} className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {renderInline(text, `h2-${blockIndex}`)}
              </h3>
            );
          }
          return (
            <h4
              key={blockIndex}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-primary"
            >
              {renderInline(text, `h3-${blockIndex}`)}
            </h4>
          );
        }

        if (lines.every((line) => /^[-*•]\s+/.test(line))) {
          return (
            <ul key={blockIndex} className="space-y-2 pl-1">
              {lines.map((line, lineIndex) => (
                <li key={`${blockIndex}-${lineIndex}`} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{renderInline(line.replace(/^[-*•]\s+/, ""), `li-${blockIndex}-${lineIndex}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="text-pretty">
            {lines.map((line, lineIndex) => (
              <span key={`${blockIndex}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, `p-${blockIndex}-${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
