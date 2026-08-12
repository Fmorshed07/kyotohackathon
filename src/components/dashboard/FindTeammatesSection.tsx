import { useMemo, useState } from "react";
import { Mail, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sectionClass } from "@/components/dashboard/DashboardLayout";
import type { TeammatePost } from "@/types/portal";

export type FindTeammatesSectionProps = {
  posts: TeammatePost[];
  isLoading?: boolean;
  isReadOnly?: boolean;
  currentUserId: string;
  defaultName: string;
  defaultEmail: string;
  isSaving?: boolean;
  message?: string | null;
  onCreatePost: (input: {
    looking_for: string;
    message: string;
    skills: string;
    author_name: string;
    author_email: string;
  }) => Promise<void>;
  onClosePost: (postId: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
};

export function FindTeammatesSection({
  posts,
  isLoading = false,
  isReadOnly = false,
  currentUserId,
  defaultName,
  defaultEmail,
  isSaving = false,
  message = null,
  onCreatePost,
  onClosePost,
  onDeletePost,
}: FindTeammatesSectionProps) {
  const [lookingFor, setLookingFor] = useState("");
  const [postMessage, setPostMessage] = useState("");
  const [skills, setSkills] = useState("");
  const [authorName, setAuthorName] = useState(defaultName);
  const [authorEmail, setAuthorEmail] = useState(defaultEmail);
  const [filter, setFilter] = useState("");

  const filteredPosts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) =>
      [post.looking_for, post.message, post.skills, post.author_name, post.author_email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    );
  }, [filter, posts]);

  const handleSubmit = async () => {
    await onCreatePost({
      looking_for: lookingFor,
      message: postMessage,
      skills,
      author_name: authorName || defaultName,
      author_email: authorEmail || defaultEmail,
    });
    setLookingFor("");
    setPostMessage("");
    setSkills("");
  };

  return (
    <section
      className={sectionClass}
      id="find-teammates"
      aria-labelledby="find-teammates-heading"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dash-icon-chip" aria-hidden>
            <UserPlus className="h-4 w-4" />
          </span>
          <div>
            <p className="dash-eyebrow">Team matching</p>
            <h2 id="find-teammates-heading" className="dash-title">
              Find teammates
            </h2>
            <p className="dash-subtitle">
              Post who you need. Every participant sees open posts with contact email.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="uppercase tracking-[0.12em]">
          {posts.length} open
        </Badge>
      </div>

      {!isReadOnly ? (
        <div className="mb-6 space-y-4 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
          <p className="dash-eyebrow">Post a request</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="dash-field-label">Your name</label>
              <Input
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                placeholder="Name shown on the board"
              />
            </div>
            <div className="space-y-2">
              <label className="dash-field-label">Contact email</label>
              <Input
                type="email"
                value={authorEmail}
                onChange={(event) => setAuthorEmail(event.target.value)}
                placeholder="teammates@email.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="dash-field-label">Looking for</label>
            <Input
              value={lookingFor}
              onChange={(event) => setLookingFor(event.target.value)}
              placeholder="Designer, ML engineer, domain expert…"
            />
          </div>
          <div className="space-y-2">
            <label className="dash-field-label">What you bring (optional)</label>
            <Input
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="React, product, robotics…"
            />
          </div>
          <div className="space-y-2">
            <label className="dash-field-label">Short message</label>
            <Textarea
              value={postMessage}
              onChange={(event) => setPostMessage(event.target.value)}
              placeholder="Idea, timezone, and how people should reach you."
              rows={3}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={isSaving || !lookingFor.trim() || !(authorEmail || defaultEmail).trim()}
              onClick={() => void handleSubmit()}
            >
              {isSaving ? "Posting…" : "Publish request"}
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          This past event is view-only. Browse open requests below.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search roles, skills, or email…"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading teammate requests…</p>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-background/30 px-4 py-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/70" />
          <p className="mt-3 text-sm text-muted-foreground">
            No open teammate requests yet. Be the first to post.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredPosts.map((post) => {
            const isOwn = post.user_id === currentUserId;
            return (
              <article
                key={post.id}
                className="rounded-xl border border-white/10 bg-background/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {post.looking_for}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {post.author_name || "Participant"}
                      {isOwn ? " · your post" : ""}
                    </p>
                  </div>
                  {isOwn ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => void onClosePost(post.id)}
                      >
                        Close
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={isSaving}
                        aria-label="Delete post"
                        onClick={() => void onDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                {post.message ? (
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">{post.message}</p>
                ) : null}
                {post.skills ? (
                  <p className="mt-2 text-xs text-muted-foreground">Brings: {post.skills}</p>
                ) : null}
                <a
                  href={`mailto:${post.author_email}?subject=${encodeURIComponent(
                    `Teammate request: ${post.looking_for}`
                  )}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {post.author_email}
                </a>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
