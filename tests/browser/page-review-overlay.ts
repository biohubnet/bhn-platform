import assert from "node:assert/strict";
import { chromium, type Page, type Route } from "@playwright/test";
import { overlaySource } from "../../src/app/api/public/page-review/[token]/overlay.js/route";

const endpoint = "https://review.test/api/public/page-review/review-token";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

type Comment = {
  id: string;
  parentId: string | null;
  round: number;
  anchorQuote: string | null;
  anchorKey: string | null;
  anchorPath: string | null;
  anchorBlock: string | null;
  anchorState: string;
  authorUserId: string;
  authorName: string;
  authorKind: string;
  body: string;
  status: string;
  editedAt: string | null;
  createdAt: string;
};

const comments: Comment[] = [{
  id: "thread-priya",
  parentId: null,
  round: 1,
  anchorQuote: "A national network for biomanufacturing talent",
  anchorKey: "#review-heading",
  anchorPath: "main > h1#review-heading",
  anchorBlock: null,
  anchorState: "found",
  authorUserId: "priya-shah",
  authorName: "Priya Shah",
  authorKind: "user",
  body: "Could this headline be more specific?",
  status: "open",
  editedAt: null,
  createdAt: "2026-08-06T18:00:00.000Z",
}];

function viewerName(route: Route) {
  return route.request().headers()["authorization"]?.includes("viewer-jordan")
    ? "Jordan Lee"
    : "Alex Reviewer";
}

function publicComment(comment: Comment, viewer: string) {
  const { authorUserId, ...data } = comment;
  return { ...data, canEdit: authorUserId === viewer };
}

