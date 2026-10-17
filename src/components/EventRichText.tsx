import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./event-rich-text.css";

type EventRichTextProps = {
  content: string;
  className?: string;
  headingLevel?: 2 | 3 | 4;
};

// Imported descriptions and organiser input are untrusted. Render text through
// React, never HTML, and allow only normal web/contact links.
const safeHref = (value: string): string | undefined => {
  const href = value.trim();
  if (!href) return undefined;
  try {
    const url = new URL(href, "https://event.invalid");
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
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
        const href = safeHref(linkMatch[2]);
        if (!href) {
          nodes.push(linkMatch[1]);
          lastIndex = match.index + token.length;
          continue;
        }
        nodes.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
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

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; ordered: boolean; start: number; items: string[] };

const headingPattern = /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/;
const listPattern = /^(?:([-*+•])|(\d{1,9})[.)])\s+(.+)$/;

/** A small, line-based parser for the formatting supported by the brief editor.
 * Block boundaries must not depend on authors adding blank lines after headings.
 */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | undefined;
  for (const rawLine of content.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      current = undefined;
      continue;
    }
    const heading = line.match(headingPattern);
    const item = line.match(listPattern);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      current = undefined;
    } else if (item) {
      const ordered = Boolean(item[2]);
      if (current?.type !== "list" || current.ordered !== ordered) {
        current = { type: "list", ordered, start: ordered ? Number(item[2]) : 1, items: [] };
        blocks.push(current);
      }
      current.items.push(item[3]);
    } else if (current?.type === "list" && /^\s{2,}/.test(rawLine)) {
      current.items[current.items.length - 1] += `\n${line}`;
    } else {
      if (current?.type !== "paragraph") {
        current = { type: "paragraph", lines: [] };
        blocks.push(current);
      }
      current.lines.push(line);
    }
  }
  return blocks;
}

/** Shared safe formatting for public event descriptions and organiser previews. */
export function EventRichText({ content, className, headingLevel = 3 }: EventRichTextProps) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) return null;

  // An imported brief may begin at ###. Place it under the surrounding section
  // heading while preserving relative levels, rather than skipping straight to h4.
  const firstLevel = blocks.reduce((level, block) => block.type === "heading" ? Math.min(level, block.level) : level, 6);

  return (
    <div className={cn("event-rich-text min-w-0 max-w-[70ch] text-base text-muted-foreground", className)}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          const Heading = `h${Math.min(6, headingLevel + block.level - firstLevel)}` as "h2" | "h3" | "h4" | "h5" | "h6";
          return (
            <Heading key={blockIndex} className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {renderInline(block.text, `heading-${blockIndex}`)}
            </Heading>
          );
        }

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={blockIndex} start={block.ordered ? block.start : undefined} className={cn("space-y-2 pl-6 marker:text-primary", block.ordered ? "list-decimal" : "list-disc")}>
              {block.items.map((item, itemIndex) => (
                <li key={`${blockIndex}-${itemIndex}`} className="pl-1 whitespace-pre-line">
                  {renderInline(item, `li-${blockIndex}-${itemIndex}`)}
                </li>
              ))}
            </List>
          );
        }

        return (
          <p key={blockIndex} className="text-pretty">
            {block.lines.map((line, lineIndex) => (
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
