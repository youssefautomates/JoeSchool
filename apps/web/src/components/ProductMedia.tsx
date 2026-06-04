"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductMediaProps {
  image_url?: string | null;
  video_url?: string | null;
  title: string;
  className?: string;
  aspectRatio?: string;
  isHovered?: boolean;
  staticOnly?: boolean;
  priority?: boolean;
}

export function ProductMedia({ 
  image_url, 
  video_url, 
  title, 
  className,
  aspectRatio = "aspect-video",
  isHovered = false,
  staticOnly = false,
  priority = false
}: ProductMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to stop video when not in viewport
  useEffect(() => {
    if (staticOnly) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [staticOnly]);

  // Control playback based on visibility
  useEffect(() => {
    if (!videoRef.current || staticOnly) return;

    if (isInView) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked until user interaction in some browsers
      });
    } else {
      videoRef.current.pause();
    }
  }, [isInView, staticOnly]);

  const isYouTube = video_url?.includes("youtube.com") || video_url?.includes("youtu.be");
  const ytId = isYouTube ? (video_url?.split('v=')[1]?.split('&')[0] || video_url?.split('/').pop()) : null;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden bg-zinc-950 flex items-center justify-center transition-all duration-500 aspect-video",
        aspectRatio,
        isHovered && !staticOnly && "brightness-110",
        className
      )}
    >
      {/* Premium Glow Overlay */}
      <div className={cn(
        "absolute inset-0 z-10 pointer-events-none transition-opacity duration-500",
        isHovered && !staticOnly ? "opacity-30" : "opacity-0",
        "bg-gradient-to-t from-rose-600/20 to-transparent"
      )} />

      {staticOnly && image_url ? (
        <Image
          src={image_url}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover object-center transition-transform duration-700"
          style={{ transform: isHovered ? 'scale(1.02)' : 'scale(1)' }}
        />
      ) : video_url && !isYouTube ? (
        <video
          ref={videoRef}
          src={`${video_url}#t=0.1`}
          className="w-full h-full object-cover object-center transition-transform duration-700"
          style={{ transform: isHovered && !staticOnly ? 'scale(1.02)' : 'scale(1)' }}
          muted
          loop={!staticOnly}
          playsInline
          preload="metadata"
          autoPlay={false}
        />
      ) : isYouTube && ytId ? (
        <div className="relative w-full h-full">
          <Image
            src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover object-center transition-transform duration-700"
            style={{ transform: isHovered ? 'scale(1.02)' : 'scale(1)' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle className={cn(
              "w-12 h-12 transition-all duration-300",
              isHovered ? "text-rose-500 scale-110" : "text-white/40"
            )} />
          </div>
        </div>
      ) : image_url ? (
        <Image
          src={image_url}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover object-center transition-transform duration-700"
          style={{ transform: isHovered ? 'scale(1.02)' : 'scale(1)' }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] text-zinc-800">
          <PlayCircle className="w-12 h-12 mb-2 opacity-20" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-20">No Preview</span>
        </div>
      )}

      {/* Subtle bottom gradient for card content readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/80 via-transparent to-transparent opacity-60" />
    </div>
  );
}
