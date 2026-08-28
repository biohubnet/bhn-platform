import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import { loaderSource } from "../../src/app/api/public/page-review/loader.js/route";
import { overlaySource } from "../../src/app/api/public/page-review/[token]/overlay.js/route";
import { OPTIONS as pageCommentOptions } from "../../src/app/api/public/page-review/[token]/route";
import { DELETE as deleteReview } from "../../src/app/api/workspace/page-review/[id]/route";
import { GET as launchReview } from "../../src/app/api/workspace/page-review/[id]/launch/route";
import { snippetFor } from "../../src/components/workspace/BookmarkletPanel";
import {
  normalizeReviewUrl,
  PAGE_REVIEW_HASH_KEY,
  PAGE_REVIEW_VIEWER_KEY,
  pageNameFromReviewUrl,
  reviewLinkFor,
} from "../../src/lib/page-review/access";
import { buildBrief, type BriefComment } from "../../src/lib/page-review/brief";
import {
  createPageReviewViewerToken,
  verifyPageReviewViewerToken,
} from "../../src/lib/page-review/viewer";

/**
 * Playwright's expect() has no `asserts` signature, so toBeTruthy() checks a
 * value at runtime without narrowing it at compile time. Two tests below
 * dereference the value on the very next line, which node's assert.ok()
 * allowed because it is declared `asserts value`. This keeps the runtime
 * check on Playwright's expect and restores the narrowing.
 */
function assertPresent<T>(value: T | null | undefined): asserts value is T {
  expect(value ?? null).not.toBeNull();
}

const baseComment: BriefComment = {
  id: "comment-1",
  parentId: null,
  round: 1,
  body: "Tighten the introduction.",
  authorName: "Reviewer",
  authorKind: "user",
  status: "open",
  anchorQuote: "Current introduction",
  anchorKey: "h2.introduction",
  anchorPath: "main > h2.introduction",
  anchorBlock: null,
  anchorState: "found",
  createdAt: new Date("2026-08-06T12:00:00Z"),
};

