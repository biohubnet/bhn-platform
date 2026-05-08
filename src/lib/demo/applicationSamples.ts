/**
 * Browser-only helpers for the admin "Fill with sample" button on the
 * My Application page. Two parts:
 *
 *   • generateSampleResumePdf  — single-page resume rendered via jsPDF
 *     so we get a real PDF (not a 700-byte placeholder), exercising the
 *     same PDF text-extraction pipeline the skill ontology uses.
 *
 *   • recordSampleIntroVideo   — animates a <canvas> for ~8 seconds and
 *     records it as WebM via MediaRecorder. Real encoded video; no
 *     hand-crafted H.264 byte-pile, no ffmpeg dependency. The output
 *     is a valid WebM file that plays in the same <video> tag the
 *     trainee uses.
 *
 * Both are dynamically imported so jsPDF and MediaRecorder code only
 * ship to the bundle when an admin actually clicks the button.
 *
 * Browser support note: MediaRecorder ships in all modern Chromium /
 * Firefox / Safari builds. We pick the first supported mimeType from
 * a preference list (WebM/VP9, WebM/VP8, MP4) so Safari's MP4-only
 * MediaRecorder still works.
 */

export const SAMPLE_PITCH =
  "I'm a Master's-level cell-culture engineer with three years of hands-on bioreactor scale-up at a McMaster spin-out. I led the move from 2L bench to 50L pilot for a CHO-cell mAb process — designing the seed-train, building the OOS-investigation playbook, and shaving five days off the title. I'm now looking for a downstream-process role at a Canadian CDMO where I can pair my analytical-chemistry background with hands-on column work, eventually growing into a tech-transfer lead.";

const SAMPLE_RESUME = {
  name: "Sample Trainee",
  email: "sample.trainee@biohubnetwork.ca",
  phone: "+1 (905) 555-0142",
  location: "Hamilton, ON",
  summary:
    "Cell-culture and downstream-process engineer with three years of hands-on bioreactor scale-up. M.A.Sc. Chemical Engineering, McMaster. Looking for a CDMO role bridging upstream and analytical chemistry.",
  education: [
    "M.A.Sc. Chemical Engineering — McMaster University (2024)",
    "B.Sc. Honours Biochemistry — University of Waterloo (2022)",
  ],
  experience: [
    {
      role: "Process Development Engineer (Co-op)",
      org: "Lumira Bio, Hamilton ON · 2023 – 2024",
      bullets: [
        "Scaled CHO-cell mAb process from 2L to 50L pilot; redesigned seed-train and OOS playbook.",
        "Cut tech-transfer turnaround by 5 days through standardised media QC + sampling cadence.",
        "Authored SOPs and training material for two new junior process engineers.",
      ],
    },
    {
      role: "Research Assistant — Analytical Chemistry",
      org: "Waterloo School of Pharmacy · 2021 – 2022",
      bullets: [
        "Method-developed HPLC-UV assay for excipient stability across 8 small-molecule formulations.",
        "Co-authored two posters (CSPS, AAPS) and a manuscript currently under review.",
      ],
    },
  ],
  skills: [
    "Bioreactor scale-up", "CHO-cell culture", "HPLC-UV", "Analytical chemistry",
    "OOS investigation", "Tech transfer", "GMP documentation", "MATLAB", "Python (pandas)",
  ],
};

/**
 * Build a real-looking single-page resume PDF using jsPDF.
 * Returns a Blob (not a Buffer — this is the browser).
 */
