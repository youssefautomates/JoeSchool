"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function CountdownTimer({ hours = 24 }: { hours?: number }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: hours,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Check local storage for existing end time
    let endTime = localStorage.getItem("offer_end_time");
    
    if (!endTime || new Date().getTime() > parseInt(endTime)) {
      // Set new end time
      endTime = (new Date().getTime() + hours * 60 * 60 * 1000).toString();
      localStorage.setItem("offer_end_time", endTime);
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = parseInt(endTime!) - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hours]);

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-100 px-4 py-2 rounded-lg font-alexandria w-fit shadow-sm">
      <Clock className="w-4 h-4 text-red-600 animate-pulse" />
      <div className="flex items-center gap-2 text-red-600 font-bold">
        <span className="w-6 text-center tabular-nums">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span>:</span>
        <span className="w-6 text-center tabular-nums">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span>:</span>
        <span className="w-6 text-center tabular-nums">{timeLeft.hours.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-red-600/80 text-sm font-cairo mr-2">ينتهي العرض خلال</span>
    </div>
  );
}
