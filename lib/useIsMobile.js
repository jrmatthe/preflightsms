import { useState, useEffect } from "react";

const BREAKPOINT = 768;
const LS_KEY = "preferDesktop";

export function setDesktopPreference(prefer) {
  if (typeof window === "undefined") return;
  if (prefer) {
    localStorage.setItem(LS_KEY, "true");
  } else {
    localStorage.removeItem(LS_KEY);
  }
  window.dispatchEvent(new Event("resize"));
}

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let timer;
    const check = () => {
      if (localStorage.getItem(LS_KEY) === "true") {
        setIsMobile(false);
        return;
      }
      setIsMobile(window.innerWidth <= BREAKPOINT);
    };
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(check, 150);
    };
    check();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return isMobile;
}
