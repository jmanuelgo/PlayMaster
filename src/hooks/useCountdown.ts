import { useEffect, useState } from "react";

export function useCountdown(endTime: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endTime - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, endTime - Date.now()));
    const id = setInterval(() => {
      const r = Math.max(0, endTime - Date.now());
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return remaining;
}
