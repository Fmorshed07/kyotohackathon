import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Loader2, Plus, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebaseClient";
import { createCommunityChannel, saveCommunityChannel, validateCommunityChannelDraft, type CommunityChannel } from "@/lib/communityChannels";
import type { SessionUser } from "@/types/portal";
import { cn } from "@/lib/utils";

type CommunityChannelManagerProps = {
  user: SessionUser;
  channels: readonly CommunityChannel[];
  onSelectChannel: (id: string) => void;
  disabled?: boolean;
};

type ChannelForm = Omit<CommunityChannel, "id" | "order"> & { order: string };

function newChannelForm(channels: readonly CommunityChannel[]): ChannelForm {
  return {
    name: "", title: "", description: "", placeholder: "", section: "Community",
    type: "discussion", status: "open",
    order: String(Math.min(999, Math.max(-1, ...channels.map((channel) => channel.order)) + 1)),
  };
}

/** The account store is authoritative; a caller cannot grant admin UI with a prop. */
export function CommunityChannelManager(props: CommunityChannelManagerProps) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading || sessionUser?.role !== "admin" || props.user.role !== "admin" || sessionUser.id !== props.user.id) return null;
  return <ChannelManagerEditor key={sessionUser.id} {...props} />;
}

function ChannelManagerEditor({ user, channels, onSelectChannel, disabled = false }: CommunityChannelManagerProps) {
  const prefix = useId();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelForm>(() => newChannelForm(channels));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const mounted = useRef(false);
  const saveLock = useRef(false);
  const openRef = useRef(false);
  const scope = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const currentAccount = () => mounted.current && getFirebaseAuth().currentUser?.uid === user.id;
  const resetNew = () => {
    setEditingId(null);
    setForm(newChannelForm(channels));
    setError("");
    setSuccess("");
  };
  const changeOpen = (next: boolean) => {
    scope.current += 1;
    openRef.current = next;
    if (next) resetNew();
    setOpen(next);
  };
  const edit = (channel: CommunityChannel) => {
    if (busy || disabled) return;
    setEditingId(channel.id);
    const { id: _id, order, ...fields } = channel;
    setForm({ ...fields, order: String(order) });
    setError("");
    setSuccess("");
  };
  const update = <Key extends keyof ChannelForm>(key: Key, value: ChannelForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saveLock.current || disabled || !openRef.current) return;
    if (!currentAccount()) {
      setError("Your account changed. Reopen channel management with your admin account.");
      return;
    }
    let draft: Omit<CommunityChannel, "id">;
    try {
      draft = validateCommunityChannelDraft({
        ...form,
        title: form.title.trim() || `Welcome to #${form.name.trim()}.`,
        order: form.order.trim() ? Number(form.order) : 0,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check the channel details and try again.");
      return;
    }
    saveLock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    const savedScope = scope.current;
    try {
      if (editingId) {
        await saveCommunityChannel(getFirestoreDb(), user, { id: editingId, ...draft });
        if (currentAccount() && openRef.current && scope.current === savedScope) setSuccess("Channel updated.");
      } else {
        const id = await createCommunityChannel(getFirestoreDb(), user, draft);
        if (currentAccount() && openRef.current && scope.current === savedScope) {
          changeOpen(false);
          onSelectChannel(id);
        }
      }
    } catch (cause) {
      if (currentAccount() && openRef.current && scope.current === savedScope) {
        setError(cause instanceof Error ? cause.message : "Could not save this channel. Please try again.");
      }
    } finally {
      saveLock.current = false;
      if (currentAccount()) setBusy(false);
    }
  }

  const fieldClass = "space-y-1.5 text-left text-sm";
  const selectClass = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";
  const locked = busy || disabled;
  const sortedChannels = [...channels].sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" disabled={disabled} className="min-h-10 gap-2">
        <Settings2 className="h-4 w-4" aria-hidden="true" />Manage channels
      </Button>
    </DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-y-auto rounded-xl border-white/10 bg-slate-950 p-0 text-slate-100">
      <DialogHeader className="border-b border-white/10 px-5 py-5 pr-12 text-left sm:px-6">
        <DialogTitle>Manage channels</DialogTitle>
        <DialogDescription className="max-w-xl text-slate-400">Create spaces for your community and update how each channel works. Archived channels keep their message history.</DialogDescription>
      </DialogHeader>
      <div className="grid min-w-0 gap-0 md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-white/10 bg-white/[0.02] p-4 md:border-b-0 md:border-r">
          <Button type="button" variant={editingId ? "outline" : "secondary"} disabled={locked} onClick={resetNew} className="mb-4 w-full justify-start gap-2" aria-pressed={!editingId}>
            <Plus className="h-4 w-4" aria-hidden="true" />New channel
          </Button>
          <nav aria-label="Existing channels" className="max-h-44 space-y-2 overflow-y-auto md:max-h-[55dvh]">
            {sortedChannels.length === 0 && <p className="text-sm text-slate-400">No channels yet. Create the first one.</p>}
            {sortedChannels.map((channel) => <button key={channel.id} type="button" disabled={locked} aria-label={`Edit #${channel.name}`} aria-pressed={editingId === channel.id} onClick={() => edit(channel)}
              className={cn("block w-full min-w-0 rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-50", editingId === channel.id ? "border-sky-400/40 bg-sky-400/10" : "border-white/10 hover:bg-white/5")}>
              <span className="block break-words font-medium">#{channel.name}</span>
              <span className="mt-1 block break-words text-xs text-slate-400">{channel.section} · {channel.type} · {channel.status}</span>
            </button>)}
          </nav>
        </aside>
        <form onSubmit={(event) => void save(event)} noValidate aria-label={editingId ? "Edit channel" : "Create channel"} className="min-w-0 space-y-4 p-5 sm:p-6">
          <h3 className="text-lg font-semibold">{editingId ? `Edit #${form.name}` : "New channel"}</h3>
          <fieldset disabled={locked} className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={fieldClass}><label htmlFor={`${prefix}-name`}>Name</label><Input id={`${prefix}-name`} value={form.name} maxLength={48} autoComplete="off" placeholder="event-updates" onChange={(event) => update("name", event.target.value)} /></div>
              <div className={fieldClass}><label htmlFor={`${prefix}-section`}>Section</label><Input id={`${prefix}-section`} value={form.section} maxLength={48} placeholder="Community" onChange={(event) => update("section", event.target.value)} /></div>
            </div>
            <div className={fieldClass}><label htmlFor={`${prefix}-description`}>Description</label><Textarea id={`${prefix}-description`} value={form.description} maxLength={300} rows={2} placeholder="What belongs in this channel?" onChange={(event) => update("description", event.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={fieldClass}><label htmlFor={`${prefix}-type`}>Channel type</label><select id={`${prefix}-type`} value={form.type} onChange={(event) => update("type", event.target.value as CommunityChannel["type"])} className={selectClass}><option value="discussion">Discussion</option><option value="announcement">Announcement</option></select></div>
              <div className={fieldClass}><label htmlFor={`${prefix}-status`}>Posting status</label><select id={`${prefix}-status`} value={form.status} onChange={(event) => update("status", event.target.value as CommunityChannel["status"])} className={selectClass}><option value="open">Open</option><option value="closed">Closed</option><option value="archived">Archived</option></select></div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">Announcements accept posts from admins only. Closed and archived channels keep existing messages and pause new posts.</p>
            <div className={fieldClass}><label htmlFor={`${prefix}-order`}>Order (optional)</label><Input id={`${prefix}-order`} type="number" min={0} max={999} step={1} value={form.order} onChange={(event) => update("order", event.target.value)} className="max-w-28" /><p className="text-xs text-slate-400">0–999. Lower numbers appear first.</p></div>
            <details className="rounded-lg border border-white/10 p-3">
              <summary className="cursor-pointer text-sm font-medium">Conversation details</summary>
              <div className="mt-4 space-y-4">
                <div className={fieldClass}><label htmlFor={`${prefix}-title`}>Welcome title (optional)</label><Input id={`${prefix}-title`} value={form.title} maxLength={120} onChange={(event) => update("title", event.target.value)} /><p className="text-xs text-slate-400">Leave blank to welcome members by channel name.</p></div>
                <div className={fieldClass}><label htmlFor={`${prefix}-placeholder`}>Message hint (optional)</label><Input id={`${prefix}-placeholder`} value={form.placeholder} maxLength={200} onChange={(event) => update("placeholder", event.target.value)} /></div>
              </div>
            </details>
          </fieldset>
          {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          {success && <p role="status" className="text-sm text-sky-300">{success}</p>}
          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Button type="submit" disabled={locked} className="min-h-11 gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{busy ? "Saving channel…" : editingId ? "Save changes" : "Create channel"}</Button>
            {editingId && <Button type="button" variant="outline" disabled={locked} onClick={() => {
              if (!currentAccount()) return;
              changeOpen(false);
              onSelectChannel(editingId);
            }} className="min-h-11 gap-2">Open channel<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Button>}
          </div>
        </form>
      </div>
    </DialogContent>
  </Dialog>;
}
