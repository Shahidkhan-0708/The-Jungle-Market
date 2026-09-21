"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Leaf, X } from "lucide-react";

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const dialog = useRef<HTMLDialogElement>(null);
  const deferred = useRef<InstallEvent | null>(null);
  const [ready, setReady] = useState(false);
  const [ios, setIos] = useState(false);
  const [error, setError] = useState("");

  function dismiss() {
    dialog.current?.close();
    try { sessionStorage.setItem("jungle-install-dismissed", "1"); } catch {}
  }

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const installed = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const publishing = () => location.hash.startsWith("#artisan/step-");
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    function available(event: Event) {
      event.preventDefault();
      deferred.current = event as InstallEvent;
      setReady(true);
    }
    function complete() { deferred.current = null; setReady(false); dismiss(); }
    function modeChanged() { if (installed()) complete(); }
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", complete);
    standalone.addEventListener("change", modeChanged);
    const timer = window.setTimeout(() => {
      if (installed() || publishing()) return;
      try { if (sessionStorage.getItem("jungle-install-dismissed")) return; } catch {}
      dialog.current?.showModal();
    }, 1200);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", complete);
      standalone.removeEventListener("change", modeChanged);
      dialog.current?.close();
    };
  }, []);

  async function install() {
    const event = deferred.current;
    if (!event) return;
    deferred.current = null;
    setReady(false);
    try {
      await event.prompt();
      await event.userChoice;
      dismiss();
    } catch {
      setError("Use your browser’s menu to install, or continue on the website.");
    }
  }

  return <dialog ref={dialog} className="install-app-dialog" aria-labelledby="install-app-title" aria-describedby="install-app-description" onCancel={dismiss}>
    <button className="install-app-close" aria-label="Close installation prompt" onClick={dismiss}><X size={20} /></button>
    <span className="install-app-mark"><Leaf size={30} aria-hidden="true" /></span>
    <p className="install-app-eyebrow">JUNGLE MARKET</p>
    <h2 id="install-app-title">A little closer to the makers.</h2>
    <p id="install-app-description">Add Jungle Market to your home screen for easy access to crafts, orders, and your maker workspace.</p>
    {ready ? <button className="install-app-action" onClick={install}><Download size={19} aria-hidden="true" /> Install Jungle Market</button> :
      <p className="install-app-help">{ios ? "Tap Share, then Add to Home Screen, and confirm Add." : "Open this link in Chrome or Edge and choose Install app from the browser menu or address bar. On Mac Safari, choose File → Add to Dock."}</p>}
    {error && <p role="status" className="install-app-help">{error}</p>}
    <button className="install-app-later" onClick={dismiss}>Continue on website</button>
  </dialog>;
}
