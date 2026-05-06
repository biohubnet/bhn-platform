(function () {
  const PAGES = [
    { id: "overview", src: "pages/01-overview.html" },
    { id: "contamination", src: "pages/02-contamination.html" },
    { id: "practices", src: "pages/03-practices.html" },
    { id: "quiz", src: "pages/04-quiz.html" },
  ];
  const CORRECT = { q1: "b", q2: "b", q3: "a", q4: "b", q5: "b" };
  const PASS_PCT = 80;

  const frame = document.getElementById("frame");
  const stepsEl = document.getElementById("steps");
  const status = document.getElementById("lms-status");
  const indicator = document.getElementById("page-indicator");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");

  let idx = 0;
  let visited = new Set([0]);
  let quizSubmitted = false;
  let finalScore = null;

  // --- LMS init ---
  const ok = window.SCORM.init();
  if (ok) {
    status.textContent = "LMS connected";
    const lessonStatus = window.SCORM.get("cmi.core.lesson_status");
    if (!lessonStatus || lessonStatus === "not attempted" || lessonStatus === "") {
      window.SCORM.set("cmi.core.lesson_status", "incomplete");
    }
    const resume = window.SCORM.get("cmi.core.lesson_location");
    if (resume) {
      const i = PAGES.findIndex((p) => p.id === resume);
      if (i >= 0) idx = i;
    }
    window.SCORM.commit();
  } else {
    status.textContent = "Standalone preview (no LMS)";
  }

  function updateUI() {
    indicator.textContent = `Page ${idx + 1} of ${PAGES.length}`;
    prevBtn.disabled = idx === 0;
    nextBtn.textContent = idx === PAGES.length - 1 ? "Finish" : "Next →";
    Array.from(stepsEl.children).forEach((li, i) => {
      li.classList.toggle("active", i === idx);
      li.classList.toggle("done", i < idx || visited.has(i + 1));
    });
  }

  function go(i) {
    idx = Math.max(0, Math.min(PAGES.length - 1, i));
    visited.add(idx);
    frame.src = PAGES[idx].src;
    if (window.SCORM.available) {
      window.SCORM.set("cmi.core.lesson_location", PAGES[idx].id);
      window.SCORM.commit();
    }
    updateUI();
  }

  prevBtn.addEventListener("click", () => go(idx - 1));

  nextBtn.addEventListener("click", () => {
    if (idx < PAGES.length - 1) {
      go(idx + 1);
    } else {
      // Finish — only allowed after quiz submitted
      if (!quizSubmitted) {
        alert("Please complete the knowledge check before finishing.");
        return;
      }
      finalize();
    }
  });

  function finalize() {
    if (window.SCORM.available && finalScore != null) {
      const passed = finalScore >= PASS_PCT;
      window.SCORM.set("cmi.core.score.raw", String(finalScore));
      window.SCORM.set("cmi.core.score.min", "0");
      window.SCORM.set("cmi.core.score.max", "100");
      window.SCORM.set("cmi.core.lesson_status", passed ? "passed" : "failed");
      window.SCORM.commit();
      window.SCORM.finish();
    }
    status.textContent = "Course completed — you may close this window.";
    nextBtn.disabled = true;
  }

  // Wire up the quiz submission from inside the iframe.
  // The quiz page posts back to us via a global hook.
  window.__bhnQuizSubmit = function (score) {
    quizSubmitted = true;
    finalScore = score;
    if (window.SCORM.available) {
      window.SCORM.set("cmi.core.score.raw", String(score));
      window.SCORM.commit();
    }
  };

  // When the iframe loads the quiz page, attach a submit handler.
  frame.addEventListener("load", () => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const submit = doc.getElementById("submit-quiz");
      if (!submit) return;
      submit.addEventListener("click", () => {
        const form = doc.getElementById("quiz");
        let correct = 0;
        Object.keys(CORRECT).forEach((q) => {
          const v = form.elements[q] && form.elements[q].value;
          if (v === CORRECT[q]) correct++;
        });
        const score = Math.round((correct / Object.keys(CORRECT).length) * 100);
        const result = doc.getElementById("quiz-result");
        result.textContent = `Score: ${score}% — ${score >= PASS_PCT ? "Passed" : "Did not pass"}`;
        result.className = score >= PASS_PCT ? "pass" : "fail";
        submit.disabled = true;
        window.__bhnQuizSubmit(score);
      });
    } catch (e) {
      // Cross-origin frame — shouldn't happen with same-origin SCORM
      console.warn("Quiz handler attach failed", e);
    }
  });

  // Initial render
  updateUI();
})();
