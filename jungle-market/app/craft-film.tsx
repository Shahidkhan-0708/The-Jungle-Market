'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { craftMedia, type FilmAsset } from './craft-media';

type Props = { variant: keyof typeof craftMedia; alt: string; poster?: string; className?: string };

export function CraftFilm({ variant, alt, poster, className = '' }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [mobile, setMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const asset: FilmAsset = craftMedia[variant === 'hero' && mobile ? 'mobile' : variant];
  const isStory = variant === 'story';
  const showVideo = ready && !reduceMotion && !failed && !!asset.src;

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const width = matchMedia('(max-width: 639px)');
    const sync = () => { setReduceMotion(motion.matches); setMobile(width.matches); setReady(true); };
    sync();
    motion.addEventListener('change', sync); width.addEventListener('change', sync);
    return () => { motion.removeEventListener('change', sync); width.removeEventListener('change', sync); };
  }, []);

  useEffect(() => { setFailed(false); setPlaying(false); }, [asset.src]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !showVideo || isStory) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || document.hidden) video.pause();
      else if (!userPaused.current) void video.play().catch(() => setPlaying(false));
    }, { threshold: 0.15 });
    const onVisibility = () => { if (document.hidden) video.pause(); };
    observer.observe(video); document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); video.pause(); };
  }, [showVideo, isStory, asset.src]);

  return <figure className={`craft-film craft-film--${variant} ${className}`} data-component="Craft film" data-media-state={showVideo ? 'video' : 'poster'}>
    {showVideo ? <video key={asset.src} ref={ref} src={asset.src!} poster={poster || asset.poster}
      aria-label={alt} muted playsInline autoPlay={!isStory} loop={!isStory} controls={isStory}
      preload={isStory ? 'none' : 'metadata'} onError={() => setFailed(true)}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
      Your browser cannot play this film. {alt}
    </video> : <img src={poster || asset.poster} alt={alt} loading={variant === 'hero' ? 'eager' : 'lazy'} />}
    {showVideo && !isStory && <button className="film-toggle" aria-label={playing ? 'Pause craft film' : 'Play craft film'}
      onClick={() => { const video = ref.current; if (!video) return; if (video.paused) { userPaused.current = false; void video.play().catch(() => setPlaying(false)); } else { userPaused.current = true; video.pause(); } }}>
      {playing ? <Pause size={16} /> : <Play size={16} />}<span>{playing ? 'Pause' : 'Play'}</span>
    </button>}
  </figure>;
}
