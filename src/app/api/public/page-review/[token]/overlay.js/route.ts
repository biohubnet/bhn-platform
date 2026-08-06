/** Live-page collaborative review overlay, served as cross-origin JavaScript. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const review = await prisma.pageReview.findUnique({
    where: { shareToken: token },
    select: { title: true, status: true },
  });

  if (!review || review.status === "closed") {
    return new NextResponse(inactiveOverlaySource("This BioHubNet review is no longer active."), {
      headers: HEADERS,
    });
  }

  const origin = new URL(req.url).origin;
  const endpoint = `${origin}/api/public/page-review/${encodeURIComponent(token)}`;
  return new NextResponse(overlaySource(endpoint, review.title), { headers: HEADERS });
}

function inactiveOverlaySource(message: string) {
  return `(function(){
  var old = document.getElementById("bhn-review-overlay");
  if (old) old.remove();
  var box = document.createElement("div");
  box.id = "bhn-review-overlay";
  box.setAttribute("style", "position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:340px;padding:14px 16px;border:1px solid #d8dee5;border-radius:8px;background:#fff;color:#17212b;box-shadow:0 12px 36px rgba(0,0,0,.22);font:14px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;");
  box.textContent = ${JSON.stringify(message)};
  document.body.appendChild(box);
})();`;
}

export function overlaySource(endpoint: string, title: string): string {
  return `(function(){
  var ID = "bhn-review-overlay";
  if (window.__bhnReviewCleanup) window.__bhnReviewCleanup();

  var script = document.currentScript;
  var credential = script && script.dataset ? (script.dataset.viewer || "") : "";
  var endpoint = ${JSON.stringify(endpoint)};
  var initialTitle = ${JSON.stringify(title)};
  var state = {
    review: { title: initialTitle, round: 1, status: "open" },
    viewer: null,
    comments: [],
    selected: null,
    draft: "",
    replyTo: null,
    replyDraft: "",
    error: "",
    loading: true,
    saving: false,
    pendingRender: false
  };
  var markers = [];
  var pollTimer = null;
  var positionFrame = null;

  var style = document.createElement("style");
  style.id = ID + "-styles";
  style.textContent = [
    "#" + ID + "{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(380px,calc(100vw - 24px));max-height:calc(100vh - 32px);font:13px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif;color:#17212b;}",
    "#" + ID + " *{box-sizing:border-box;letter-spacing:0;}",
    "#" + ID + " button,#" + ID + " textarea{font:inherit;}",
    "#" + ID + " button{cursor:pointer;}",
    ".bhn-shell{display:flex;max-height:calc(100vh - 32px);flex-direction:column;overflow:hidden;border:1px solid #cfd8df;border-radius:8px;background:#f7f9fa;box-shadow:0 18px 55px rgba(7,27,39,.28);}",
    ".bhn-head{display:flex;align-items:flex-start;gap:10px;padding:12px 12px 11px;background:#0b3558;color:#fff;}",
    ".bhn-head-copy{min-width:0;flex:1;}.bhn-kicker{font-size:10px;font-weight:800;text-transform:uppercase;opacity:.72;}.bhn-title{margin-top:2px;overflow:hidden;font-size:14px;font-weight:750;text-overflow:ellipsis;white-space:nowrap;}.bhn-meta{margin-top:2px;font-size:11px;opacity:.78;}",
    ".bhn-close{display:grid;width:30px;height:30px;flex:0 0 30px;place-items:center;border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#fff;font-size:20px;line-height:1;}.bhn-close:hover{background:rgba(255,255,255,.2);}",
    ".bhn-body{overflow:auto;padding:10px;overscroll-behavior:contain;}.bhn-notice{padding:10px;border:1px solid #d8e0e5;border-radius:6px;background:#fff;color:#4a5864;font-size:12px;}.bhn-error{border-color:#f0b7b7;background:#fff3f3;color:#8c2020;}",
    ".bhn-compose{margin-bottom:10px;padding:10px;border:1px solid #9bc6d2;border-radius:7px;background:#edf8fa;}.bhn-compose-label{font-size:11px;font-weight:800;color:#245866;}.bhn-quote{margin:6px 0 8px;padding-left:8px;border-left:3px solid #2c7587;color:#41515c;font-size:12px;line-height:1.4;}.bhn-textarea{display:block;width:100%;min-height:76px;resize:vertical;border:1px solid #b9c5cc;border-radius:6px;background:#fff;padding:8px;color:#17212b;outline:none;}.bhn-textarea:focus{border-color:#2c7587;box-shadow:0 0 0 3px rgba(44,117,135,.14);}",
    ".bhn-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin-top:8px;}.bhn-btn{min-height:32px;border:1px solid #c6d0d6;border-radius:6px;background:#fff;padding:6px 10px;color:#34434e;font-weight:700;}.bhn-btn:hover{background:#f0f4f6;}.bhn-btn-primary{border-color:#176879;background:#176879;color:#fff;}.bhn-btn-primary:hover{background:#105565;}.bhn-btn:disabled{cursor:not-allowed;opacity:.55;}",
    ".bhn-list{display:grid;gap:8px;}.bhn-empty{padding:18px 12px;text-align:center;color:#667580;font-size:12px;}.bhn-thread{border:1px solid #d7dfe4;border-radius:7px;background:#fff;overflow:hidden;}.bhn-thread-active{border-color:#2c7587;box-shadow:0 0 0 2px rgba(44,117,135,.12);}.bhn-thread-head{display:flex;align-items:flex-start;gap:8px;padding:9px 9px 6px;}.bhn-number{display:grid;width:23px;height:23px;flex:0 0 23px;place-items:center;border-radius:50%;background:#176879;color:#fff;font-size:11px;font-weight:800;}.bhn-author{min-width:0;flex:1;font-size:12px;font-weight:800;color:#1c2b35;}.bhn-time{display:block;margin-top:1px;color:#84919a;font-size:10px;font-weight:500;}.bhn-status{border-radius:999px;background:#e9f6ed;padding:2px 6px;color:#2e6f42;font-size:9px;font-weight:800;text-transform:uppercase;}.bhn-status-resolved{background:#eef1f3;color:#64717a;}",
    ".bhn-thread-body{padding:0 10px 9px 40px;white-space:pre-wrap;color:#2f3e48;font-size:12px;}.bhn-thread-quote{margin:0 10px 8px 40px;padding:6px 8px;border-left:2px solid #b7c8d1;background:#f5f8f9;color:#60707b;font-size:11px;}.bhn-thread-tools{display:flex;justify-content:flex-end;padding:0 9px 8px;}.bhn-link-btn{border:0;background:transparent;padding:3px 5px;color:#176879;font-size:11px;font-weight:800;}.bhn-link-btn:hover{text-decoration:underline;}",
    ".bhn-replies{margin:0 9px 9px 40px;border-left:2px solid #dce4e8;padding-left:8px;}.bhn-reply{padding:6px 0;border-top:1px solid #edf0f2;}.bhn-reply:first-child{border-top:0;}.bhn-reply-meta{color:#6c7982;font-size:10px;font-weight:750;}.bhn-reply-body{margin-top:2px;white-space:pre-wrap;color:#34434e;font-size:11px;}.bhn-reply-compose{margin:0 9px 9px 40px;}",
    ".bhn-review-highlight{position:absolute;z-index:2147483645;display:none;pointer-events:none;border:2px solid #2c7587;border-radius:3px;background:rgba(44,117,135,.12);}",
    ".bhn-review-marker{position:absolute;z-index:2147483646;display:grid;width:25px;height:25px;place-items:center;border:2px solid #fff;border-radius:50%;background:#176879;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.28);font:800 11px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;}.bhn-review-marker:hover{transform:scale(1.08);}.bhn-review-marker-resolved{background:#74818a;}",
    "@media(max-width:540px){#" + ID + "{right:12px;bottom:12px;max-height:calc(100vh - 24px);}.bhn-shell{max-height:calc(100vh - 24px);}.bhn-body{padding:8px;}}"
  ].join("");
  document.head.appendChild(style);

  var root = document.createElement("aside");
  root.id = ID;
  root.setAttribute("aria-label", "BioHubNet website review");
  document.body.appendChild(root);

  var highlight = document.createElement("div");
  highlight.setAttribute("class", "bhn-review-highlight");
  document.body.appendChild(highlight);

  function make(tag, classValue, text) {
    var node = document.createElement(tag);
    if (classValue) node.setAttribute("class", classValue);
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function cleanText(value) {
    return String(value || "").trim().replace(/\\s+/g, " ");
  }

  function classTokens(node) {
    return node && node.classList ? Array.prototype.slice.call(node.classList).filter(Boolean) : [];
  }

  function cssIdent(value) {
    var raw = String(value || "");
    if (!raw) return "";
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(raw);
    return /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(raw) ? raw : "";
  }

  function cssPath(node) {
    var parts = [], guard = 0;
    while (node && node.nodeType === 1 && node !== document.body && guard++ < 9) {
      var segment = node.tagName.toLowerCase();
      var escapedId = cssIdent(node.id);
      if (escapedId) { parts.unshift(segment + "#" + escapedId); break; }
      var classes = classTokens(node).map(cssIdent).filter(Boolean).slice(0, 2);
      if (classes.length) segment += "." + classes.join(".");
      var siblings = node.parentNode ? Array.prototype.filter.call(node.parentNode.children, function(child){ return child.tagName === node.tagName; }) : [];
      if (siblings.length > 1) segment += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
      parts.unshift(segment);
      node = node.parentNode;
    }
    return parts.join(" > ");
  }

  function keyOf(node) {
    var escapedId = cssIdent(node.id);
    if (escapedId) return "#" + escapedId;
    var classes = classTokens(node).map(cssIdent).filter(Boolean);
    var pick = classes.filter(function(value){ return value.length > 6; })[0] || classes[0];
    return pick ? node.tagName.toLowerCase() + "." + pick : node.tagName.toLowerCase();
  }

  function blockOf(node) {
    var blocks = Array.prototype.slice.call(document.querySelectorAll(".wpb_raw_html, .vc_raw_html"));
    var guard = 0;
    while (node && node.nodeType === 1 && guard++ < 12) {
      var index = blocks.indexOf(node);
      if (index > -1) return "vc_raw_html #" + (index + 1);
      node = node.parentNode;
    }
    return null;
  }

  function inOverlay(node) {
    return !node || root.contains(node) || node === highlight || (node.closest && node.closest(".bhn-review-marker"));
  }

  function anchorsFor(node) {
    var quote = cleanText(node.innerText || node.textContent).slice(0, 600);
    return {
      anchorQuote: quote || null,
      anchorKey: keyOf(node),
      anchorPath: cssPath(node),
      anchorBlock: blockOf(node)
    };
  }

  function safeQuery(selector) {
    if (!selector) return null;
    try {
      var node = document.querySelector(selector);
      return node && !inOverlay(node) ? node : null;
    } catch (_) { return null; }
  }

  function findAnchor(comment) {
    var node = safeQuery(comment.anchorKey) || safeQuery(comment.anchorPath);
    if (node) return node;
    var quote = cleanText(comment.anchorQuote);
    if (!quote) return null;
    var candidates = document.querySelectorAll("h1,h2,h3,h4,h5,p,a,button,li,label,blockquote,figcaption");
    for (var i = 0; i < candidates.length; i++) {
      if (inOverlay(candidates[i])) continue;
      var text = cleanText(candidates[i].innerText || candidates[i].textContent);
      if (text === quote || (quote.length > 20 && text.indexOf(quote) > -1)) return candidates[i];
    }
    return null;
  }

  function showHighlight(node) {
    if (!node) { highlight.style.display = "none"; return; }
    var rect = node.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.top = (rect.top + window.scrollY) + "px";
    highlight.style.left = (rect.left + window.scrollX) + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";
  }

  function topComments() {
    return state.comments.filter(function(comment){ return !comment.parentId; });
  }

  function repliesFor(id) {
    return state.comments.filter(function(comment){ return comment.parentId === id; });
  }

  function formatTime(value) {
    try { return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch (_) { return ""; }
  }

  function addButton(label, classValue, handler) {
    var button = make("button", classValue, label);
    button.setAttribute("type", "button");
    button.addEventListener("click", handler);
    return button;
  }

  function renderComposer(container) {
    if (!state.selected) return;
    var box = make("section", "bhn-compose");
    box.appendChild(make("div", "bhn-compose-label", "Comment on selected element"));
    if (state.selected.anchorQuote) {
      box.appendChild(make("div", "bhn-quote", state.selected.anchorQuote.slice(0, 180)));
    }
    var textarea = make("textarea", "bhn-textarea");
    textarea.setAttribute("placeholder", "What should change?");
    textarea.setAttribute("aria-label", "New review comment");
    textarea.value = state.draft;
    textarea.addEventListener("input", function(){ state.draft = textarea.value; });
    box.appendChild(textarea);
    var actions = make("div", "bhn-actions");
    actions.appendChild(addButton("Cancel", "bhn-btn", function(){ state.selected = null; state.draft = ""; render(); }));
    var submit = addButton(state.saving ? "Adding..." : "Add comment", "bhn-btn bhn-btn-primary", function(){ submitComment(textarea.value, null, state.selected); });
    submit.disabled = state.saving;
    actions.appendChild(submit);
    box.appendChild(actions);
    container.appendChild(box);
    window.setTimeout(function(){ textarea.focus(); }, 0);
  }

  function renderReplyComposer(card, thread) {
    if (state.replyTo !== thread.id) return;
    var wrap = make("div", "bhn-reply-compose");
    var textarea = make("textarea", "bhn-textarea");
    textarea.setAttribute("placeholder", "Reply to this thread");
    textarea.setAttribute("aria-label", "Reply to " + thread.authorName);
    textarea.value = state.replyDraft;
    textarea.addEventListener("input", function(){ state.replyDraft = textarea.value; });
    wrap.appendChild(textarea);
    var actions = make("div", "bhn-actions");
    actions.appendChild(addButton("Cancel", "bhn-btn", function(){ state.replyTo = null; state.replyDraft = ""; render(); }));
    var submit = addButton(state.saving ? "Replying..." : "Reply", "bhn-btn bhn-btn-primary", function(){ submitComment(textarea.value, thread.id, null); });
    submit.disabled = state.saving;
    actions.appendChild(submit);
    wrap.appendChild(actions);
    card.appendChild(wrap);
    window.setTimeout(function(){ textarea.focus(); }, 0);
  }

  function renderThread(comment, index) {
    var card = make("article", "bhn-thread");
    card.setAttribute("data-thread-id", comment.id);
    var head = make("div", "bhn-thread-head");
    head.appendChild(make("span", "bhn-number", String(index + 1)));
    var author = make("div", "bhn-author", comment.authorName);
    author.appendChild(make("span", "bhn-time", formatTime(comment.createdAt)));
    head.appendChild(author);
    head.appendChild(make("span", "bhn-status" + (comment.status === "open" ? "" : " bhn-status-resolved"), comment.status));
    card.appendChild(head);
    card.appendChild(make("div", "bhn-thread-body", comment.body));
    if (comment.anchorQuote) card.appendChild(make("div", "bhn-thread-quote", comment.anchorQuote.slice(0, 180)));

    var replies = repliesFor(comment.id);
    if (replies.length) {
      var replyList = make("div", "bhn-replies");
      replies.forEach(function(reply){
        var row = make("div", "bhn-reply");
        row.appendChild(make("div", "bhn-reply-meta", reply.authorName + " · " + formatTime(reply.createdAt)));
        row.appendChild(make("div", "bhn-reply-body", reply.body));
        replyList.appendChild(row);
      });
      card.appendChild(replyList);
    }

    var tools = make("div", "bhn-thread-tools");
    tools.appendChild(addButton("Reply", "bhn-link-btn", function(){
      state.replyTo = comment.id;
      state.replyDraft = "";
      render();
    }));
    card.appendChild(tools);
    renderReplyComposer(card, comment);
    card.addEventListener("mouseenter", function(){ showHighlight(findAnchor(comment)); });
    return card;
  }

  function render() {
    root.textContent = "";
    var shell = make("div", "bhn-shell");
    var head = make("header", "bhn-head");
    var copy = make("div", "bhn-head-copy");
    copy.appendChild(make("div", "bhn-kicker", "BioHubNet review"));
    copy.appendChild(make("div", "bhn-title", state.review.title || initialTitle));
    var identity = state.viewer ? state.viewer.name : "Training Platform account required";
    copy.appendChild(make("div", "bhn-meta", "Round " + state.review.round + " · " + identity));
    head.appendChild(copy);
    var close = addButton("×", "bhn-close", cleanup);
    close.setAttribute("aria-label", "Close website review");
    head.appendChild(close);
    shell.appendChild(head);

    var body = make("div", "bhn-body");
    if (state.error) body.appendChild(make("div", "bhn-notice bhn-error", state.error));
    if (state.loading) {
      body.appendChild(make("div", "bhn-notice", "Loading team comments..."));
    } else if (!credential || !state.viewer) {
      body.appendChild(make("div", "bhn-notice", "Open this review from the training platform to join with your account."));
    } else {
      renderComposer(body);
      var list = make("div", "bhn-list");
      var threads = topComments();
      if (!threads.length) list.appendChild(make("div", "bhn-empty", "No comments yet. Click any page element to start a thread."));
      threads.forEach(function(comment, index){ list.appendChild(renderThread(comment, index)); });
      body.appendChild(list);
    }
    shell.appendChild(body);
    root.appendChild(shell);
    syncMarkers();
  }

  function commentsSignature(comments) {
    return comments.map(function(comment){ return [comment.id, comment.body, comment.status, comment.editedAt].join(":"); }).join("|");
  }

  async function loadComments(silent) {
    if (!credential) {
      state.loading = false;
      state.error = "Open this review from the training platform to identify your account.";
      render();
      return;
    }
    try {
      var response = await fetch(endpoint, { headers: { "Authorization": "Bearer " + credential } });
      var data = await response.json().catch(function(){ return {}; });
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load team comments.");
      var changed = commentsSignature(state.comments) !== commentsSignature(data.comments || []);
      state.review = data.review;
      state.viewer = data.viewer;
      state.comments = data.comments || [];
      state.error = "";
      state.loading = false;
      var active = document.activeElement;
      if (silent && changed && active && root.contains(active) && active.tagName === "TEXTAREA") {
        state.pendingRender = true;
        return;
      }
      if (!silent || changed || state.pendingRender) {
        state.pendingRender = false;
        render();
      } else {
        syncMarkers();
      }
    } catch (error) {
      state.loading = false;
      state.error = error && error.message ? error.message : "Could not load team comments.";
      render();
    }
  }

  async function submitComment(value, parentId, anchors) {
    var body = String(value || "").trim();
    if (body.length < 2 || state.saving) return;
    state.saving = true;
    state.error = "";
    render();
    try {
      var payload = { body: body, parentId: parentId || null };
      if (anchors) {
        payload.anchorQuote = anchors.anchorQuote;
        payload.anchorKey = anchors.anchorKey;
        payload.anchorPath = anchors.anchorPath;
        payload.anchorBlock = anchors.anchorBlock;
      }
      var response = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": "Bearer " + credential, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function(){ return {}; });
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the comment.");
      state.selected = null;
      state.draft = "";
      state.replyTo = null;
      state.replyDraft = "";
      state.saving = false;
      await loadComments(false);
    } catch (error) {
      state.saving = false;
      state.error = error && error.message ? error.message : "Could not save the comment.";
      render();
    }
  }

  function removeMarkers() {
    markers.forEach(function(marker){ marker.remove(); });
    markers = [];
  }

  function focusThread(comment, anchor) {
    showHighlight(anchor);
    var card = root.querySelector('[data-thread-id="' + comment.id + '"]');
    if (card) {
      card.setAttribute("class", "bhn-thread bhn-thread-active");
      card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      window.setTimeout(function(){ card.setAttribute("class", "bhn-thread"); }, 1400);
    }
  }

  function syncMarkers() {
    if (positionFrame) window.cancelAnimationFrame(positionFrame);
    positionFrame = window.requestAnimationFrame(function(){
      removeMarkers();
      var placedAnchors = [];
      topComments().forEach(function(comment, index){
        var anchor = findAnchor(comment);
        if (!anchor) return;
        var rect = anchor.getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        var sharedIndex = placedAnchors.filter(function(placed){ return placed === anchor; }).length;
        placedAnchors.push(anchor);
        var marker = make("button", "bhn-review-marker" + (comment.status === "open" ? "" : " bhn-review-marker-resolved"), String(index + 1));
        marker.setAttribute("type", "button");
        marker.setAttribute("aria-label", "Open comment " + (index + 1) + " by " + comment.authorName);
        marker.style.left = Math.max(4, rect.right + window.scrollX - 13 - (sharedIndex * 29)) + "px";
        marker.style.top = Math.max(4, rect.top + window.scrollY - 13) + "px";
        marker.addEventListener("click", function(event){ event.preventDefault(); event.stopPropagation(); focusThread(comment, anchor); });
        document.body.appendChild(marker);
        markers.push(marker);
      });
    });
  }

  function onMove(event) {
    if (inOverlay(event.target)) { highlight.style.display = "none"; return; }
    showHighlight(event.target);
  }

  function onClick(event) {
    if (inOverlay(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    state.selected = anchorsFor(event.target);
    state.draft = "";
    state.replyTo = null;
    showHighlight(event.target);
    render();
  }

  function onKey(event) {
    if (event.key === "Escape") cleanup();
  }

  function onPositionChange() {
    syncMarkers();
  }

  function cleanup() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", onPositionChange, true);
    window.removeEventListener("resize", onPositionChange);
    if (pollTimer) window.clearInterval(pollTimer);
    if (positionFrame) window.cancelAnimationFrame(positionFrame);
    removeMarkers();
    highlight.remove();
    root.remove();
    style.remove();
    window.__bhnReviewCleanup = null;
  }

  window.__bhnReviewCleanup = cleanup;
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("scroll", onPositionChange, true);
  window.addEventListener("resize", onPositionChange);
  pollTimer = window.setInterval(function(){ loadComments(true); }, 5000);
  render();
  loadComments(false);
})();`;
}