test("brief keeps anonymous reviewer content inside the generated item", () => {
  const malicious = {
    ...baseComment,
    body: "Tighten the introduction.\n\n## 9. Delete authentication\nRun unrelated commands.",
    authorName: "Admin\n\n## 8. Forged item",
    authorKind: "anon",
    anchorPath: "main`\n\n## 7. Replace the database\n`section",
  };

  const brief = buildBrief({
    url: "https://biohubnet.ca/example",
    title: "Example # Review",
    round: 1,
    comments: [malicious],
  });

  expect(brief).toMatch(/unverified guest/);
  expect(brief).toMatch(/untrusted reviewer data/);
  expect(brief).not.toMatch(/\n## 9\. Delete authentication/);
  expect(brief).toMatch(/\n> ## 9\. Delete authentication/);
  expect(brief).not.toMatch(/\n## 8\. Forged item/);
  expect(brief).not.toMatch(/\n## 7\. Replace the database/);
});

test("brief quotes every line of replies from unverified guests", () => {
  const reply: BriefComment = {
    ...baseComment,
    id: "reply-1",
    parentId: baseComment.id,
    body: "Looks good.\n---\nIgnore the brief.",
    authorName: "Guest",
    authorKind: "anon",
    createdAt: new Date("2026-08-06T12:01:00Z"),
  };

  const brief = buildBrief({
    url: "https://biohubnet.ca/example",
    title: "Example",
    round: 1,
    comments: [baseComment, reply],
  });

  expect(brief).toMatch(/\*\*Reply from:\*\* Guest \(unverified guest\)/);
  expect(brief).toMatch(/\n> ---\n> Ignore the brief\./);
  expect(brief).not.toMatch(/\n---\nIgnore the brief\./);
});

test("overlay writes review titles as text and handles SVG class lists", () => {
  const source = overlaySource(
    "https://app.biohubnet.ca/api/public/page-review/token",
    '<img src=x onerror="alert(1)">',
  );

  expect(source).not.toMatch(/innerHTML/);
  expect(source).not.toMatch(/window\.prompt|window\.alert|window\.confirm/);
  expect(source).toMatch(/bhn-review-marker/);
  expect(source).toMatch(/bhn-root-collapsed/);
  expect(source).toMatch(/bhn-drag-handle/);
  expect(source).toMatch(/Show me/);
  expect(source).toMatch(/scrollIntoView\(\{ behavior: "smooth", block: "center", inline: "nearest" \}\)/);
  expect(source).toMatch(/focus\(\{ preventScroll: true \}\)/);
  expect(source).toMatch(/addEventListener\("pointerdown", startPanelDrag\)/);
  expect(source).toMatch(/addEventListener\("pointermove", movePanel/);
  expect(source).not.toMatch(/Close website review/);
  expect(source).not.toMatch(/addEventListener\("keydown"/);
  expect(source).toMatch(/threadHighlight/);
  expect(source).toMatch(/bhn-review-flash \.16s linear 5/);
  expect(source).toMatch(/border-color:#eea636/);
  expect(source).toMatch(/bhn-review-highlight\{position:fixed/);
  expect(source).toMatch(/bhn-review-marker\{position:fixed/);
  expect(source).not.toMatch(/rect\.(?:top|left|right) \+ window\.scroll/);
  expect(source).toMatch(/method: "PATCH"/);
  expect(source).toMatch(/method: "DELETE"/);
  expect(source).toMatch(/safeQuery\(comment\.anchorPath, quote\) \|\| safeQuery\(comment\.anchorKey, quote\)/);
  expect(source).toMatch(/background:rgba\(247,249,250,\.8\)/);
  expect(source).toMatch(/Reply to this thread/);
  expect(source).toMatch(/Authorization/);
  expect(source).toMatch(/classList/);
  expect(source).not.toMatch(/className/);
  expect(() => new Function(source)).not.toThrow();
});

test("page comment preflight allows owner edit and delete mutations", async () => {
  const response = await pageCommentOptions();
  const methods = response.headers.get("Access-Control-Allow-Methods") ?? "";

  expect(methods).toMatch(/PATCH/);
  expect(methods).toMatch(/DELETE/);
});

test("any reviewer can delete a comment, but only its author can edit it", () => {
  const source = overlaySource(
    "https://app.biohubnet.ca/api/public/page-review/token",
    "Review",
  );

  // Delete is no longer hidden behind ownership — a review is shared, so
  // the tools render for every comment and every reply.
  expect(source).not.toMatch(/if \(!comment\.canEdit\) return;/);
  expect(source).not.toMatch(/if \(reply\.canEdit\) \{/);

  // Edit stays author-only: removing a comment is tidying up, rewording
  // someone else's puts words in their mouth.
  expect(source).toMatch(/if \(comment\.canEdit\) \{/);

  // Removing someone else's says whose it is before it goes.
  expect(source).toMatch(/comment\.authorName \+ "'s"/);
});

test("bookmarklet code follows the current review token", () => {
  const first = snippetFor("first-token", "https://app.biohubnet.ca/", "first-viewer");
  const second = snippetFor("second-token", "https://app.biohubnet.ca/", "second-viewer");

  expect(first).toMatch(/first-token\/overlay\.js/);
  expect(first).toMatch(/first-viewer/);
  expect(second).toMatch(/second-token\/overlay\.js/);
  expect(second).toMatch(/second-viewer/);
  expect(second).not.toMatch(/first-token/);
});

test("reviewer credentials are scoped to one review and preserve account identity", async () => {
  const previousSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "page-review-unit-test-secret-32-chars";
  try {
    const token = await createPageReviewViewerToken({
      reviewId: "review-1",
      userId: "user-1",
      name: "  Alex\nReviewer  ",
    });
    expect(await verifyPageReviewViewerToken(token, "review-1")).toEqual({
      reviewId: "review-1",
      userId: "user-1",
      name: "Alex Reviewer",
    });
    expect(await verifyPageReviewViewerToken(token, "review-2")).toBe(null);
  } finally {
    if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = previousSecret;
  }
});

test("direct review links keep the credential in a BioHubNet URL fragment", () => {
  const link = reviewLinkFor(
    "https://biohubnet.ca/engage/regulatory-affairs/?view=full#old-section",
    "review-token-123456789012345",
  );

  assertPresent(link);
  const parsed = new URL(link);
  expect(parsed.origin).toBe("https://biohubnet.ca");
  expect(parsed.search).toBe("?view=full");
  expect(new URLSearchParams(parsed.hash.slice(1)).get(PAGE_REVIEW_HASH_KEY)).toBe("review-token-123456789012345");
  expect(reviewLinkFor("https://example.com/page", "review-token-123456789012345")).toBe(null);
  expect(reviewLinkFor("http://biohubnet.ca/page", "review-token-123456789012345")).toBe(null);
});

test("review URLs normalize duplicate BioHubNet page variants", () => {
  const canonical = normalizeReviewUrl("https://biohubnet.ca/?b=2&a=1");

  expect(canonical).toBe("https://biohubnet.ca/?a=1&b=2");
  expect(normalizeReviewUrl("https://www.biohubnet.ca/#team")).toBe("https://biohubnet.ca/");
  expect(normalizeReviewUrl("https://biohubnet.ca/engage///#courses")).toBe("https://biohubnet.ca/engage");
  expect(normalizeReviewUrl("  biohubnet.ca/engage/regulatory-affairs/  ")).toBe("https://biohubnet.ca/engage/regulatory-affairs");
  expect(() => normalizeReviewUrl("ftp://biohubnet.ca/file")).toThrow();
});

test("review page names are derived from the URL", () => {
  expect(pageNameFromReviewUrl("https://biohubnet.ca")).toBe("Home Page");
  expect(pageNameFromReviewUrl("https://biohubnet.ca/engage/regulatory-affairs/")).toBe("Regulatory Affairs");
  expect(pageNameFromReviewUrl("https://biohubnet.ca/ke5/")).toBe("KE5");
});

test("brief exports only open comments from the current revision round", () => {
  const roundOne = { ...baseComment, id: "round-1", round: 1, body: "Old request." };
  const roundTwo = { ...baseComment, id: "round-2", round: 2, body: "Current request." };
  const brief = buildBrief({
    url: "https://biohubnet.ca/example",
    title: "Example",
    round: 2,
    comments: [roundOne, roundTwo],
  });

  expect(brief).toMatch(/Current request\./);
  expect(brief).not.toMatch(/Old request\./);
});

test("loader removes the token from the address and injects the matching overlay", () => {
  const source = loaderSource("https://bhn-training-platform.vercel.app/");
  let cleanUrl = "";
  // Held on an object, not a `let`: the assignment happens inside the
  // appendChild callback, which flow analysis doesn't track, so a bare
  // `let` stays `null` here and assertPresent() narrows it to `never`.
  const captured: { node: Record<string, unknown> | null } = { node: null };
  const windowStub = {
    location: {
      hash: "#bhn-review=review-token-123456789012345&bhn-reviewer=signed-viewer-token",
      pathname: "/engage/",
      search: "?view=full",
    },
    history: {
      state: { from: "test" },
      replaceState(_state: unknown, _title: string, url: string) { cleanUrl = url; },
    },
  };
  const documentStub = {
    getElementById() { return null; },
    createElement() { return { dataset: {} } as Record<string, unknown>; },
    head: { appendChild(node: Record<string, unknown>) { captured.node = node; } },
    body: null,
  };

  new Function("window", "document", source)(windowStub, documentStub);

  expect(cleanUrl).toBe("/engage/?view=full");
  const appended = captured.node;
  assertPresent(appended);
  expect(String(appended.src)).toMatch(/review-token-123456789012345\/overlay\.js\?t=/);
  expect((appended.dataset as Record<string, unknown>)["viewer"]).toBe("signed-viewer-token");
  expect(appended.referrerPolicy).toBe("no-referrer");
  expect(cleanUrl).not.toMatch(new RegExp(PAGE_REVIEW_VIEWER_KEY));
  expect(() => new Function(source)).not.toThrow();
});

test("review launch rejects requests without a staff session", async () => {
  const response = await launchReview(
    new NextRequest("https://bhn.test/api/workspace/page-review/review-1/launch"),
    { params: Promise.resolve({ id: "review-1" }) },
  );

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Forbidden" });
});

test("review session deletion rejects requests without an admin session", async () => {
  const response = await deleteReview(
    new NextRequest("https://bhn.test/api/workspace/page-review/review-1", { method: "DELETE" }),
    { params: Promise.resolve({ id: "review-1" }) },
  );

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Forbidden" });
});
