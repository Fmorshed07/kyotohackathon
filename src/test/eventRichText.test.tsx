import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventRichText } from "@/components/EventRichText";
import ImportedEventDetails from "@/components/hackathons/ImportedEventDetails";
import { IMPACT_OSAKA } from "@/lib/impactOsaka";

afterEach(cleanup);

describe("event brief formatting", () => {
  it("renders the actual Osaka description as five headings with separate paragraphs", () => {
    const { container } = render(<EventRichText content={IMPACT_OSAKA.sourceDescription!} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "One shared challenge", "Your entry", "Evaluation", "Awards", "Joining",
    ]);
    expect(container.querySelectorAll("p")).toHaveLength(5);
    expect(container.textContent).not.toContain("###");
    expect(screen.getByRole("heading", { name: "Your entry" }).nextElementSibling).toHaveTextContent("60–120 seconds");
  });

  it("separates headings, mixed lists and prose even without blank lines", () => {
    const { container } = render(<EventRichText content={"Introduction\n### Entry\nBring these:\n- A **title**\n+ A *video*\n• An idea\n3. Register\n4) Submit\nFinished.\n### Judging\nGood luck."} />);
    const children = Array.from(container.firstElementChild!.children);
    expect(children.map((child) => child.tagName)).toEqual(["P", "H3", "P", "UL", "OL", "P", "H3", "P"]);
    expect(within(children[3] as HTMLElement).getAllByRole("listitem")).toHaveLength(3);
    expect(children[4]).toHaveAttribute("start", "3");
    expect(children[3].querySelector("strong")).toHaveTextContent("title");
    expect(children[3].querySelector("em")).toHaveTextContent("video");
  });

  it("preserves ordinary paragraphs, intentional line breaks and Windows newlines", () => {
    const { container } = render(<EventRichText content={"First line\r\nSecond line\r\n\r\nNext paragraph\rFinal line"} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
    expect(container.querySelectorAll("br")).toHaveLength(2);
    expect(container).toHaveTextContent("First line");
    expect(container).toHaveTextContent("Final line");
  });

  it("supports headings through level six without creating another page h1", () => {
    render(<EventRichText content={"# Main #\n## Second\n### Third\n#### Fourth\n##### Fifth\n###### Sixth"} headingLevel={2} />);
    expect(screen.getAllByRole("heading").map((heading) => heading.tagName)).toEqual(["H2", "H3", "H4", "H5", "H6", "H6"]);
    expect(screen.getByRole("heading", { name: "Main" })).toBeInTheDocument();
  });

  it("keeps indented continuation text with its list item", () => {
    render(<EventRichText content={"- Submit a video\n  Use an accessible link.\n- Include a title\nA final reminder."} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Submit a video Use an accessible link.");
    expect(screen.getByText("A final reminder.").closest("li")).toBeNull();
  });

  it("preserves inline code and readable links with safe new-tab attributes", () => {
    render(<EventRichText content={"Use `ElevenLabs API`. [Register](https://luma.com/jnwil7tv) or [email](mailto:events@example.com)."} />);
    expect(screen.getByText("ElevenLabs API").tagName).toBe("CODE");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "https://luma.com/jnwil7tv");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "email" })).toHaveAttribute("href", "mailto:events@example.com");
  });

  it.each(["javascript:alert", "JaVaScRiPt:alert", "data:text/html,hello", "vbscript:alert", "file:///tmp/secret", "java\tscript:alert"])("does not turn unsafe %s URLs into links", (url) => {
    render(<EventRichText content={`[Register](${url})`} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("renders HTML as literal text without injecting elements", () => {
    const { container } = render(<EventRichText content={'<script>alert(1)</script>\n<img src=x onerror="alert(1)">'} />);
    expect(container.querySelector("script, img")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });

  it("preserves long text and applies the shared wrapping/reading-width styles", () => {
    const content = `A${"b".repeat(400)}`;
    const { container } = render(<EventRichText content={content} className="text-sm" />);
    expect(container.firstElementChild).toHaveClass("event-rich-text", "min-w-0", "max-w-[70ch]", "text-sm");
    expect(container.textContent).toBe(content);
  });

  it("renders nothing for whitespace-only content", () => {
    const { container } = render(<EventRichText content={" \r\n\n  "} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens and closes the full details disclosure while keeping a semantic heading hierarchy", () => {
    const { container } = render(<ImportedEventDetails event={IMPACT_OSAKA} />);
    const summary = screen.getByText("Full event details").closest("summary")!;
    const disclosure = summary.closest("details")!;
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "Full event details", level: 2 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "One shared challenge", level: 3 })).toBeVisible();
    expect(container.textContent).not.toContain("###");
    fireEvent.click(summary);
    expect(disclosure).not.toHaveAttribute("open");
  });

  it("omits empty full-details panels without hiding the event's registration section", () => {
    render(<ImportedEventDetails event={{ ...IMPACT_OSAKA, sourceDescription: " \n " }} />);
    expect(screen.queryByText("Full event details")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Registration" })).toBeInTheDocument();
  });
});
