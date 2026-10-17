import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, Hash, Send, Trash2, WifiOff, LockKeyhole, Megaphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import {
  CHAT_COOLDOWN_MS, CHAT_HISTORY_LIMIT, CHAT_MESSAGE_LIMIT, communityChatError,
  deleteCommunityMessage, sendCommunityMessage, subscribeToCommunityMessages,
  type CommunityMessage,
} from "@/lib/communityChat";
import { canPostCommunityMessage, type CommunityChannel } from "@/lib/communityChannels";
import type { SessionUser } from "@/types/portal";

function MessageBody({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return part;
    return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{part}</a>;
  })}</>;
}

/** Mount with an account/channel key so drafts and pending callbacks never cross rooms. */
export function CommunityChat({ user, channel, settingsReady = true }: { user: SessionUser; channel: CommunityChannel; settingsReady?: boolean }) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(true);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [connectionError, setConnectionError] = useState("");
  const [actionError, setActionError] = useState("");
  const [retry, setRetry] = useState(0);
  const [sending, setSending] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newMessages, setNewMessages] = useState(false);
  const active = useRef(true);
  const sendingRef = useRef(false);
  const deletingRef = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout>>();
  const viewport = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    active.current = true;
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      active.current = false;
      clearTimeout(cooldownTimer.current);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setConnectionError("");
    setFromCache(true);
    const unsubscribe = subscribeToCommunityMessages(getFirestoreDb(), channel.id, (next, cached) => {
      if (!current) return;
      setMessages(next);
      setFromCache(cached);
      setLoading(false);
    }, error => {
      if (!current) return;
      setMessages([]);
      setLoading(false);
      setConnectionError(communityChatError(error));
    });
    return () => { current = false; unsubscribe(); };
  }, [channel.id, user.id, retry]);

  useEffect(() => {
    if (!lastMessageId) return;
    if (nearBottom.current) {
      if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
      setNewMessages(false);
    } else {
      setNewMessages(true);
    }
  }, [lastMessageId]);

  const connected = !loading && !connectionError && !fromCache && online;
  const canPost = settingsReady && canPostCommunityMessage(user, channel);
  const canModerate = user.role === "admin";
  const canRemove = (message: CommunityMessage) => message.userId === user.id || canModerate;
  const postingNotice = !settingsReady ? "Syncing channel settings. Posting will be available when connected."
    : channel.status === "archived" ? "This channel is archived. You can still read its history."
    : channel.status === "closed" ? "Posting is closed in this channel. An admin can reopen it."
    : "Only admins can post announcements. Updates are visible to every member.";
  const filtered = messages.filter(message => `${message.authorName} ${message.body}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const isCurrentUser = () => active.current && getFirebaseAuth().currentUser?.uid === user.id;

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!canPost || sendingRef.current || coolingDown || !connected || !draft.trim() || draft.trim().length > CHAT_MESSAGE_LIMIT) return;
    if (!isCurrentUser()) { setActionError("Your account changed. Sign in again before posting."); return; }
    sendingRef.current = true;
    setSending(true);
    setActionError("");
    try {
      await sendCommunityMessage(getFirestoreDb(), channel.id, user, draft);
      if (!isCurrentUser()) return;
      setDraft("");
      setCoolingDown(true);
      nearBottom.current = true;
      if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
      cooldownTimer.current = setTimeout(() => setCoolingDown(false), CHAT_COOLDOWN_MS);
    } catch (error) {
      if (isCurrentUser()) setActionError(communityChatError(error));
    } finally {
      sendingRef.current = false;
      if (isCurrentUser()) setSending(false);
    }
  }

  async function removeMessage() {
    const target = messages.find((message) => message.id === deleteTarget);
    if (!deleteTarget || !target || !canRemove(target) || deletingRef.current || !connected || !isCurrentUser()) return;
    deletingRef.current = true;
    setDeleting(true);
    setActionError("");
    try {
      await deleteCommunityMessage(getFirestoreDb(), channel.id, deleteTarget);
      if (isCurrentUser()) setDeleteTarget(null);
    } catch (error) {
      if (isCurrentUser()) setActionError(communityChatError(error));
    } finally {
      deletingRef.current = false;
      if (isCurrentUser()) setDeleting(false);
    }
  }

  return <section className="flex min-w-0 flex-col" aria-label={`#${channel.name} chat`}>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4 sm:p-6">
      <div className="min-w-0">
        <h2 className="flex flex-wrap items-center gap-2 font-display text-xl">{channel.type === "announcement" ? <Megaphone className="h-5 w-5 text-primary" aria-hidden /> : <Hash className="h-5 w-5 text-primary" aria-hidden />}{channel.name}
          {channel.status !== "open" && <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{channel.status}</span>}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{channel.description}</p>
      </div>
      <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-muted-foreground"}`} aria-hidden="true" />
        {connectionError ? "Connection interrupted" : !online ? "Offline" : loading || fromCache ? "Connecting…" : "Connected"}
      </span>
    </header>
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
      <Input aria-label="Search recent messages" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search this conversation" className="h-9 max-w-xs bg-transparent" />
      <span className="text-xs text-muted-foreground">Latest {CHAT_HISTORY_LIMIT} messages · visible to all members</span>
    </div>
    {connectionError && <div role="alert" className="border-b border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p>{connectionError}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => setRetry(value => value + 1)}>Reconnect</Button>
    </div>}
    {!online && <p role="status" className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground"><WifiOff className="h-4 w-4" aria-hidden="true" />You're offline. Reconnect to send messages.</p>}
    <div ref={viewport} onScroll={() => {
      const box = viewport.current;
      nearBottom.current = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      if (nearBottom.current) setNewMessages(false);
    }} className="h-[min(52svh,600px)] min-h-72 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" role="log" aria-label={`Messages in ${channel.name}`} aria-relevant="additions" aria-busy={loading}>
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading conversation…</p> : !filtered.length && !connectionError ? <div className="mx-auto max-w-md py-14 text-center">
        <Hash className="mx-auto h-9 w-9 text-primary/70" aria-hidden="true" />
        <h3 className="mt-5 font-display text-xl">{search.trim() ? "No matching messages." : channel.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{search.trim() ? "Search covers the most recent messages in this room." : "Be the first to say hello. This space belongs to the whole community."}</p>
      </div> : filtered.map(message => <article key={message.id} className="group flex min-w-0 gap-3 py-4" aria-label={`Message from ${message.authorName}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm text-primary" aria-hidden="true">{message.authorName.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="break-words text-sm font-medium" title={`Member ${message.userId}`}>{message.authorName}{message.userId === user.id ? " (you)" : ""}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground" title="Role at the time of posting">{message.authorRole}</span>
            <time className="text-xs text-muted-foreground" dateTime={message.createdAt ? new Date(message.createdAt).toISOString() : undefined}>{message.pending ? "Sending…" : message.createdAt ? new Date(message.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</time>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]"><MessageBody text={message.body} /></p>
          {deleteTarget === message.id && canRemove(message) && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-xs">
            <span>{message.userId === user.id ? "Delete your message permanently?" : "Remove this message from the community permanently?"}</span>
            <Button size="sm" variant="destructive" disabled={deleting || !connected} onClick={() => void removeMessage()}>{deleting ? "Deleting…" : "Confirm delete"}</Button>
            <Button size="sm" variant="ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button>
          </div>}
        </div>
        {canRemove(message) && !message.pending && <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground" aria-label={`${message.userId === user.id ? "Delete" : "Remove"} message from ${message.authorName}`} onClick={() => setDeleteTarget(message.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>}
      </article>)}
    </div>
    {newMessages && <Button variant="secondary" size="sm" className="mx-auto mb-3 gap-2" onClick={() => {
      if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
      nearBottom.current = true;
      setNewMessages(false);
    }}><ArrowDown className="h-4 w-4" aria-hidden="true" />Jump to latest</Button>}
    {!canPost && <div role="note" className="flex items-start gap-3 border-t border-border bg-secondary/20 p-5 text-sm text-muted-foreground">{channel.type === "announcement" && channel.status === "open" && settingsReady ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden /> : <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />}<p>{postingNotice}</p></div>}
    {canPost && <form className="border-t border-border p-4 sm:p-6" onSubmit={event => void send(event)} aria-label={channel.type === "announcement" ? "Post an announcement" : "Send a community message"}>
      <label htmlFor="community-message" className="sr-only">Message #{channel.name}</label>
      <Textarea id="community-message" value={draft} onChange={event => setDraft(event.target.value)} placeholder={channel.placeholder} rows={3} maxLength={CHAT_MESSAGE_LIMIT} disabled={sending} aria-describedby="community-chat-guidance" onKeyDown={event => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }} />
      {actionError && <p role="alert" className="mt-3 text-sm text-destructive">{actionError}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p id="community-chat-guidance" className="text-xs leading-relaxed text-muted-foreground">Be kind. No private scores or personal details.<br />Shift + Enter for a new line · {draft.length}/{CHAT_MESSAGE_LIMIT}</p>
        <Button type="submit" disabled={!connected || sending || coolingDown || !draft.trim()} className="shrink-0 gap-2"><Send className="h-4 w-4" aria-hidden="true" />{sending ? "Sending…" : coolingDown ? "Wait a moment" : channel.type === "announcement" ? "Post announcement" : "Send"}</Button>
      </div>
    </form>}
  </section>;
}
