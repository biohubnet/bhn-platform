"use client";
/**
 * GsapShowcase — a public, self-contained demo of what GSAP can do,
 * built with the official GSAP skills' React patterns:
 *   • useGSAP() scoped to a ref → automatic cleanup of every tween +
 *     ScrollTrigger on unmount (no leaks, SSR-safe — nothing runs on
 *     the server).
 *   • gsap.matchMedia("(prefers-reduced-motion: no-preference)") so the
 *     motion only plays for users who haven't asked for less.
 *   • ScrollTrigger only on top-level tweens/timelines; markers off.
 *
 * Capabilities on display: timeline choreography + stagger (hero),
 * ScrollTrigger pin + scrub (the pinned sequence), parallax layers,
 * and ScrollTrigger.batch() viewport reveals (the card grid).
 *
 * Colours are fixed (dark, GSAP-green accent) so it reads the same on
 * any visitor theme — it's a brand-neutral demo surface.
 */
import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const GREEN = "#0ae448";
const TITLE_WORDS = ["GSAP", "makes", "the", "web", "move."];

export function GsapShowcase() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Scroll-progress bar — tied to the whole page, cheap, always on.
      gsap.to(".gs-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: document.body, start: 0, end: "max", scrub: 0.3 },
      });

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 1 ─ Hero: timeline choreography + stagger.
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".gs-word", { yPercent: 130, opacity: 0, stagger: 0.09, duration: 0.85 })
          .from(".gs-sub", { y: 24, opacity: 0, duration: 0.6 }, "-=0.45")
          .from(".gs-cue", { y: 14, opacity: 0, duration: 0.5 }, "-=0.3");

        // Ambient floating blobs — looping yoyo with randomised stagger.
        gsap.to(".gs-float", {
          y: (i) => (i % 2 ? 26 : -26),
          rotation: (i) => (i % 2 ? 20 : -20),
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: { each: 0.4, from: "random" },
        });

        // 2 ─ Pinned scrub sequence: pin the section, scrub a timeline.
        const countEl = root.current?.querySelector<HTMLElement>(".gs-count");
        const counter = { v: 0 };
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".gs-pin",
              start: "top top",
              end: "+=1700",
              scrub: 1,
              pin: true,
            },
          })
          .to(".gs-ring", { rotate: 300, scale: 1.18, ease: "none" }, 0)
          .to(
            counter,
            {
              v: 100,
              ease: "none",
              snap: { v: 1 },
              onUpdate: () => { if (countEl) countEl.textContent = String(Math.round(counter.v)); },
            },
            0,
          )
          .from(".gs-step-1", { xPercent: -140, opacity: 0, ease: "power2.out" }, 0.05)
          .from(".gs-step-2", { yPercent: 140, opacity: 0, ease: "power2.out" }, 0.25)
          .from(".gs-step-3", { xPercent: 140, opacity: 0, ease: "power2.out" }, 0.45);

        // 3 ─ Parallax: layers move at different speeds while scrolling past.
        const par = (sel: string, yPercent: number) =>
          gsap.to(sel, {
            yPercent,
            ease: "none",
            scrollTrigger: { trigger: ".gs-parallax", start: "top bottom", end: "bottom top", scrub: true },
          });
        par(".gs-par-back", -24);
        par(".gs-par-mid", -55);
        par(".gs-par-front", -95);

        // 4 ─ Batch reveal: stagger cards in as they enter the viewport.
        gsap.set(".gs-card", { opacity: 0, y: 48 });
        ScrollTrigger.batch(".gs-card", {
          start: "top 86%",
          onEnter: (els) =>
            gsap.to(els, { opacity: 1, y: 0, stagger: 0.12, duration: 0.6, ease: "power2.out", overwrite: true }),
          onLeaveBack: (els) => gsap.to(els, { opacity: 0, y: 48, overwrite: true }),
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-screen bg-[#0b0f17] text-white overflow-x-hidden">
      {/* Scroll progress bar */}
      <div
        className="gs-progress fixed top-0 left-0 right-0 h-1 origin-left z-50"
        style={{ transform: "scaleX(0)", background: `linear-gradient(90deg, ${GREEN}, #22d3ee)` }}
        aria-hidden
      />

      {/* 1 ─ HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* floating ambient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="gs-float absolute left-[12%] top-[22%] w-40 h-40 rounded-full blur-2xl opacity-30" style={{ background: GREEN }} />
          <div className="gs-float absolute right-[14%] top-[30%] w-52 h-52 rounded-full blur-3xl opacity-25" style={{ background: "#22d3ee" }} />
          <div className="gs-float absolute left-[28%] bottom-[18%] w-44 h-44 rounded-full blur-3xl opacity-20" style={{ background: "#a78bfa" }} />
        </div>

        <p className="relative text-[11px] uppercase tracking-[0.4em] font-bold mb-6" style={{ color: GREEN }}>
          GSAP · live demo
        </p>
        <h1 className="relative text-[12vw] sm:text-[84px] font-black leading-[0.95] tracking-tight max-w-4xl">
          {TITLE_WORDS.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.18em]">
              <span className="gs-word inline-block">{w}</span>
            </span>
          ))}
        </h1>
        <p className="gs-sub relative mt-6 text-base sm:text-lg text-white/70 max-w-xl leading-relaxed">
          Timeline choreography, scroll-pinning, scrubbed sequences, parallax, and batched reveals —
          every section below is animated with GSAP + ScrollTrigger.
        </p>
        <div className="gs-cue relative mt-10 inline-flex flex-col items-center gap-2 text-white/50 text-[12px] uppercase tracking-[0.3em]">
          Scroll
          <span className="block w-px h-10 bg-gradient-to-b from-white/60 to-transparent" />
        </div>
      </section>

      {/* 2 ─ PINNED SCRUB SEQUENCE */}
      <section className="gs-pin relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div aria-hidden className="gs-ring absolute w-[60vmin] h-[60vmin] rounded-full" style={{ border: `2px dashed ${GREEN}55` }} />
        <p className="text-[11px] uppercase tracking-[0.34em] font-bold text-white/40 mb-3">Pin + scrub</p>
        <div className="relative text-center">
          <span className="gs-count text-[26vmin] sm:text-[180px] font-black leading-none tabular-nums" style={{ color: GREEN }}>0</span>
          <span className="text-[6vmin] sm:text-5xl font-black align-top" style={{ color: GREEN }}>%</span>
        </div>
        <p className="text-white/60 text-sm mb-10">scrubbed to your scroll position</p>
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          {[
            { c: "gs-step-1", t: "Pin", d: "the section holds while you scroll through its range." },
            { c: "gs-step-2", t: "Scrub", d: "the timeline's playhead is tied 1:1 to scroll." },
            { c: "gs-step-3", t: "Sequence", d: "tweens fire in choreographed order, both ways." },
          ].map((s) => (
            <div key={s.c} className={`${s.c} rounded-2xl p-5 ring-1 ring-white/10 bg-white/[0.04] backdrop-blur`}>
              <p className="text-lg font-bold mb-1" style={{ color: GREEN }}>{s.t}</p>
              <p className="text-[13px] text-white/60 leading-snug">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 ─ PARALLAX */}
      <section className="gs-parallax relative h-[80vh] flex items-center justify-center overflow-hidden border-y border-white/10">
        <div aria-hidden className="gs-par-back absolute text-[30vw] font-black text-white/[0.04] whitespace-nowrap">PARALLAX</div>
        <div aria-hidden className="gs-par-mid absolute left-[10%] top-[30%] w-28 h-28 rounded-3xl rotate-12" style={{ background: `${GREEN}22`, border: `1px solid ${GREEN}55` }} />
        <div aria-hidden className="gs-par-front absolute right-[14%] bottom-[24%] w-20 h-20 rounded-full" style={{ background: "#22d3ee33", border: "1px solid #22d3ee66" }} />
        <div className="relative text-center px-6">
          <p className="text-[11px] uppercase tracking-[0.34em] font-bold text-white/40 mb-3">Parallax</p>
          <p className="text-2xl sm:text-4xl font-bold max-w-lg">Layers drift at different speeds as you pass — pure scrub, no jank.</p>
        </div>
      </section>

      {/* 4 ─ BATCH REVEAL CARDS */}
      <section className="relative px-6 py-24 max-w-5xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.34em] font-bold text-white/40 mb-3 text-center">Batched reveals</p>
        <h2 className="text-2xl sm:text-4xl font-bold text-center mb-12">Eight skills, one engine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            "Core tweens", "Timelines", "ScrollTrigger", "Plugins",
            "React / useGSAP", "Frameworks", "Utilities", "Performance",
          ].map((label) => (
            <div key={label} className="gs-card rounded-2xl p-5 ring-1 ring-white/10 bg-white/[0.04]">
              <div className="w-9 h-9 rounded-lg mb-3 flex items-center justify-center font-black" style={{ background: `${GREEN}22`, color: GREEN }}>↗</div>
              <p className="font-bold text-[15px]">{label}</p>
              <p className="text-[12px] text-white/50 mt-1 leading-snug">Official GSAP skill</p>
            </div>
          ))}
        </div>
        <p className="text-center text-white/40 text-[12px] mt-12">
          Built with the official GSAP skills · respects <span className="text-white/70">prefers-reduced-motion</span> · cleans up on unmount via <span className="text-white/70">useGSAP</span>
        </p>
        <div className="text-center mt-6">
          <Link href="/dashboard" className="text-[13px] font-semibold underline" style={{ color: GREEN }}>
            ← Back to the platform
          </Link>
        </div>
      </section>
    </div>
  );
}
