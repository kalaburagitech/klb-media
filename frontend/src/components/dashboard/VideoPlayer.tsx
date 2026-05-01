'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
  fallbackSrc?: string;
  poster?: string;
  className?: string;
}

export default function VideoPlayer({ src, fallbackSrc, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback) return;

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('HLS fatal error, falling back to original source:', data);
          setUseFallback(true);
          hls.destroy();
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && src.endsWith('.m3u8')) {
      video.src = src;
      video.onerror = () => {
        console.warn('Native HLS error, falling back');
        setUseFallback(true);
      };
    } else {
      setUseFallback(true);
    }
  }, [src, useFallback]);

  useEffect(() => {
    if (useFallback && videoRef.current && fallbackSrc) {
      videoRef.current.src = fallbackSrc;
    }
  }, [useFallback, fallbackSrc]);

  return (
    <video 
      ref={videoRef} 
      poster={poster} 
      controls 
      playsInline
      className={className}
    >
      Your browser does not support the video tag.
    </video>
  );
}