export async function generateSampleResumePdf(opts: { name?: string }): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const data = { ...SAMPLE_RESUME, name: opts.name?.trim() || SAMPLE_RESUME.name };
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 56; // ~0.78 in
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(data.name, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${data.email}  ·  ${data.phone}  ·  ${data.location}`, margin, y);
  y += 18;
  doc.setTextColor(40);

  // Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SUMMARY", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(data.summary, pageWidth - margin * 2);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 13 + 8;

  // Education
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EDUCATION", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const e of data.education) {
    doc.text(`• ${e}`, margin, y);
    y += 13;
  }
  y += 6;

  // Experience
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EXPERIENCE", margin, y);
  y += 14;
  for (const job of data.experience) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(job.role, margin, y);
    y += 12;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(110);
    doc.text(job.org, margin, y);
    y += 12;
    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    for (const b of job.bullets) {
      const lines = doc.splitTextToSize(`• ${b}`, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 12;
    }
    y += 6;
  }

  // Skills
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SKILLS", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const skillsLines = doc.splitTextToSize(data.skills.join(" · "), pageWidth - margin * 2);
  doc.text(skillsLines, margin, y);

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "BHN demo — sample resume generated by the My Application admin tool.",
    margin,
    doc.internal.pageSize.getHeight() - 24
  );

  return doc.output("blob");
}

/**
 * Pick the best-supported MediaRecorder mimeType. Returns null if
 * none works (very old browsers, or Safari without recording support).
 */
function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4;codecs=h264",
    "video/mp4",
  ];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * Animate a 640x360 canvas for `durationMs` and record it as
 * WebM/MP4 via MediaRecorder. Returns a Blob suitable for upload.
 */
export async function recordSampleIntroVideo(opts: {
  name?: string;
  durationMs?: number;
}): Promise<Blob> {
  const duration = Math.max(2000, opts.durationMs ?? 8000);
  const name = (opts.name ?? "Sample Trainee").trim();

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  const mime = pickRecorderMime();
  if (!mime) throw new Error("Your browser doesn't support MediaRecorder — try Chrome or Firefox.");

  // captureStream is the standard way to feed a canvas into MediaRecorder.
  const stream = (canvas as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream;
  }).captureStream?.(30);
  if (!stream) throw new Error("Canvas captureStream unsupported.");

  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

  // Storyboard — 4 slides over the duration.
  const slides = [
    { title: "Hi, I'm " + name + ".", sub: "M.A.Sc. — Chemical Engineering, McMaster" },
    { title: "Three years on bioreactor scale-up.", sub: "2L bench → 50L pilot · CHO-cell mAb · CDMO-style PD" },
    { title: "Looking for a downstream role.", sub: "Column work · analytical chemistry · tech transfer" },
    { title: "Thanks for watching.", sub: "BHN — sample video introduction (admin demo)" },
  ];

  const start = performance.now();
  let raf = 0;

  function frame(now: number) {
    const t = Math.min(1, (now - start) / duration);
    const slideIdx = Math.min(slides.length - 1, Math.floor(t * slides.length));
    const slide = slides[slideIdx];
    const slideT = (t * slides.length) % 1; // 0..1 within current slide
    drawFrame(ctx!, canvas.width, canvas.height, slide, slideT, t);
    if (recorder.state === "recording") raf = requestAnimationFrame(frame);
  }

  recorder.start(100); // request a chunk every 100 ms so the buffer flushes
  raf = requestAnimationFrame(frame);

  const blob: Blob = await new Promise((resolve, reject) => {
    recorder.onerror = (e) => reject(new Error("Recorder error: " + (e as ErrorEvent).message));
    recorder.onstop = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((tr) => tr.stop());
      resolve(new Blob(chunks, { type: chunks[0]?.type || mime }));
    };
    setTimeout(() => {
      try { recorder.stop(); } catch { /* already stopped */ }
    }, duration);
  });
  return blob;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  slide: { title: string; sub: string },
  slideT: number,
  globalT: number,
) {
  // Soft animated gradient background so the video has motion.
  const g = ctx.createLinearGradient(0, 0, w, h);
  const hue = 215 + Math.sin(globalT * Math.PI * 2) * 10;
  g.addColorStop(0, `hsl(${hue}, 50%, 22%)`);
  g.addColorStop(1, `hsl(${hue + 30}, 45%, 14%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid lines for visual interest.
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // BHN brand mark (top-left)
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 14px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("BHN — sample introduction", 24, 22);

  // Title — slide-in from below, fade-in
  const fade = Math.min(1, slideT * 4);   // first 25 % fade in
  const out  = Math.max(0, 1 - (slideT - 0.85) * 6); // last 15 % fade out
  const opacity = Math.max(0, Math.min(fade, out));
  const slide_y = (1 - fade) * 18;

  ctx.globalAlpha = opacity;
  ctx.fillStyle = "white";
  ctx.font = "bold 36px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(slide.title, w / 2, h / 2 - 16 + slide_y);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "16px -apple-system, system-ui, sans-serif";
  ctx.fillText(slide.sub, w / 2, h / 2 + 24 + slide_y);
  ctx.globalAlpha = 1;

  // Recording dot (bottom-right) — pulses
  const pulse = 0.5 + 0.5 * Math.sin(globalT * Math.PI * 8);
  ctx.fillStyle = `rgba(244, 63, 94, ${0.6 + pulse * 0.4})`;
  ctx.beginPath();
  ctx.arc(w - 28, h - 28, 6 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("REC", w - 40, h - 24);
}
