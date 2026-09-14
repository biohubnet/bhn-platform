/* Mockup-only helpers. Nothing here talks to a network, an API, Auth0 or
   a database. Every "submit" is a local setTimeout that swaps markup. */
(function () {
  const params = new URLSearchParams(location.search);
  const isEmbed = params.get("embed") === "1";

  function stateParam(fallback) {
    return params.get("state") || fallback;
  }

  /* Mirrors keepLastWordsTogether() in pre-login-page.tsx: bind the last
     two words with a no-break space so a heading or line never ends on a
     one-word orphan. Applied only to the last TEXT node, so markup inside
     the element survives. */
  function keepLastWordsTogether(root) {
    (root || document).querySelectorAll("[data-keep-last]").forEach((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let last = null;
      while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) last = walker.currentNode;
      if (last) last.nodeValue = last.nodeValue.replace(/\s+(\S+)\s*$/, " $1");
    });
  }

  /* The yellow striped bar across the top of every mockup. It is chrome
     for the review, not part of the design, and says so. */
  function banner(opts) {
    const bar = document.createElement("div");
    bar.className = "sim-banner";
    bar.setAttribute("role", "note");
    /* Inside the gallery's scaled frames the full state nav is noise, but
       the "this is a simulation" label must survive, so embed mode keeps a
       one-line strip rather than removing the banner. */
    if (isEmbed) {
      /* Only a label from the manifest is ever written into the page. The
         raw ?state= value comes from the URL, so echoing it into innerHTML
         would let a crafted link inject markup on this origin. */
      const known = opts.states.find((s) => s.id === opts.current);
      bar.innerHTML = `<strong>Simulation</strong><span>${opts.page} · ${known ? known.label : "Unknown state"}</span>`;
      document.body.prepend(bar);
      return;
    }
    const links = opts.states
      .map((s) => {
        const href = `?state=${encodeURIComponent(s.id)}`;
        const cur = s.id === opts.current ? ' aria-current="true"' : "";
        return `<a href="${href}"${cur}>${s.label}</a>`;
      })
      .join("");
    const extra = (opts.extra || [])
      .map((x) => `<a href="${x.href}"${x.current ? ' aria-current="true"' : ""}>${x.label}</a>`)
      .join("");
    bar.innerHTML =
      `<strong>Simulation</strong><span>${opts.page} · synthetic data · nothing is sent</span>` +
      `<nav aria-label="Mockup states">${links}${extra}<a href="index.html">All pages</a></nav>`;
    document.body.prepend(bar);
  }

  function arrow() {
    return '<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function arrowBack() {
    return '<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M16 10H5m4 4-4-4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function alertIcon() {
    return '<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.5"/><path d="M10 6.4v4.4M10 13.4v.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }

  /* Page frame shared by every mockup: aurora, grid, logo header, footer.
     Copied from the approved pre-login structure. */
  /* opts.login     — add the right-hand "Log in" link (account pages only;
                       the approved pre-login page has a logo-only header).
     opts.logoLabel — accessible name for the logo link. The account-page
                       tests expect a banner link named exactly "BioHubNet";
                       the pre-login page uses "BioHubNet home". */
  function frame(inner, opts) {
    opts = opts || {};
    const year = new Date().getFullYear();
    const logoLabel = opts.logoLabel || "BioHubNet home";
    const login = opts.login
      ? `<a class="bhn-acct-header-link" href="#" onclick="return false">Log in</a>`
      : "";
    return `
      <div class="bhn-acct">
        <div class="bhn-acct-aurora" aria-hidden="true"></div>
        <div class="bhn-acct-grid" aria-hidden="true"></div>
        <header class="bhn-acct-header">
          <a href="#" aria-label="${logoLabel}" onclick="return false">
            <img class="bhn-acct-logo" src="assets/biohubnet-logo-white@960.png"
                 alt="BioHubNet Transformative Talent Development" width="960" height="252">
          </a>
          ${login}
        </header>
        <main class="bhn-acct-main">${inner}</main>
        <footer class="bhn-acct-footer">
          <p>© ${year} BioHubNet. All rights reserved.</p>
          <a href="#" onclick="return false">Visit BioHubNet.ca ${arrow()}<span class="sr-only">(opens in a new tab)</span></a>
        </footer>
      </div>`;
  }

  /* Simulated async submit: disable the control, show the pending label,
     then run `done` after a short delay. No request is made. */
  function simulateSubmit(button, pendingLabel, done, ms) {
    const original = button.innerHTML;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<span>${pendingLabel}</span><span class="bhn-acct-spinner" aria-hidden="true"></span>`;
    setTimeout(() => {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = original;
      done();
    }, ms || 1100);
  }

  /* Simulated native validation. Shows a bubble in the browser's own
     style directly under the field and marks the field invalid, which
     triggers the PROPOSED rose underline. Both are labelled. */
  function bubble(field, message) {
    clearBubbles(document);
    field.setAttribute("aria-invalid", "true");
    const b = document.createElement("div");
    b.className = "sim-bubble";
    b.setAttribute("role", "note");
    b.innerHTML =
      `<span class="sim-bubble-tag">Browser message · simulated</span>` +
      `<span class="sim-bubble-body"><span class="sim-bubble-icon" aria-hidden="true">!</span><span>${message}</span></span>`;
    const tag = document.createElement("p");
    tag.className = "sim-tag-row";
    tag.innerHTML = `<span class="sim-tag is-proposed">Proposed: rose underline on the invalid field</span>`;
    field.insertAdjacentElement("afterend", b);
    b.insertAdjacentElement("afterend", tag);
  }
  function clearBubbles(root) {
    (root || document).querySelectorAll(".sim-bubble, .sim-tag-row").forEach((n) => n.remove());
    (root || document).querySelectorAll('[aria-invalid="true"]').forEach((n) => n.removeAttribute("aria-invalid"));
  }

  /* Chrome's wording for a type="email" field, used only to populate the
     simulated bubble. The live app defines no email message of its own. */
  function emailMessage(v) {
    if (!v.includes("@")) return `Please include an '@' in the email address. '${v}' is missing an '@'.`;
    const [a, b] = v.split("@");
    if (!a) return `Please enter a part followed by '@'. '${v}' is incomplete.`;
    if (!b) return `Please enter a part following '@'. '${v}' is incomplete.`;
    return null;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* The gallery loads every frame at once. A real focus() from a focus or
     validation state scrolls the parent page down to that frame, so embedded
     frames keep the drawn focus ring (is-sim-focus) and leave focus alone.
     They still bring the field into their OWN view the way focus() would
     (centred, only when off-screen): window.scrollTo inside a frame scrolls
     that frame only, where scrollIntoView would move the gallery too. */
  function focusField(el) {
    if (!el) return;
    if (!isEmbed) { el.focus(); return; }
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    window.scrollTo(0, Math.max(0, r.top + window.scrollY - (window.innerHeight - r.height) / 2));
  }

  window.BHNSim = { stateParam, keepLastWordsTogether, banner, frame, simulateSubmit, arrow, arrowBack, alertIcon, bubble, clearBubbles, emailMessage, esc, focusField };
})();
