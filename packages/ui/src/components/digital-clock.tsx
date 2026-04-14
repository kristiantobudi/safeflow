'use client';

import { useEffect, useState } from 'react';
import { getIndonesiaZone } from '../helper/timeZone';

export default function DigitalClock() {
  const [time, setTime] = useState<Date | null>(null);
  const [timeZone, setTimeZone] = useState<string>('Asia/Jakarta');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(tz);

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return null;
  }

  const indonesiaZone = getIndonesiaZone({ timeZone });

  return (
    <div className="flex flex-col items-end justify-center px-4 py-1">
      <p className="text-sm md:text-base lg:text-lg font-bold flex items-center gap-2">
        {time.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone,
        })}
        <span className="text-[10px] md:text-xs font-medium opacity-80">{indonesiaZone}</span>
      </p>

      <p className="hidden md:block text-[10px] lg:text-xs text-muted-foreground whitespace-nowrap">
        {new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'full',
          timeZone,
        }).format(time)}
      </p>
    </div>
  );
}
