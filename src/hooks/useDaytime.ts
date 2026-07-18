import { useEffect, useRef, useState } from "react";
import {
  brasiliaMinutesOfDay,
  fetchBrasiliaEpochMs,
  isDaytime,
} from "@/lib/brasiliaTime";

const SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;
const TICK_INTERVAL_MS = 60 * 1000;

export function useDaytime(): boolean {
  const offsetRef = useRef(0);
  const [day, setDay] = useState(() =>
    isDaytime(brasiliaMinutesOfDay(Date.now())),
  );

  useEffect(() => {
    let active = true;

    const recompute = () => {
      const next = isDaytime(
        brasiliaMinutesOfDay(Date.now() + offsetRef.current),
      );
      setDay((prev) => (prev === next ? prev : next));
    };

    const sync = async () => {
      const epoch = await fetchBrasiliaEpochMs();
      if (!active) return;
      if (epoch !== null) offsetRef.current = epoch - Date.now();
      recompute();
    };

    void sync();
    const syncId = setInterval(() => void sync(), SYNC_INTERVAL_MS);
    const tickId = setInterval(recompute, TICK_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(syncId);
      clearInterval(tickId);
    };
  }, []);

  return day;
}
