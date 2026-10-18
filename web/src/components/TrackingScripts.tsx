import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function TrackingScripts() {
  const [gaId, setGaId] = useState<string | null>(null);
  const [pixelId, setPixelId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrackingIds = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("config_key, config_value")
        .in("config_key", ["google_analytics_id", "meta_pixel_id"]);

      for (const item of data || []) {
        if (item.config_key === "google_analytics_id" && item.config_value) setGaId(item.config_value);
        if (item.config_key === "meta_pixel_id" && item.config_value) setPixelId(item.config_value);
      }
    };
    fetchTrackingIds();
  }, []);

  useEffect(() => {
    if (!gaId) return;
    // Load Google Analytics gtag.js
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;
    document.head.appendChild(script);

    const inlineScript = document.createElement("script");
    inlineScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(inlineScript);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(inlineScript);
    };
  }, [gaId]);

  useEffect(() => {
    if (!pixelId) return;
    // Load Meta Pixel
    const script = document.createElement("script");
    script.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // noscript fallback in body
    const noscript = document.createElement("noscript");
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);

    return () => {
      document.head.removeChild(script);
      document.body.removeChild(noscript);
    };
  }, [pixelId]);

  return null;
}
