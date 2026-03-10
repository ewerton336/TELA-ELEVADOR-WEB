import { useState, useEffect } from "react";

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
  
  const dateFormatted = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const day = time.getDate().toString().padStart(2, "0");
  const monthShort = time
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();

  return {
    time,
    hours,
    minutes,
    seconds,
    day,
    monthShort,
    timeFormatted: `${hours}:${minutes}`,
    timeWithSeconds: `${hours}:${minutes}:${seconds}`,
    dateFormatted,
  };
}
