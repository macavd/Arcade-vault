"use client";

import { useEffect } from "react";

/**
 * Registra un IntersectionObserver sobre todos los elementos `.reveal`
 * y les añade la clase `.in` una sola vez al entrar en el viewport.
 * Porta el comportamiento reveal-on-scroll del prototipo (home.jsx).
 */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );

    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