async function mockPage(page: Page, credential: string) {
  await page.route("https://site.test/", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><html><head><title>Review fixture</title><style>html{margin-top:32px}body{position:relative;min-height:1800px}main{padding-top:700px}a.button-dark{display:inline-block;margin:8px;padding:10px}</style></head><body><main><a data-fixture=\"preliminary-program\" class=\"button button-dark\">VIEW PRELIMINARY PROGRAM</a><a data-fixture=\"calendar-hold\" class=\"button button-dark\">DOWNLOAD CALENDAR HOLD</a><h1 id=\"review-heading\">A national network for biomanufacturing talent</h1><p>Supporting teams across Canada.</p></main></body></html>",
  }));
  await page.route(endpoint, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (request.method() === "POST") {
      const data = request.postDataJSON() as Partial<Comment> & { body: string };
      const parent = data.parentId
        ? comments.find((comment) => comment.id === data.parentId)
        : null;
      const comment: Comment = {
        id: `comment-${comments.length + 1}`,
        parentId: parent?.parentId ?? parent?.id ?? null,
        round: 1,
        anchorQuote: parent?.anchorQuote ?? data.anchorQuote ?? null,
        anchorKey: parent?.anchorKey ?? data.anchorKey ?? null,
        anchorPath: parent?.anchorPath ?? data.anchorPath ?? null,
        anchorBlock: parent?.anchorBlock ?? data.anchorBlock ?? null,
        anchorState: "found",
        authorUserId: viewerName(route),
        authorName: viewerName(route),
        authorKind: "user",
        body: data.body,
        status: "open",
        editedAt: null,
        createdAt: new Date().toISOString(),
      };
      comments.push(comment);
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ ok: true, comment: publicComment(comment, viewerName(route)) }) });
      return;
    }
    if (request.method() === "PATCH") {
      const data = request.postDataJSON() as { id: string; body: string };
      const comment = comments.find((item) => item.id === data.id);
      if (!comment || comment.authorUserId !== viewerName(route)) {
        await route.fulfill({ status: 403, headers: cors, body: JSON.stringify({ error: "You can only edit your own comments." }) });
        return;
      }
      comment.body = data.body;
      comment.editedAt = new Date().toISOString();
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ ok: true, comment: publicComment(comment, viewerName(route)) }) });
      return;
    }
    if (request.method() === "DELETE") {
      const data = request.postDataJSON() as { id: string };
      const comment = comments.find((item) => item.id === data.id);
      if (!comment || comment.authorUserId !== viewerName(route)) {
        await route.fulfill({ status: 403, headers: cors, body: JSON.stringify({ error: "You can only delete your own comments." }) });
        return;
      }
      for (let index = comments.length - 1; index >= 0; index -= 1) {
        if (comments[index].id === comment.id || comments[index].parentId === comment.id) comments.splice(index, 1);
      }
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ ok: true }) });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: cors,
      body: JSON.stringify({
        ok: true,
        review: { title: "Home Page", round: 1, status: "open" },
        viewer: { id: viewerName(route).toLowerCase(), name: viewerName(route) },
        comments: comments.map((comment) => publicComment(comment, viewerName(route))),
      }),
    });
  });

  await page.goto("https://site.test/");
  await page.evaluate(({ source, credentialValue }) => {
    const script = document.createElement("script");
    script.dataset.viewer = credentialValue;
    script.textContent = source;
    document.body.appendChild(script);
  }, {
    source: overlaySource(endpoint, "Home Page"),
    credentialValue: credential,
  });
  await page.getByText("Round 1", { exact: false }).waitFor();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const alex = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await mockPage(alex, "viewer-alex");
    await alex.getByText("Could this headline be more specific?").waitFor();
    await alex.evaluate(() => window.scrollTo(0, 500));
    await alex.waitForTimeout(50);
    assert.equal(await alex.locator(".bhn-review-marker").count(), 1);
    const initialPanel = await alex.locator("#bhn-review-overlay").boundingBox();
    assert.ok(initialPanel && initialPanel.width <= 304);
    assert.match(
      await alex.locator(".bhn-shell").evaluate((shell) => getComputedStyle(shell).backgroundColor),
      /0\.8\)/,
    );

    const priyaThread = alex.locator("article", { hasText: "Could this headline be more specific?" });
    await priyaThread.hover();
    const flashAnimation = await alex.locator(".bhn-review-highlight").evaluate((node) => ({
      name: getComputedStyle(node).animationName,
      iterations: getComputedStyle(node).animationIterationCount,
      duration: getComputedStyle(node).animationDuration,
    }));
    assert.deepEqual(flashAnimation, {
      name: "bhn-review-flash",
      iterations: "5",
      duration: "0.16s",
    });
    await priyaThread.evaluate((card) => {
      card.dispatchEvent(new MouseEvent("mouseleave"));
      card.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    });
    assert.equal(
      await alex.locator(".bhn-review-highlight").evaluate((node) => node.classList.contains("bhn-review-highlight-flash")),
      true,
    );
    const headingBox = await alex.locator("#review-heading").boundingBox();
    const highlightBox = await alex.locator(".bhn-review-highlight").boundingBox();
    assert.ok(headingBox && highlightBox);
    assert.ok(Math.abs(headingBox.width - highlightBox.width) <= 4);
    assert.ok(Math.abs(headingBox.height - highlightBox.height) <= 4);
    assert.ok(Math.abs(headingBox.x - highlightBox.x) < 1);
    assert.ok(Math.abs(headingBox.y - highlightBox.y) < 1);
    const markerBox = await alex.locator(".bhn-review-marker").boundingBox();
    assert.ok(markerBox);
    assert.ok(Math.abs(markerBox.x + markerBox.width / 2 - (headingBox.x + headingBox.width)) < 1);
    assert.ok(Math.abs(markerBox.y + markerBox.height / 2 - headingBox.y) < 1);
    await priyaThread.getByRole("button", { name: "Expand comment 1" }).click();
    assert.equal(await priyaThread.getByRole("button", { name: "Edit comment by Priya Shah" }).count(), 0);
    assert.equal(await priyaThread.getByRole("button", { name: "Delete comment by Priya Shah" }).count(), 0);

    await alex.locator("#review-heading").click();
    await alex.getByLabel("New review comment").fill("Add the national scope to this headline.");
    await alex.getByRole("button", { name: "Add comment" }).click();
    await alex.getByText("Add the national scope to this headline.").waitFor();

    let alexThread = alex.locator("article", { hasText: "Add the national scope to this headline." });
    await alexThread.getByRole("button", { name: "Edit comment by Alex Reviewer" }).click();
    await alex.getByRole("textbox", { name: "Edit comment by Alex Reviewer" }).fill("Add Canada to make the national scope explicit.");
    await alex.getByRole("button", { name: "Save", exact: true }).click();
    await alex.getByText("Add Canada to make the national scope explicit.").waitFor();

    const jordan = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mockPage(jordan, "viewer-jordan");
    alexThread = jordan.locator("article", { hasText: "Add Canada to make the national scope explicit." });
    await alexThread.hover();
    assert.equal(await jordan.locator(".bhn-review-highlight").evaluate((node) => getComputedStyle(node).display), "block");
    assert.equal(await alexThread.getByRole("button", { name: "Edit comment by Alex Reviewer" }).count(), 0);
    assert.equal(await alexThread.getByRole("button", { name: "Delete comment by Alex Reviewer" }).count(), 0);
    await alexThread.getByRole("button", { name: "Expand comment 2" }).click();
    await alexThread.getByRole("button", { name: "Reply" }).click();
    await jordan.getByLabel("Reply to Alex Reviewer").fill("Agreed. I would mention Canada directly.");
    await jordan.getByRole("button", { name: "Reply", exact: true }).last().click();
    await jordan.getByText("Agreed. I would mention Canada directly.").waitFor();

    await alex.getByText("Agreed. I would mention Canada directly.").waitFor({ timeout: 8_000 });
    let jordanReply = jordan.locator(".bhn-reply", { hasText: "Agreed. I would mention Canada directly." });
    await jordanReply.getByRole("button", { name: "Edit reply by Jordan Lee" }).click();
    await jordan.getByRole("textbox", { name: "Edit reply by Jordan Lee" }).fill("Agreed. Mention Canada directly.");
    await jordan.getByRole("button", { name: "Save", exact: true }).click();
    await alex.getByText("Agreed. Mention Canada directly.").waitFor({ timeout: 8_000 });
    jordanReply = jordan.locator(".bhn-reply", { hasText: "Agreed. Mention Canada directly." });
    await jordanReply.getByRole("button", { name: "Delete reply by Jordan Lee" }).click();
    await jordanReply.getByText("Delete this reply?").waitFor();
    await jordanReply.getByRole("button", { name: "Delete", exact: true }).click();
    await jordan.getByText("Agreed. Mention Canada directly.").waitFor({ state: "detached" });
    await alex.getByText("Agreed. Mention Canada directly.").waitFor({ state: "detached", timeout: 8_000 });

    await alex.locator('[data-fixture="calendar-hold"]').click();
    await alex.getByLabel("New review comment").fill("Clarify the calendar download format.");
    await alex.getByRole("button", { name: "Add comment" }).click();
    await alex.getByText("Clarify the calendar download format.").waitFor();
    const calendarComment = comments.find((comment) => comment.body === "Clarify the calendar download format.");
    assert.ok(calendarComment);
    assert.equal(calendarComment.anchorQuote, "DOWNLOAD CALENDAR HOLD");
    assert.equal(calendarComment.anchorKey, null);
    assert.match(calendarComment.anchorPath ?? "", /a\.button\.button-dark:nth-of-type\(2\)/);
    const calendarThread = alex.locator("article", { hasText: "Clarify the calendar download format." });
    await calendarThread.hover();
    const calendarBox = await alex.locator('[data-fixture="calendar-hold"]').boundingBox();
    const preliminaryBox = await alex.locator('[data-fixture="preliminary-program"]').boundingBox();
    const calendarHighlightBox = await alex.locator(".bhn-review-highlight").boundingBox();
    assert.ok(calendarBox && preliminaryBox && calendarHighlightBox);
    assert.ok(Math.abs(calendarBox.x - calendarHighlightBox.x) < 1);
    assert.ok(Math.abs(calendarBox.y - calendarHighlightBox.y) < 1);
    assert.ok(Math.abs(preliminaryBox.x - calendarHighlightBox.x) > 1);
    await calendarThread.getByRole("button", { name: "Delete comment by Alex Reviewer" }).click();
    await calendarThread.getByText("Delete this thread and its replies?").waitFor();
    await calendarThread.getByRole("button", { name: "Delete", exact: true }).click();
    await alex.getByText("Clarify the calendar download format.").waitFor({ state: "detached" });

    const markerPositions = await alex.locator(".bhn-review-marker").evaluateAll((markers) =>
      markers.map((marker) => (marker as HTMLElement).style.left),
    );
    assert.equal(new Set(markerPositions).size, markerPositions.length);
    const mobilePanel = await jordan.locator("#bhn-review-overlay").boundingBox();
    assert.ok(mobilePanel);
    assert.ok(mobilePanel.x >= 0 && mobilePanel.x + mobilePanel.width <= 390);
    assert.ok(mobilePanel.y >= 0 && mobilePanel.y + mobilePanel.height <= 844);

    await jordan.getByRole("button", { name: "Collapse comments" }).click();
    await jordan.waitForTimeout(250);
    const collapsedPanel = await jordan.locator("#bhn-review-overlay").boundingBox();
    assert.ok(collapsedPanel && collapsedPanel.width <= 76);
    assert.equal(await jordan.locator(".bhn-body").isVisible(), false);
    await jordan.getByRole("button", { name: "Expand 2 comments" }).click();
    assert.equal(await jordan.locator(".bhn-body").isVisible(), true);

    await alex.screenshot({ path: "/tmp/bhn-review-overlay-desktop.png", fullPage: true });
    await jordan.screenshot({ path: "/tmp/bhn-review-overlay-mobile.png", fullPage: true });
    console.log(JSON.stringify({
      desktopThreads: await alex.locator(".bhn-thread").count(),
      desktopMarkers: await alex.locator(".bhn-review-marker").count(),
      mobileThreads: await jordan.locator(".bhn-thread").count(),
      sharedCommentEdited: true,
      ownedReplyEditedAndDeleted: true,
      repeatedButtonAnchorResolved: true,
      threadHoverHighlightsAnchor: true,
      compactTranslucentPanel: true,
      collapsedRailWidth: collapsedPanel.width,
      mobilePanelWithinViewport: true,
    }));
  } finally {
    await browser.close();
  }
}

void main();
