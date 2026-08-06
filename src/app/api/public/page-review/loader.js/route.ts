import { NextResponse } from "next/server";
import { PAGE_REVIEW_HASH_KEY } from "@/lib/page-review/access";

const HEADERS = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(req: Request) {
  const appOrigin = new URL(req.url).origin;
  return new NextResponse(loaderSource(appOrigin), { headers: HEADERS });
}

export function loaderSource(appOrigin: string): string {
  const base = appOrigin.replace(/\/$/, "");

  return `(function(){
  var KEY = ${JSON.stringify(PAGE_REVIEW_HASH_KEY)};
  var params;
  try { params = new URLSearchParams(window.location.hash.slice(1)); }
  catch (_) { return; }

  var token = params.get(KEY);
  if (!token) return;

  params.delete(KEY);
  var remaining = params.toString();
  var cleanUrl = window.location.pathname + window.location.search + (remaining ? "#" + remaining : "");
  window.history.replaceState(window.history.state, "", cleanUrl);

  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return;

  var existing = document.getElementById("bhn-review-loader-script");
  if (existing) existing.remove();

  var script = document.createElement("script");
  script.id = "bhn-review-loader-script";
  script.src = ${JSON.stringify(base)} + "/api/public/page-review/" + encodeURIComponent(token) + "/overlay.js?t=" + Date.now();
  script.crossOrigin = "anonymous";
  script.referrerPolicy = "no-referrer";
  (document.head || document.body).appendChild(script);
})();`;
}
