import { useEffect, useRef } from "react";

const GLOBE_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
const GLOBE_POSTER = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";
const FADE_SECONDS = 0.9;

interface ImmersiveGlobeProps {
  running: boolean;
  reduced: boolean;
}

/** Two copies hide the discontinuity between the clip's first and last frame. */
const ImmersiveGlobe = ({ running, reduced }: ImmersiveGlobeProps) => {
  const firstVideo = useRef<HTMLVideoElement>(null);
  const secondVideo = useRef<HTMLVideoElement>(null);
  const activeIndex = useRef(0);

  useEffect(() => {
    const first = firstVideo.current;
    const second = secondVideo.current;
    if (!first || !second) return;

    const videos = [first, second];
    let disposed = false;
    let swapping = false;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;

    const rewind = (video: HTMLVideoElement) => {
      // Setting currentTime can throw before metadata is available in Safari.
      try {
        video.currentTime = 0;
      } catch {
        // The native poster remains available while the source is loading.
      }
    };

    const setActive = (index: number) => {
      activeIndex.current = index;
      videos.forEach((video, videoIndex) => {
        video.classList.toggle("is-active", videoIndex === index);
      });
    };

    videos.forEach((video) => {
      video.pause();
      video.classList.remove("is-outgoing");
    });
    if (reduced) {
      setActive(0);
      videos.forEach(rewind);
    } else {
      setActive(activeIndex.current);
      rewind(videos[1 - activeIndex.current]);
    }

    const play = async (video: HTMLVideoElement) => {
      try {
        await video.play();
        return !disposed;
      } catch {
        // Autoplay policies and unavailable media should never block the page.
        return false;
      }
    };

    const tick = async () => {
      const outgoing = videos[activeIndex.current];
      if (
        disposed || swapping || outgoing.paused ||
        !Number.isFinite(outgoing.duration) || outgoing.duration <= 0 ||
        outgoing.duration - outgoing.currentTime > FADE_SECONDS
      ) return;

      swapping = true;
      const incomingIndex = 1 - activeIndex.current;
      const incoming = videos[incomingIndex];
      rewind(incoming);

      // Keep the current frame visible if the incoming copy cannot start.
      if (!(await play(incoming))) {
        swapping = false;
        return;
      }

      // Keep a fully opaque base under the incoming fade. Fading both stacked
      // copies would expose 25% of the dark background at the midpoint.
      outgoing.classList.add("is-outgoing");
      setActive(incomingIndex);
      fadeTimer = setTimeout(() => {
        outgoing.pause();
        outgoing.classList.remove("is-outgoing");
        rewind(outgoing);
        swapping = false;
      }, FADE_SECONDS * 1000 + 100);
    };

    if (running && !reduced) {
      void play(videos[activeIndex.current]);
      videos.forEach((video) => video.addEventListener("timeupdate", tick));
    }

    return () => {
      disposed = true;
      clearTimeout(fadeTimer);
      videos.forEach((video) => {
        video.removeEventListener("timeupdate", tick);
        video.pause();
      });
    };
  }, [running, reduced]);

  return (
    <div className="immersive-globe" aria-hidden="true" data-motion={reduced ? "reduced" : running ? "playing" : "paused"}>
      {[firstVideo, secondVideo].map((ref, index) => (
        <video
          key={index}
          ref={ref}
          className={`immersive-globe-video${index === 0 ? " is-active" : ""}`}
          muted
          loop
          playsInline
          preload={reduced ? "none" : "auto"}
          disablePictureInPicture
          aria-hidden="true"
          poster={GLOBE_POSTER}
          tabIndex={-1}
        >
          <source src={GLOBE_VIDEO} type="video/mp4" />
        </video>
      ))}
    </div>
  );
};

export default ImmersiveGlobe;
