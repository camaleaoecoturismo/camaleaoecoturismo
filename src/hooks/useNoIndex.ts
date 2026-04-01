import { useEffect } from "react";

export function useNoIndex() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const prev = meta?.getAttribute("content") || null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex,nofollow");
    return () => {
      if (prev === null) {
        document.querySelector('meta[name="robots"]')?.remove();
      } else {
        document.querySelector('meta[name="robots"]')?.setAttribute("content", prev);
      }
    };
  }, []);
}
