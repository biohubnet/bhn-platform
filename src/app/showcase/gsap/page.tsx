/**
 * /showcase/gsap — PUBLIC (no login) live demo of GSAP capabilities,
 * built with the official GSAP skills. Lives outside the (dashboard)
 * group so it has no shell/sidebar and no auth gate — easy to view and
 * share. The animation work is in the client component.
 */
import type { Metadata } from "next";
import { GsapShowcase } from "@/components/showcase/GsapShowcase";

export const metadata: Metadata = {
  title: "GSAP showcase · BioHubNet",
  description:
    "A live demo of GSAP: timeline choreography, ScrollTrigger pin + scrub, parallax, and batched reveals — built with the official GSAP skills.",
};

export default function GsapShowcasePage() {
  return <GsapShowcase />;
}
