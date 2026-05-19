/**
 * New simulation — paste a job-posting URL, generate, redirect to play.
 *
 * The server route does the heavy lifting (Jina extract + LLM generate),
 * which can take 15–25s on a fresh JD. This page renders a client form
 * with a progress-narrating loading state so the wait feels purposeful.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { NewSimulationForm } from "@/components/simulator/NewSimulationForm";

export const dynamic = "force-dynamic";

export default function NewSimulationPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/simulator"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to simulator
      </Link>
      <PageHero
        eyebrow="Step 1"
        title="Choose a job to practice"
        description="Paste any job-posting URL — LinkedIn, Indeed, a company careers page, even a Google Doc with the JD. We'll generate a fictional team and 12 weeks of decisions tailored to the role."
      />
      <NewSimulationForm />
    </div>
  );
}
