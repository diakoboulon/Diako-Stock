"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Pixel Facebook (même pixel que Diakoboulon) + statistiques Vercel.
// Uniquement sur les pages publiques : jamais sur les espaces privés ni les sites des clients.
const PIXEL_ID = "677853448542640";
const PAGES = new Set(["/", "/tarifs", "/inscription", "/connexion"]);

export default function Suivi() {
  const chemin = usePathname();
  const ok = PAGES.has(chemin ?? "");
  const premier = useRef(true);

  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    if (ok && typeof window !== "undefined" && (window as any).fbq) (window as any).fbq("track", "PageView");
  }, [chemin, ok]);

  if (!ok) return null;
  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');
`}</Script>
      <Script id="va-init" strategy="afterInteractive">{`window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};`}</Script>
      <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
    </>
  );
}
