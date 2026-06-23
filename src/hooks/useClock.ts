import { useState, useEffect } from "react";
import { monthShortUpper } from "@/lib/dateFormatter";

export function useClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const day = time.getDate().toString().padStart(2, "0");
  const monthShort = monthShortUpper(time);

  return {
    time,
    hours,
    minutes,
    seconds,
    day,
    monthShort,
    timeFormatted: `${hours}:${minutes}`,
    timeWithSeconds: `${hours}:${minutes}:${seconds}`,
  };
}
