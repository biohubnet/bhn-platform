/**
 * New simulation — paste a job-posting URL, generate, redirect to play.
 *
 * The server route does the heavy lifting (Jina extract + LLM generate),
 * which can take 15–25s on a fresh JD. This page renders a client form
 * with a progress-narrating loading state so the wait feels purposeful.
 */
import { PageHero } from "@/components/ui/PageHero";
import { NewSimulationForm } from "@/components/simulator/NewSimulationForm";

export const dynamic = "force-dynamic";

export default function NewSimulationPage() {
  // Back-link removed — the hero is the absolute top of the page;
  // sidebar handles cross-page navigation. The form below accepts
  // EITHER a job-posting URL or a pasted JD body (auto-detected on
  // submit), so the description copy mentions both modes.
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Step 1"
        title="Choose a job to practice"
        description="Paste a job-posting URL (LinkedIn, Indeed, a company careers page) — or paste the full job description text directly if the URL is auth-walled or doesn't read cleanly. We'll generate a fictional team and 12 weeks of decisions tailored to the role."
      />
      <NewSimulationForm />
    </div>
  );
}
