/**
 * Website review — the bookmarklet payload.
 *
 *   GET /api/public/page-review/[token]/overlay.js
 *
 * Served as JavaScript so the bookmarklet itself stays a one-liner that
 * never has to be reinstalled: the bookmark injects this script, and the
 * behaviour can change here whenever we like.
 *
 * The overlay lets a reviewer hover-highlight any element on the page,
 * click it, and file a comment. It captures four anchors of decreasing
 * durability so the comment survives the page being edited:
 *   quote  — the element's own text (most durable)
 *   key    — its id, else a distinctive class
 *   path   — a CSS path from <body>
 *   block  — the nearest WPBakery raw-HTML wrapper, which is what maps a
 *            rendered element back to a spot in post_content
 *
 * Everything is scoped under one id so a second injection replaces the
 * first instead of stacking listeners.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const review = await prisma.pageReview.findUnique({
    where: { shareToken: token },
    select: { title: true, status: true },
  });

  const headers = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };

  if (!review || review.status === "closed") {
    return new NextResponse(
      `alert("This BioHubNet review link is no longer active.");`,
      { headers },
    );
  }

  const origin = process.env.NEXTAUTH_URL ?? "https://app.biohubnet.ca";
  const endpoint = `${origin}/api/public/page-review/${token}`;

  return new NextResponse(overlaySource(endpoint, review.title), { headers });
}

export function overlaySource(endpoint: string, title: string): string {
  // Single-quoted template below is emitted verbatim to the browser.
  return `(function(){
  var ID = "bhn-review-overlay";
  var old = document.getElementById(ID);
  if (old) { old.remove(); if (window.__bhnReviewCleanup) window.__bhnReviewCleanup(); }

  var NAME = localStorage.getItem("bhn-review-name") || "";
  if (!NAME) {
    NAME = window.prompt("Your name (shown on your comments):", "") || "";
    if (!NAME) return;
    localStorage.setItem("bhn-review-name", NAME);
  }

  var root = document.createElement("div");
  root.id = ID;
  root.setAttribute("style", "position:fixed;z-index:2147483647;inset:auto 16px 16px auto;font:14px -apple-system,Segoe UI,system-ui,sans-serif;");
  document.body.appendChild(root);

  var hi = document.createElement("div");
  hi.setAttribute("style", "position:absolute;pointer-events:none;z-index:2147483646;border:2px solid #2c4f5a;background:rgba(44,79,90,.12);border-radius:3px;display:none;");
  document.body.appendChild(hi);

  var bar = document.createElement("div");
  bar.setAttribute("style", "background:#0b3558;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.3);max-width:320px;");
  var label = document.createElement("div");
  label.setAttribute("style", "font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.75");
  label.textContent = "BioHubNet review";
  var reviewTitle = document.createElement("div");
  reviewTitle.setAttribute("style", "margin-top:4px;font-size:13px");
  reviewTitle.textContent = ${JSON.stringify(title)};
  var msg = document.createElement("div");
  msg.setAttribute("style", "margin-top:6px;font-size:12px;opacity:.85");
  msg.textContent = "Click any element to comment. Esc to exit.";
  bar.appendChild(label);
  bar.appendChild(reviewTitle);
  bar.appendChild(msg);
  root.appendChild(bar);

  function inOverlay(el){ return root.contains(el) || el === hi; }

  function classTokens(el){
    return el && el.classList
      ? Array.prototype.slice.call(el.classList).filter(Boolean)
      : [];
  }

  function cssIdent(value){
    var raw = String(value || "");
    if (!raw) return "";
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(raw);
    return /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(raw) ? raw : "";
  }

  // Depth 9, not 6: on a Salient/WPBakery page six levels only reaches the
  // generic .wpb_wrapper divs, and the path matches three elements. Nine
  // reaches the section's own id and resolves uniquely. Verified on
  // /engage/regulatory-affairs/.
  function cssPath(el){
    var parts = [], node = el, guard = 0;
    while (node && node.nodeType === 1 && node !== document.body && guard++ < 9) {
      var seg = node.tagName.toLowerCase();
      var escapedId = cssIdent(node.id);
      if (escapedId) { parts.unshift(seg + "#" + escapedId); break; }
      var cls = classTokens(node).map(cssIdent).filter(Boolean).slice(0, 2);
      if (cls.length) seg += "." + cls.join(".");
      var sibs = node.parentNode ? Array.prototype.filter.call(node.parentNode.children, function(c){ return c.tagName === node.tagName; }) : [];
      if (sibs.length > 1) seg += ":nth-of-type(" + (sibs.indexOf(node) + 1) + ")";
      parts.unshift(seg);
      node = node.parentNode;
    }
    return parts.join(" > ");
  }

  function keyOf(el){
    var escapedId = cssIdent(el.id);
    if (escapedId) return "#" + escapedId;
    var cls = classTokens(el).map(cssIdent).filter(Boolean);
    // Prefer a distinctive class over a utility one.
    var pick = cls.filter(function(c){ return c.length > 6; })[0] || cls[0];
    return pick ? el.tagName.toLowerCase() + "." + pick : el.tagName.toLowerCase();
  }

  // WPBakery renders raw-HTML blocks into wrappers whose class carries
  // vc_raw_html; that wrapper is what maps back into post_content.
  //
  // Number them in DOCUMENT order, not among siblings — the blocks sit in
  // separate section wrappers, so a sibling index made every one of them
  // "#1". Document order matches the order of the shortcodes in
  // post_content, which is what someone editing the page counts.
  function blockOf(el){
    var all = Array.prototype.slice.call(
      document.querySelectorAll(".wpb_raw_html, .vc_raw_html"));
    var n = el, guard = 0;
    while (n && n.nodeType === 1 && guard++ < 12) {
      var i = all.indexOf(n);
      if (i > -1) return "vc_raw_html #" + (i + 1);
      n = n.parentNode;
    }
    return null;
  }

  function onMove(e){
    var el = e.target;
    if (!el || inOverlay(el)) { hi.style.display = "none"; return; }
    var r = el.getBoundingClientRect();
    hi.style.display = "block";
    hi.style.top = (r.top + window.scrollY) + "px";
    hi.style.left = (r.left + window.scrollX) + "px";
    hi.style.width = r.width + "px";
    hi.style.height = r.height + "px";
  }

  function onClick(e){
    var el = e.target;
    if (!el || inOverlay(el)) return;
    e.preventDefault(); e.stopPropagation();
    var quote = (el.innerText || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 300);
    var note = window.prompt("Comment on: \\"" + quote.slice(0, 80) + "\\"", "");
    if (!note) return;
    msg.textContent = "Sending…";
    fetch(${JSON.stringify(endpoint)}, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: note, authorName: NAME,
        anchorQuote: quote || null, anchorKey: keyOf(el),
        anchorPath: cssPath(el), anchorBlock: blockOf(el)
      })
    }).then(function(r){ return r.json().catch(function(){ return {}; }); })
      .then(function(j){ msg.textContent = j && j.ok ? "Saved. Click another element." : ((j && j.error) || "Couldn't save that."); })
      .catch(function(){ msg.textContent = "Network error — is the platform reachable?"; });
  }

  function onKey(e){ if (e.key === "Escape") cleanup(); }

  function cleanup(){
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    hi.remove(); root.remove();
    window.__bhnReviewCleanup = null;
  }
  window.__bhnReviewCleanup = cleanup;

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
})();`;
}
