import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile CAPTCHA widget.
 * Renders only when VITE_TURNSTILE_SITE_KEY is configured.
 *
 * Props:
 *   onVerify(token) - called when user passes the challenge
 *   onExpire()      - called when token expires
 *   dark            - boolean for theme
 */
export function TurnstileWidget({ onVerify, onExpire, dark }) {
  const containerRef = useRef(null);
  const widgetId     = useRef(null);

  useEffect(() => {
    if (!SITE_KEY) return;

    function renderWidget() {
      if (!containerRef.current) return;
      if (widgetId.current !== null) return; // already rendered

      if (window.turnstile) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey:  SITE_KEY,
          theme:    dark ? 'dark' : 'light',
          callback: onVerify,
          'expired-callback': onExpire,
        });
      }
    }

    // Load Turnstile script if not already loaded
    if (!window.turnstile) {
      const existing = document.querySelector('script[src*="turnstile"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', renderWidget);
      }
    } else {
      renderWidget();
    }

    return () => {
      if (window.turnstile && widgetId.current !== null) {
        try { window.turnstile.remove(widgetId.current); } catch {}
        widgetId.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="mt-2" />;
}

/**
 * Returns true if Turnstile is configured.
 * Use to conditionally require token before form submit.
 */
export function turnstileConfigured() {
  return !!SITE_KEY;
}
