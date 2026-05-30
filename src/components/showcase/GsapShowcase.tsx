"use client";
/**
 * GsapShowcase — a LABELED feature reference for GSAP, built with the
 * official GSAP skills' React patterns. Each demo card is titled with
 * the exact API to reach for, so it doubles as a cheat-sheet.
 *
 * Skill rules followed:
 *   • useGSAP() scoped to a ref → every tween / ScrollTrigger / Draggable
 *     auto-reverts on unmount (SSR-safe; nothing runs on the server).
 *   • contextSafe() wraps event-handler animations so they're tracked +
 *     cleaned up.
 *   • gsap.matchMedia("(prefers-reduced-motion: no-preference)") gates the
 *     ambient loops; interactive demos still respond on user action.
 *   • ScrollTrigger only on top-level tweens/timelines; markers off.
 *   • Each demo is wrapped in safe() so a single plugin hiccup degrades to
 *     a static card instead of breaking the page.
 *
 * Colours are fixed (dark, GSAP-green) so it reads the same on any theme.
 */
import { useRef, type ReactNode } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { Observer } from "gsap/Observer";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(
  useGSAP, ScrollTrigger, Flip, Draggable, InertiaPlugin, MotionPathPlugin,
  DrawSVGPlugin, MorphSVGPlugin, SplitText, TextPlugin, ScrambleTextPlugin,
  Physics2DPlugin, Observer, CustomEase,
);

const GREEN = "#0ae448";

