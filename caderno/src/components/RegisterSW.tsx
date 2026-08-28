"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalação do PWA é um extra, não pode derrubar o app se falhar
      });
    }
  }, []);
  return null;
}
