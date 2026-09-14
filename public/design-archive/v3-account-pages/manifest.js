/* Single list of every mockup state. index.html, gallery.html and the
   page banners all read from here, so a state is added or renamed once.
   Grouped by the three PRs the implementation should split into.

   sim: true      — a simulated interaction or data state.
   proposed: true — behaviour the live code on origin/main does NOT have
                    today; shown so it can be approved or rejected. */
window.BHN_MANIFEST = [
  {
    pr: "PR 1",
    route: "/register",
    title: "Registration",
    file: "register.html",
    states: [
      { id: "step1", label: "Step 1 · Account" },
      { id: "step1-validation", label: "Step 1 · Validation on Next", sim: true },
      { id: "step1-focus", label: "Step 1 · Keyboard focus", sim: true },
      { id: "step2", label: "Step 2 · Contact & institution" },
      { id: "step2-custom-institution", label: "Step 2 · Non-member institution", sim: true },
      { id: "step2-validation", label: "Step 2 · Validation on Next", sim: true },
      { id: "step3", label: "Step 3 · Status & education" },
      { id: "step3-graduate", label: "Step 3 · Graduate Program fields", sim: true },
      { id: "step3-other", label: "Step 3 · Other fields", sim: true },
      { id: "step3-employment", label: "Step 3 · Postdoc / RA / technician", sim: true },
      { id: "step3-diversity", label: "Step 3 · Diversity self-identification", sim: true, proposed: true },
      { id: "step3-validation", label: "Step 3 · Validation on submit", sim: true },
      { id: "server-error", label: "Server error banner", sim: true },
      { id: "submitting", label: "Submitting", sim: true, proposed: true },
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
      { id: "submitting", label: "Sending", sim: true, proposed: true },
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