export function GsapShowcase() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const q = <T extends Element = HTMLElement>(s: string) => root.current?.querySelector<T>(s) ?? null;
      const safe = (fn: () => void) => { try { fn(); } catch (e) { console.warn("[gsap demo]", e); } };

      // Always-on scroll progress bar.
      safe(() =>
        gsap.to(".gs-progress", {
          scaleX: 1, ease: "none",
          scrollTrigger: { trigger: document.body, start: 0, end: "max", scrub: 0.3 },
        }),
      );

      const mm = gsap.matchMedia();
      const splits: SplitText[] = [];

      // ── Ambient looping demos (only when motion is welcome) ──────────
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // CORE
        safe(() => gsap.to(".d-tween", { x: 96, rotate: 360, borderRadius: "50%", duration: 1.5, ease: "power2.inOut", yoyo: true, repeat: -1 }));

        safe(() => {
          const eases = ["power2.out", "back.out(2.5)", "elastic.out(1,0.4)", "bounce.out", "expo.out", "sine.inOut"];
          gsap.utils.toArray<HTMLElement>(".d-ease").forEach((el, i) =>
            gsap.to(el, { x: 130, duration: 1.7, ease: eases[i], yoyo: true, repeat: -1, repeatDelay: 0.25 }),
          );
        });

        safe(() => gsap.to(".d-stagger", { scale: 0.25, backgroundColor: GREEN, duration: 0.5, ease: "power1.inOut", yoyo: true, repeat: -1, stagger: { each: 0.07, grid: "auto", from: "center" } }));

        safe(() =>
          gsap.timeline({ repeat: -1, repeatDelay: 0.5, defaults: { duration: 0.5, ease: "power2.inOut" } })
            .to(".d-tl-1", { x: 80 }).to(".d-tl-2", { x: 80 }, "<0.15").to(".d-tl-3", { x: 80 }, "<0.15")
            .to([".d-tl-1", ".d-tl-2", ".d-tl-3"], { x: 0 }, "+=0.35"),
        );

        safe(() => gsap.to(".d-key", { keyframes: { x: [0, 92, 92, 0, 0], y: [0, 0, 56, 56, 0] }, duration: 3, ease: "power1.inOut", repeat: -1 }));

        // TEXT
        safe(() => { const st = new SplitText(".d-split", { type: "chars" }); splits.push(st); gsap.from(st.chars, { yPercent: 120, opacity: 0, stagger: 0.045, duration: 0.6, ease: "back.out(1.7)", repeat: -1, repeatDelay: 1.8, yoyo: true }); });
        safe(() => gsap.to(".d-scramble", { duration: 2, scrambleText: { text: "ScrambleTextPlugin", chars: "upperCase", speed: 0.5 }, repeat: -1, repeatDelay: 1.3 }));
        safe(() => gsap.to(".d-text", { duration: 2, text: "typed with TextPlugin…", ease: "none", repeat: -1, repeatDelay: 1.5 }));

        // SVG
        safe(() => gsap.fromTo(".d-draw", { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.7, ease: "power1.inOut", yoyo: true, repeat: -1 }));
        safe(() => gsap.to(".d-morph", { morphSVG: "#d-morph-to", duration: 1.4, ease: "power2.inOut", yoyo: true, repeat: -1 }));
        safe(() => gsap.to(".d-mp", { motionPath: { path: "#d-mp-path", align: "#d-mp-path", alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 3.5, ease: "none", repeat: -1 }));

        // EASES — author a curve
        safe(() => {
          CustomEase.create("d-custom", "M0,0 C0.2,0 0.35,1.3 0.5,1.15 0.65,1 0.8,1 1,1");
          gsap.to(".d-custom", { x: 130, duration: 2, ease: "d-custom", yoyo: true, repeat: -1, repeatDelay: 0.3 });
        });

        // PHYSICS — repeating burst
        safe(() => {
          const burst = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
          burst.set(".d-particle", { x: 0, y: 0, opacity: 1, scale: 1 })
            .to(".d-particle", { duration: 1.1, physics2D: { velocity: "random(140,320)", angle: "random(0,360)", gravity: 520 }, opacity: 0, scale: 0.3, ease: "none" });
        });
      });

      // ── Interactive demos (respond on user action, any motion pref) ──
      safe(() => {
        const flipBox = q(".d-flip-box");
        const btn = q(".d-flip-btn");
        if (flipBox && btn && contextSafe) {
          const onClick = contextSafe(() => {
            const items = gsap.utils.toArray<HTMLElement>(".d-flip-item");
            const state = Flip.getState(items);
            flipBox.classList.toggle("d-flip-col");
            Flip.from(state, { duration: 0.6, ease: "power2.inOut", stagger: 0.05 });
          });
          btn.addEventListener("click", onClick);
        }
      });

      safe(() => { Draggable.create(".d-drag", { type: "x,y", bounds: ".d-drag-area", inertia: true, edgeResistance: 0.65 }); });

      let obs: Observer | null = null;
      safe(() => {
        const dial = q(".d-dial");
        if (dial) {
          obs = Observer.create({
            target: ".d-obs-area", type: "wheel,touch,pointer",
            onChange: (self) => gsap.to(dial, { rotation: "+=" + (self.deltaX + self.deltaY) * 0.6, duration: 0.5, ease: "power2.out" }),
          });
        }
      });

      safe(() => {
        const slider = q<HTMLInputElement>(".d-util-slider");
        const out = q(".d-util-out");
        const bar = q(".d-util-bar");
        if (slider && out && bar) {
          const update = () => {
            const v = Number(slider.value); // 0..100
            const mapped = gsap.utils.mapRange(0, 100, -40, 40, v);
            const snapped = gsap.utils.snap(5, v);
            const clamped = gsap.utils.clamp(20, 80, v);
            out.textContent = `mapRange→${mapped.toFixed(0)}  snap(5)→${snapped}  clamp(20,80)→${clamped}`;
            gsap.to(bar, { width: `${v}%`, backgroundColor: gsap.utils.interpolate("#22d3ee", GREEN, v / 100), duration: 0.3 });
          };
          slider.addEventListener("input", update);
          update();
        }
      });

      // ── ScrollTrigger demos (scroll-driven; user controls them) ──────
      safe(() => gsap.from(".d-toggle", { y: 60, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".d-toggle", start: "top 85%", toggleActions: "play none none reverse" } }));
      safe(() => gsap.to(".d-scrub", { xPercent: 260, rotate: 180, ease: "none", scrollTrigger: { trigger: ".d-scrub-sec", start: "top 80%", end: "bottom 30%", scrub: true } }));

      safe(() => {
        const countEl = q(".gs-count");
        const counter = { v: 0 };
        gsap.timeline({ scrollTrigger: { trigger: ".gs-pin", start: "top top", end: "+=1500", scrub: 1, pin: true } })
          .to(".gs-ring", { rotate: 300, scale: 1.18, ease: "none" }, 0)
          .to(counter, { v: 100, ease: "none", snap: { v: 1 }, onUpdate: () => { if (countEl) countEl.textContent = String(Math.round(counter.v)); } }, 0)
          .from(".gs-step-1", { xPercent: -140, opacity: 0 }, 0.05)
          .from(".gs-step-2", { yPercent: 140, opacity: 0 }, 0.25)
          .from(".gs-step-3", { xPercent: 140, opacity: 0 }, 0.45);
      });

      safe(() => {
        const par = (sel: string, yPercent: number) => gsap.to(sel, { yPercent, ease: "none", scrollTrigger: { trigger: ".gs-parallax", start: "top bottom", end: "bottom top", scrub: true } });
        par(".gs-par-back", -24); par(".gs-par-mid", -55); par(".gs-par-front", -95);
      });

      safe(() => {
        gsap.set(".gs-card", { opacity: 0, y: 48 });
        ScrollTrigger.batch(".gs-card", {
          start: "top 88%",
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.12, duration: 0.55, ease: "power2.out", overwrite: true }),
          onLeaveBack: (els) => gsap.to(els, { opacity: 0, y: 48, overwrite: true }),
        });
      });

      safe(() => {
        const track = q(".gs-h-track");
        if (track) {
          gsap.to(track, {
            xPercent: -100 * ((track.children.length - 1) / track.children.length),
            ease: "none",
            scrollTrigger: { trigger: ".gs-h-sec", start: "top top", end: "+=1600", scrub: 1, pin: true },
          });
        }
      });

      // Manual cleanup for things gsap.context doesn't revert itself.
      return () => { splits.forEach((s) => s.revert()); obs?.kill(); };
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-screen bg-[#0b0f17] text-white overflow-x-hidden">
      <div className="gs-progress fixed top-0 left-0 right-0 h-1 origin-left z-50" style={{ transform: "scaleX(0)", background: `linear-gradient(90deg, ${GREEN}, #22d3ee)` }} aria-hidden />

      {/* Header */}
      <header className="px-6 pt-16 pb-10 max-w-6xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.4em] font-bold mb-3" style={{ color: GREEN }}>GSAP · feature reference</p>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight">What GSAP can do</h1>
        <p className="mt-4 text-white/60 max-w-2xl leading-relaxed">
          Each card is labelled with the API to reach for. The grid below loops automatically; scroll-driven demos are further down. Everything respects <span className="text-white/80">prefers-reduced-motion</span>.
        </p>
      </header>

      {/* Compact looping / interactive cards */}
      <div className="px-6 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        <Card group="Core" api="gsap.to() / from() / fromTo()" note="Tween any property — x, rotation, scale, color, borderRadius…">
          <span className="d-tween block w-12 h-12 rounded-lg" style={{ background: GREEN }} />
        </Card>

        <Card group="Core" api='ease: "power / back / elastic / bounce / expo / sine"' note="30+ eases, top → bottom">
          <div className="space-y-1.5">
            {["power2", "back", "elastic", "bounce", "expo", "sine"].map((n) => (
              <span key={n} className="d-ease block w-3 h-3 rounded-full" style={{ background: GREEN }} title={n} />
            ))}
          </div>
        </Card>

        <Card group="Core" api='stagger: { grid: "auto", from: "center" }' note="Grid-aware staggered tweens">
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 25 }).map((_, i) => <span key={i} className="d-stagger w-3 h-3 rounded-sm bg-white/30" />)}
          </div>
        </Card>

        <Card group="Timeline" api="gsap.timeline() + position param" note='Sequence with overlaps ("<0.15")'>
          <div className="space-y-2">
            {["d-tl-1", "d-tl-2", "d-tl-3"].map((c) => <span key={c} className={`${c} block w-8 h-3 rounded`} style={{ background: GREEN }} />)}
          </div>
        </Card>

        <Card group="Timeline" api="keyframes: { x: [...], y: [...] }" note="Multi-step path on one tween">
          <span className="d-key block w-8 h-8 rounded-md" style={{ background: "#22d3ee" }} />
        </Card>

        <Card group="Text" api="new SplitText(el, { type: 'chars' })" note="Split into chars / words / lines, then animate">
          <span className="d-split text-2xl font-black" style={{ color: GREEN }}>SplitText</span>
        </Card>

        <Card group="Text" api="scrambleText: { text, chars }" note="Decode / scramble effect">
          <span className="d-scramble font-mono text-sm text-white/80">··················</span>
        </Card>

        <Card group="Text" api='text: "…" (TextPlugin)' note="Typewriter replacement">
          <span className="d-text font-mono text-sm" style={{ color: "#22d3ee" }} />
        </Card>

        <Card group="SVG" api='drawSVG: "0%" → "100%"' note="Animate stroke drawing">
          <svg viewBox="0 0 120 40" className="w-full h-12"><path className="d-draw" d="M4,30 C30,4 50,36 70,18 90,2 110,30 116,12" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" /></svg>
        </Card>

        <Card group="SVG" api='morphSVG: "#target"' note="Morph one shape into another">
          <svg viewBox="0 0 60 60" className="w-14 h-14">
            <path id="d-morph-to" d="M30,4 56,30 30,56 4,30Z" fill="none" stroke="transparent" />
            <path className="d-morph" d="M30,6 a24,24 0 1,0 0.1,0Z" fill={`${GREEN}33`} stroke={GREEN} strokeWidth="2" />
          </svg>
        </Card>

        <Card group="SVG" api="motionPath: { path, autoRotate }" note="Follow an arbitrary path">
          <svg viewBox="0 0 120 50" className="w-full h-14">
            <path id="d-mp-path" d="M6,42 C36,2 84,2 114,42" fill="none" stroke="#ffffff22" strokeWidth="2" />
            <rect className="d-mp" x="-5" y="-3" width="10" height="6" rx="1.5" fill={GREEN} />
          </svg>
        </Card>

        <Card group="Easing" api='CustomEase.create(id, "M0,0 C…")' note="Author any easing curve">
          <span className="d-custom block w-9 h-9 rounded-lg" style={{ background: "#a78bfa" }} />
        </Card>

        <Card group="Interactive" api="Flip.getState() → Flip.from()" note="Animate layout changes — click to reflow" interactive>
          <div className="d-flip-box flex flex-row gap-2 flex-wrap">
            {["a", "b", "c", "d"].map((c) => <span key={c} className="d-flip-item w-8 h-8 rounded-md" style={{ background: GREEN }} />)}
          </div>
          <button type="button" className="d-flip-btn mt-3 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded ring-1 ring-white/20 hover:bg-white/10">Reflow ⤧</button>
        </Card>

        <Card group="Interactive" api="Draggable.create({ inertia: true })" note="Drag + throw with momentum" interactive>
          <div className="d-drag-area relative w-full h-20 rounded-lg ring-1 ring-white/10">
            <span className="d-drag absolute left-2 top-2 w-10 h-10 rounded-full grid place-items-center text-[10px] font-bold text-black cursor-grab active:cursor-grabbing" style={{ background: GREEN }}>drag</span>
          </div>
        </Card>

        <Card group="Interactive" api="Observer.create({ type: 'wheel,touch,pointer' })" note="Wheel / drag over the box to spin" interactive>
          <div className="d-obs-area w-full h-20 rounded-lg ring-1 ring-white/10 grid place-items-center cursor-ew-resize">
            <span className="d-dial block w-12 h-1.5 rounded-full" style={{ background: GREEN }} />
          </div>
        </Card>

        <Card group="Physics" api="physics2D: { velocity, angle, gravity }" note="Particle motion under gravity">
          <div className="relative w-full h-20 grid place-items-center">
            {Array.from({ length: 18 }).map((_, i) => <span key={i} className="d-particle absolute w-1.5 h-1.5 rounded-full" style={{ background: i % 2 ? GREEN : "#22d3ee" }} />)}
          </div>
        </Card>

        <Card group="Utils" api="gsap.utils.mapRange / snap / clamp / interpolate" note="Drag the slider" interactive>
          <input type="range" min={0} max={100} defaultValue={50} className="d-util-slider w-full accent-[#0ae448]" />
          <div className="d-util-bar h-1.5 rounded-full mt-2" style={{ width: "50%", background: GREEN }} />
          <p className="d-util-out font-mono text-[10.5px] text-white/60 mt-2 leading-snug" />
        </Card>
      </div>

      {/* ── Scroll-driven demos ─────────────────────────────────────── */}
      <SectionLabel>ScrollTrigger — scroll the rest</SectionLabel>

      <ScrollDemo api='scrollTrigger: { toggleActions: "play none none reverse" }' title="Reveal on enter">
        <div className="d-toggle inline-block px-6 py-4 rounded-2xl ring-1 ring-white/10 bg-white/[0.04] text-lg font-bold">I fade + slide in when scrolled into view ✦</div>
      </ScrollDemo>

      <div className="d-scrub-sec relative py-28 overflow-hidden border-y border-white/10">
        <SectionCaption api="scrollTrigger: { scrub: true }">Scrub — progress tied to scroll</SectionCaption>
        <span className="d-scrub block w-16 h-16 rounded-xl mt-8 ml-6" style={{ background: GREEN }} />
      </div>

      {/* pin + scrub */}
      <section className="gs-pin relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div aria-hidden className="gs-ring absolute w-[58vmin] h-[58vmin] rounded-full" style={{ border: `2px dashed ${GREEN}55` }} />
        <p className="text-[11px] uppercase tracking-[0.34em] font-bold text-white/40 mb-2">pin: true + scrub</p>
        <div className="relative text-center"><span className="gs-count text-[24vmin] sm:text-[150px] font-black leading-none tabular-nums" style={{ color: GREEN }}>0</span><span className="text-4xl font-black align-top" style={{ color: GREEN }}>%</span></div>
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-6">
          {[["gs-step-1", "Pin"], ["gs-step-2", "Scrub"], ["gs-step-3", "Sequence"]].map(([c, t]) => (
            <div key={c} className={`${c} rounded-xl p-4 ring-1 ring-white/10 bg-white/[0.04] text-center font-bold`} style={{ color: GREEN }}>{t}</div>
          ))}
        </div>
      </section>

      {/* parallax */}
      <section className="gs-parallax relative h-[80vh] flex items-center justify-center overflow-hidden border-y border-white/10">
        <div aria-hidden className="gs-par-back absolute text-[30vw] font-black text-white/[0.04] whitespace-nowrap">PARALLAX</div>
        <div aria-hidden className="gs-par-mid absolute left-[12%] top-[30%] w-24 h-24 rounded-3xl rotate-12" style={{ background: `${GREEN}22`, border: `1px solid ${GREEN}55` }} />
        <div aria-hidden className="gs-par-front absolute right-[16%] bottom-[26%] w-16 h-16 rounded-full" style={{ background: "#22d3ee33", border: "1px solid #22d3ee66" }} />
        <p className="relative text-2xl sm:text-4xl font-bold max-w-md text-center px-6">Layers drift at different speeds — pure scrub.</p>
      </section>

      {/* batch */}
      <section className="relative px-6 py-24 max-w-5xl mx-auto">
        <SectionCaption api="ScrollTrigger.batch()">Batched reveals on enter</SectionCaption>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="gs-card h-24 rounded-2xl ring-1 ring-white/10 bg-white/[0.04] grid place-items-center font-black" style={{ color: GREEN }}>{i + 1}</div>)}
        </div>
      </section>

      {/* horizontal containerAnimation */}
      <section className="gs-h-sec relative h-screen overflow-hidden">
        <SectionCaption api="pin + horizontal track (ease: none)">Fake horizontal scroll</SectionCaption>
        <div className="gs-h-track flex h-full items-center gap-6 px-6" style={{ width: "max-content" }}>
          {["Scroll ↓ to pan →", "Panel two", "Panel three", "Panel four"].map((t, i) => (
            <div key={i} className="w-[80vw] sm:w-[60vw] h-[55vh] rounded-3xl ring-1 ring-white/10 grid place-items-center text-2xl font-black" style={{ background: i % 2 ? `${GREEN}14` : "#22d3ee14", color: i % 2 ? GREEN : "#22d3ee" }}>{t}</div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-20 text-center text-white/40 text-[12px]">
        Built with the official GSAP skills · useGSAP auto-cleanup · prefers-reduced-motion respected
        <div className="mt-4"><Link href="/dashboard" className="text-[13px] font-semibold underline" style={{ color: GREEN }}>← Back to the platform</Link></div>
      </footer>
    </div>
  );
}

function Card({ group, api, note, children, interactive }: { group: string; api: string; note: string; children: ReactNode; interactive?: boolean }) {
  return (
    <div className="rounded-2xl ring-1 ring-white/10 bg-white/[0.03] p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-white/40">{group}</span>
        {interactive && <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background: `${GREEN}22`, color: GREEN }}>interactive</span>}
      </div>
      <div className="min-h-[88px] flex items-center justify-center overflow-hidden">{children}</div>
      <p className="font-mono text-[11px] mt-3 leading-snug" style={{ color: GREEN }}>{api}</p>
      <p className="text-[11.5px] text-white/50 mt-1 leading-snug">{note}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="px-6 max-w-6xl mx-auto text-[11px] uppercase tracking-[0.34em] font-bold text-white/40 pt-10 pb-2">{children}</h2>;
}
function SectionCaption({ api, children }: { api: string; children: ReactNode }) {
  return (
    <div className="px-6 max-w-5xl mx-auto">
      <p className="text-xl sm:text-2xl font-bold">{children}</p>
      <p className="font-mono text-[12px] mt-1" style={{ color: GREEN }}>{api}</p>
    </div>
  );
}
function ScrollDemo({ api, title, children }: { api: string; title: string; children: ReactNode }) {
  return (
    <section className="px-6 max-w-5xl mx-auto py-24">
      <p className="text-xl sm:text-2xl font-bold">{title}</p>
      <p className="font-mono text-[12px] mt-1 mb-8" style={{ color: GREEN }}>{api}</p>
      {children}
    </section>
  );
}
