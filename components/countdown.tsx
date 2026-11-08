"use client";

import { useEffect, useState } from "react";

export function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = now ? Math.max(0, Math.floor(endsAt - now / 1000)) : 0;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (
    <div className="cd">
      <div><b>{d}</b><span>days</span></div>
      <div><b>{h}</b><span>hours</span></div>
      <div><b>{m}</b><span>mins</span></div>
      <div><b>{s}</b><span>secs</span></div>
    </div>
  );
}
