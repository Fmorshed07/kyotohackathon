import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Film, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectFeedVideo, projectFeedEmbedUrl, projectFeedHttpUrl } from "@/lib/projectFeedMedia";

const FeedVideoEmbed = forwardRef<HTMLIFrameElement, { title: string; src: string; onLoad: () => void; onError: () => void }>(function FeedVideoEmbed({ title, src, onLoad, onError }, ref) {
  // Keep a mounted player intact while playback and volume change through its API.
  const [initialSrc] = useState(src);
  return <iframe ref={ref} title={title} src={initialSrc} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={onLoad} onError={onError} />;
});

export function ProjectFeedMedia({
  title,
  videoUrl,
  imageUrl,
  autoplayEnabled,
  reducedMotion,
}: {
  title: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
  autoplayEnabled: boolean;
  reducedMotion: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const video = useMemo(() => getProjectFeedVideo(videoUrl), [videoUrl]);
  const originalUrl = projectFeedHttpUrl(videoUrl);
  const posterUrl = projectFeedHttpUrl(imageUrl);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== "hidden");
  const [muted, setMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [manuallyStarted, setManuallyStarted] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);
  const active = inView && pageVisible;
  const supportsPlaybackControls = Boolean(video && ["native", "youtube", "vimeo"].includes(video.kind));
  const wantsPlayback = supportsPlaybackControls && !userPaused && (manuallyStarted || autoplayEnabled);
  const shouldPlay = active && wantsPlayback && !failed;
  const embedOrigin = video?.kind === "youtube" ? "https://www.youtube-nocookie.com" : "https://player.vimeo.com";
  const embedSrc = useMemo(() => video ? projectFeedEmbedUrl(video, {
    autoplay: wantsPlayback,
    muted,
    origin: window.location.origin,
  }) : "", [muted, video, wantsPlayback]);

  useEffect(() => {
    setFailed(false);
    setImageFailed(false);
    setPlaybackBlocked(false);
    setUserPaused(false);
    setManuallyStarted(false);
    setMuted(true);
  }, [videoUrl, imageUrl]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
      observer.observe(element);
      return () => observer.disconnect();
    }
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      setInView(rect.height > 0 && visibleHeight / rect.height >= 0.5);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!active) {
      setMuted(true);
      setEmbedReady(false);
    }
  }, [active]);

  const sendEmbedCommand = useCallback((playing: boolean, isMuted: boolean) => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame || !video || !["youtube", "vimeo"].includes(video.kind)) return;
    if (video.kind === "youtube") {
      frame.postMessage(JSON.stringify({ event: "command", func: isMuted ? "mute" : "unMute", args: [] }), embedOrigin);
      frame.postMessage(JSON.stringify({ event: "command", func: playing ? "playVideo" : "pauseVideo", args: [] }), embedOrigin);
    } else if (video.kind === "vimeo") {
      frame.postMessage({ method: "setVolume", value: isMuted ? 0 : 1 }, embedOrigin);
      frame.postMessage({ method: playing ? "play" : "pause" }, embedOrigin);
    }
  }, [embedOrigin, video]);

  useEffect(() => {
    const element = videoRef.current;
    if (video?.kind !== "native" || !element) return;
    if (!shouldPlay) {
      element.pause();
      return;
    }
    let cancelled = false;
    const pendingPlay = element.play();
    pendingPlay?.then(() => {
      if (!cancelled) setPlaybackBlocked(false);
    }).catch(() => {
      if (!cancelled) setPlaybackBlocked(true);
    });
    return () => { cancelled = true; element.pause(); };
  }, [shouldPlay, video]);

  useEffect(() => {
    if (active && embedReady) sendEmbedCommand(shouldPlay, muted);
  }, [active, embedReady, muted, sendEmbedCommand, shouldPlay]);

  useEffect(() => {
    if (!active || !video || !["youtube", "vimeo"].includes(video.kind)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== embedOrigin) return;
      let data: Record<string, unknown>;
      try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (!data || typeof data !== "object") return;
      if (data.event === "onReady" || data.event === "ready") setEmbedReady(true);
      if (data.event === "onError" || (data.event === "error" && (data.data as { method?: string })?.method !== "play")) setFailed(true);
      if (data.event === "error" && (data.data as { method?: string })?.method === "play") setPlaybackBlocked(true);
      if (data.event === "play" || (data.event === "onStateChange" && data.info === 1)) setPlaybackBlocked(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [active, embedOrigin, video]);

  const onEmbedLoad = () => {
    const frame = iframeRef.current?.contentWindow;
    if (video?.kind === "youtube" && frame) {
      frame.postMessage(JSON.stringify({ event: "listening", id: title }), embedOrigin);
      ["onReady", "onStateChange", "onError"].forEach((event) => frame.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: [event] }), embedOrigin));
    }
    setEmbedReady(true);
    sendEmbedCommand(shouldPlay, muted);
  };

  const togglePlayback = () => {
    if (shouldPlay && !playbackBlocked) {
      setUserPaused(true);
      videoRef.current?.pause();
      sendEmbedCommand(false, muted);
    } else {
      if (!active) containerRef.current?.scrollIntoView?.({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
      setUserPaused(false);
      setManuallyStarted(true);
      setPlaybackBlocked(false);
      // Invoke play within the gesture so browsers can allow manual playback.
      if (active) {
        videoRef.current?.play()?.catch(() => setPlaybackBlocked(true));
        sendEmbedCommand(true, muted);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden border-y border-border bg-black">
      <div className="relative aspect-video overflow-hidden bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.30),transparent_65%),linear-gradient(145deg,#142131,#070c16)]">
        {posterUrl && !imageFailed ? <img src={posterUrl} alt={`${title} project preview`} loading="lazy" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover" /> : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5"><Film className="h-7 w-7 text-primary" aria-hidden /></span>
            <p className="max-w-sm font-display text-2xl font-semibold text-white">{title}</p>
          </div>
        )}
        {video && !failed ? video.kind === "native" ? (
          <video ref={videoRef} src={video.url} poster={posterUrl || undefined} muted={muted} playsInline loop controls preload="metadata" aria-label={`${title} demo video`} onError={() => setFailed(true)} onPlay={() => {
            setPlaybackBlocked(false);
            if (!active) {
              videoRef.current?.pause();
              return;
            }
            if (!wantsPlayback) { setUserPaused(false); setManuallyStarted(true); }
          }} onPause={() => { if (shouldPlay) setUserPaused(true); }} onVolumeChange={() => { if (videoRef.current) setMuted(videoRef.current.muted || videoRef.current.volume === 0); }} className="absolute inset-0 h-full w-full object-contain" />
        ) : active ? (
          <FeedVideoEmbed
            key={video.url}
            ref={iframeRef}
            title={`${title} demo video`}
            src={embedSrc}
            onLoad={onEmbedLoad}
            onError={() => setFailed(true)}
          />
        ) : null : (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-5 pb-5 pt-12">
            <p className="text-sm text-white/85">{failed ? "This video could not be played here." : originalUrl ? "Open this demo to watch it on its original site." : "A closer look at this project."}</p>
            {originalUrl ? <Button asChild variant="secondary" size="sm" className="mt-3 gap-2"><a href={originalUrl} target="_blank" rel="noreferrer">Watch original demo <ArrowUpRight className="h-3.5 w-3.5" /></a></Button> : null}
          </div>
        )}
        {video && !failed && !active ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15"><span className="rounded-full border border-white/25 bg-black/50 p-4"><Play className="h-6 w-6 fill-white text-white" aria-hidden /></span></div> : null}
      </div>
      {video && !failed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-black px-3 py-2 text-xs text-white/70 sm:px-4">
          <span>{!supportsPlaybackControls ? "Press play in the preview · provider controls" : playbackBlocked ? "Press play to watch" : reducedMotion && !manuallyStarted && !autoplayEnabled ? "Press play to watch" : userPaused || !wantsPlayback ? "Playback paused" : manuallyStarted ? "Playing demo" : "Auto-playing · starts muted"}</span>
          <div className="flex items-center gap-1">
            {supportsPlaybackControls ? <><Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs text-white hover:bg-white/10 hover:text-white" aria-label={`${shouldPlay && !playbackBlocked ? "Pause" : "Play"} ${title} video`} onClick={togglePlayback}>
              {shouldPlay && !playbackBlocked ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}{shouldPlay && !playbackBlocked ? "Pause" : "Play"}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs text-white hover:bg-white/10 hover:text-white" aria-label={`${muted ? "Unmute" : "Mute"} ${title} video`} onClick={() => setMuted((value) => !value)}>
              {muted ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}{muted ? "Sound off" : "Sound on"}
            </Button></> : null}
            <a href={originalUrl} target="_blank" rel="noreferrer" aria-label={`Open ${title} original video`} className="rounded p-2 text-white hover:bg-white/10"><ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
