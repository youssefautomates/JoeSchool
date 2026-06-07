"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, Loader2, RotateCcw, RotateCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomVideoPlayerProps {
  src: string;
  className?: string;
}

export function CustomVideoPlayer({ src, className }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  // Center click feedback flash
  const [centerFlash, setCenterFlash] = useState<"play" | "pause" | null>(null);
  const centerFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger autoplay muted on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.loop = true; // Loop when in autoplay/muted preview mode
    
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.log("Autoplay was prevented:", err);
        });
    }
  }, [src]);

  // Handle controls visibility
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && hasInteracted) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSpeedMenu) {
          setShowControls(false);
        }
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, hasInteracted, showSpeedMenu]);

  // Play / Pause toggle
  const togglePlay = (e?: React.MouseEvent | React.TouchEvent, showFlash = false) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      if (showFlash) triggerCenterFlash("pause");
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
      if (showFlash) triggerCenterFlash("play");
    }
    resetControlsTimeout();
  };

  // Trigger center flash icon feedback
  const triggerCenterFlash = (type: "play" | "pause") => {
    if (centerFlashTimeoutRef.current) clearTimeout(centerFlashTimeoutRef.current);
    setCenterFlash(type);
    centerFlashTimeoutRef.current = setTimeout(() => setCenterFlash(null), 700);
  };

  // Center area click handler (mouse + touch)
  const handleCenterClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!hasInteracted) return; // pre-interaction is handled by overlay
    togglePlay(undefined, true);
    resetControlsTimeout();
  };

  // Click to unmute and start from beginning
  const handleUnmuteAndStart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    // Unmute
    video.muted = false;
    setIsMuted(false);
    
    // Disable looping once the user unmutes
    video.loop = false;
    
    // Reset to beginning
    video.currentTime = 0;
    setCurrentTime(0);
    
    // Set interaction state
    setHasInteracted(true);
    
    // Play with sound
    video.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {});

    resetControlsTimeout();
  };

  // Rewind 10 seconds
  const handleRewind10 = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
    resetControlsTimeout();
  };

  // Forward 10 seconds
  const handleForward10 = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration, video.currentTime + 10);
    resetControlsTimeout();
  };

  // Volume slider change
  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    video.muted = val === 0;
    setIsMuted(val === 0);
    resetControlsTimeout();
  };

  // Toggle Mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
    resetControlsTimeout();
  };

  // Seek bar change
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    resetControlsTimeout();
  };

  // Toggle Fullscreen
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
    resetControlsTimeout();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Speed selection
  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    resetControlsTimeout();
  };

  // Format time (mm:ss)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying && hasInteracted && !showSpeedMenu) {
          setShowControls(false);
        }
      }}
      className={cn(
        "relative w-full h-full bg-black group overflow-hidden select-none",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        preload="auto"
        playsInline
        className={cn(
          "w-full h-full object-contain transition-all duration-700",
          !hasInteracted ? "brightness-50 blur-[0.5px]" : "brightness-100"
        )}
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          // Set progress back to end
          if (videoRef.current) {
            videoRef.current.currentTime = duration;
          }
        }}
      />

      {/* Loading Spinner */}
      {isLoading && hasInteracted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-30">
          <Loader2 className="w-10 h-10 text-[#D6004B] animate-spin" />
        </div>
      )}

      {/* ── Pre-Interaction Autoplay-Muted Overlay ──────────────────────── */}
      {!hasInteracted && (
        <div 
          onClick={handleUnmuteAndStart}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center cursor-pointer bg-black/10 hover:bg-black/5 transition-all"
        >
          {/* Big pulsing play button */}
          <div className="relative w-14 h-14 sm:w-20 sm:h-20 bg-[#D6004B] border-2 border-white/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(214,0,75,0.6)] hover:scale-105 transition-transform duration-300">
            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-current ml-0.5 sm:ml-1" />
            <span className="absolute inset-0 rounded-full bg-[#D6004B]/30 animate-ping" />
          </div>

          {/* Unmute Pill */}
          <div className="flex items-center gap-2 bg-[#0c0c12]/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 text-white text-xs font-bold font-cairo shadow-lg hover:bg-[#0c0c12]/95 transition-all">
            <VolumeX className="w-4 h-4 text-zinc-350" />
            <span>{"\u0623\u0636\u063a\u0637 \u0644\u0641\u062a\u062d \u0627\u0644\u0635\u0648\u062a"}</span>
          </div>
        </div>
      )}

      {/* ── Interactive Custom Controls ────────────────────────────────── */}
      {hasInteracted && (
        <div 
          className={cn(
            "absolute inset-0 z-30 flex flex-col justify-end transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCenterClick(e);
            }
          }}
        >
          {/* Center click-to-play/pause area (covers video area, excludes bottom controls) */}
          <div
            className="absolute top-0 left-0 right-0 z-10 cursor-pointer"
            style={{ height: 'calc(100% - 80px)' }}
            onClick={handleCenterClick}
            onTouchEnd={(e) => { e.preventDefault(); handleCenterClick(e); }}
          />

          {/* Center flash feedback */}
          {centerFlash && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div
                key={centerFlash}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 flex items-center justify-center"
                style={{ animation: 'centerFlashAnim 0.6s ease-out forwards' }}
              >
                {centerFlash === "pause" ? (
                  <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-current" />
                ) : (
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-current ml-0.5 sm:ml-1" />
                )}
              </div>
            </div>
          )}

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

          {/* Bottom control panel — full width, transparent */}
          <div className="relative z-30 w-full px-4 pb-3 pt-1 space-y-1.5 pointer-events-auto" dir="ltr">
            
            {/* Progress Slider (Full width) */}
            <div className="flex items-center group/progress relative">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer outline-none transition-all accent-[#D6004B] hover:h-1.5 focus:outline-none custom-video-slider"
                style={{
                  background: `linear-gradient(to right, #D6004B 0%, #D6004B ${(currentTime / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                }}
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              
              {/* Left Side Controls: Play, Back 10s, Fwd 10s, Volume, Time */}
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button 
                  onClick={togglePlay} 
                  className="text-white hover:text-[#D6004B] transition-colors p-1 flex items-center justify-center shrink-0"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {/* Rewind 10s */}
                <button 
                  onClick={handleRewind10} 
                  className="text-zinc-400 hover:text-white transition-colors p-1 relative flex items-center justify-center group shrink-0"
                  title="10 seconds back"
                >
                  <RotateCcw className="w-4.5 h-4.5" />
                  <span className="absolute text-[7px] font-bold mt-1 scale-90 text-white font-sans">10</span>
                </button>

                {/* Forward 10s */}
                <button 
                  onClick={handleForward10} 
                  className="text-zinc-400 hover:text-white transition-colors p-1 relative flex items-center justify-center group shrink-0"
                  title="10 seconds forward"
                >
                  <RotateCw className="w-4.5 h-4.5" />
                  <span className="absolute text-[7px] font-bold mt-1 scale-90 text-white font-sans">10</span>
                </button>

                {/* Volume slider & mute */}
                <div className="flex items-center gap-1 group/volume shrink-0">
                  <button 
                    onClick={toggleMute} 
                    className="text-zinc-350 hover:text-white transition-colors p-1 flex items-center justify-center"
                  >
                    {isMuted ? <VolumeX className="w-4.5 h-4.5 text-zinc-400" /> : <Volume2 className="w-4.5 h-4.5" />}
                  </button>
                  
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeSliderChange}
                    className="w-0 overflow-hidden group-hover/volume:w-16 h-1 appearance-none cursor-pointer outline-none transition-all duration-300 rounded-full accent-[#D6004B]"
                    style={{
                      background: `linear-gradient(to right, #D6004B 0%, #D6004B ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                    }}
                  />
                </div>

                {/* Time Indicator */}
                <div className="text-[10px] sm:text-[11px] text-zinc-300 font-medium font-sans pl-1 select-none">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Side Controls: Speed (Cog), Fullscreen */}
              <div className="flex items-center gap-3">
                {/* Speed Controls Cog */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSpeedMenu(!showSpeedMenu);
                    }}
                    className={cn(
                      "text-zinc-350 hover:text-white transition-colors p-1 flex items-center justify-center",
                      showSpeedMenu && "text-[#D6004B] hover:text-[#D6004B]"
                    )}
                  >
                    <Settings className="w-4.5 h-4.5" />
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-9 right-0 bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-xl py-1 w-20 shadow-2xl z-50 flex flex-col text-center font-sans text-[11px]">
                      {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeSpeed(speed);
                          }}
                          className={cn(
                            "py-1 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors",
                            playbackSpeed === speed && "text-[#D6004B] font-bold"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen Button */}
                <button 
                  onClick={toggleFullscreen} 
                  className="text-zinc-350 hover:text-white transition-colors p-1 flex items-center justify-center"
                >
                  {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-video-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #D6004B;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
        }
        .group\\/progress:hover .custom-video-slider::-webkit-slider-thumb {
          opacity: 1;
        }
        .custom-video-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border: 0;
          border-radius: 50%;
          background: #D6004B;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
        }
        .group\\/progress:hover .custom-video-slider::-moz-range-thumb {
          opacity: 1;
        }
        @keyframes centerFlashAnim {
          0%   { opacity: 1; transform: scale(0.7); }
          40%  { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.4); }
        }
      `}} />
    </div>
  );
}
