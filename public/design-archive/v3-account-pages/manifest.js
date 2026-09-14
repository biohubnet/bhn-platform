/* Single list of every mockup state. index.html, gallery.html and the
   page banners all read from here, so a state is added or renamed once.
   Grouped by the three PRs the implementation should split into.

   sim: true — a simulated interaction or data state. */
window.BHN_MANIFEST = [
  {
    pr: "PR 1",
    route: "/register",
    title: "Registration",
    file: "register.html",
    states: [
      { id: "step1", label: "Step 1 · About You" },
      { id: "step1-validation", label: "Step 1 · Validation on Next", sim: true },
      { id: "step1-focus", label: "Step 1 · Keyboard focus", sim: true },
      { id: "step2", label: "Step 2 · Education" },
      { id: "step2-non-member", label: "Step 2 · Non-member institution", sim: true },
      { id: "step2-validation", label: "Step 2 · Validation on Next", sim: true },
      { id: "step3", label: "Step 3 · Registration Survey" },
      { id: "step3-answered", label: "Step 3 · Survey answered", sim: true },
      { id: "step3-validation", label: "Step 3 · Validation on Next", sim: true },
      { id: "step4", label: "Step 4 · Diversity, comments & terms" },
      { id: "step4-answered", label: "Step 4 · Answered", sim: true },
      { id: "step4-validation", label: "Step 4 · Validation on Submit", sim: true },
      { id: "server-error", label: "Server error banner", sim: true },
      { id: "submitting", label: "Submitting", sim: true },
      { id: "submitted", label: "Application submitted (existing page)", sim: true },
    ],
  },
  {
    pr: "PR 2",
    route: "/forgot-password",
    title: "Forgot password",
    file: "forgot-password.html",
    states: [
      { id: "default", label: "Default" },
      { id: "focus", label: "Keyboard focus", sim: true },
      { id: "validation-empty", label: "Validation · empty", sim: true },
      { id: "validation-format", label: "Validation · email format", sim: true },
      { id: "submitting", label: "Sending", sim: true },
    ],
  },
  {
    pr: "PR 3",
    route: "/reset-password",
    title: "Reset-password confirmation",
    file: "reset-password.html",
    states: [
      { id: "sent", label: "Check your email · ?sent=1" },
      { id: "direct", label: "Check your email · no param", sim: true },
      { id: "focus", label: "Keyboard focus", sim: true },
    ],
  },
];
