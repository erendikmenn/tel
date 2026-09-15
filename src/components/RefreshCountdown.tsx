"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function formatEvery(seconds: number) {
  if (seconds > 0 && seconds % 3600 === 0) return `${seconds / 3600} sa`;
  if (seconds > 0 && seconds % 60 === 0) return `${seconds / 60} dk`;
  return `${seconds} sn`;
}

function formatRemain(totalSeconds: number) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

type RefreshCountdownProps = {
  /** Sunucunun bu sürümü ürettiği an (ISO 8601). */
  generatedAt: string;
  /** Yenileme aralığı, saniye. page.tsx içindeki revalidate ile aynı değer. */
  intervalSeconds: number;
};

export function RefreshCountdown({ generatedAt, intervalSeconds }: RefreshCountdownProps) {
  const router = useRouter();
  // Sunucunun üretim anı + aralık = bir sonraki tarama anı.
  const end = new Date(generatedAt).getTime() + intervalSeconds * 1000;
  const endRef = useRef(end);
  const [left, setLeft] = useState(intervalSeconds);

  useEffect(() => {
    endRef.current = end;
    let expiredAt = 0;
    let lastRefresh = 0;

    const tick = () => {
      const remaining = (endRef.current - Date.now()) / 1000;
      if (remaining > 0) {
        expiredAt = 0;
        setLeft(Math.ceil(remaining));
        return;
      }

      setLeft(0);
      const now = Date.now();
      if (expiredAt === 0) expiredAt = now;
      // ISR ilk istekte eski sürümü döndürebilir; yenisi gelene kadar seyrek dene.
      if (now - lastRefresh >= 5000) {
        lastRefresh = now;
        router.refresh();
      }
      if (now - expiredAt >= 60000) {
        endRef.current = now + intervalSeconds * 1000;
        expiredAt = 0;
        setLeft(intervalSeconds);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    // Sekme arka plandayken zamanlayıcı kısıtlanır; geri gelince hemen eşitle.
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [end, router, intervalSeconds]);

  return (
    <p className="refresh-count">
      <span>
        Yeni tarama
        <span className="refresh-every"> · {formatEvery(intervalSeconds)}</span>
      </span>
      <time dateTime={new Date(end).toISOString()}>
        {left <= 0 ? "şimdi" : formatRemain(left)}
      </time>
      <span className="sr-only">Sonraki tarama {formatEvery(intervalSeconds)} içinde yapılır.</span>
    </p>
  );
}
