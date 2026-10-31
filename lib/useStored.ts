"use client";
import { useEffect, useState } from "react";

/**
 * Like useState, but remembered in this browser (localStorage).
 * `ready` turns true once the saved value has been read, so pages can avoid
 * flashing the "first visit" view to returning visitors.
 */
export function useStored<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      /* storage unavailable: keep the default */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value, ready]);

  return [value, setValue, ready];
}
