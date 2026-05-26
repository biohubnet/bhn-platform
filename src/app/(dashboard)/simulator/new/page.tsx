/**
 * Request a simulation.
 *
 * As of 2026-05-26, self-serve AI generation is gone. The user submits
 * a SimulationRequest here; an admin reviews + publishes it from
 * /admin/simulator-requests. The user's request status surfaces under
 * "Requested" on /simulator.
 */
import { PageHero } from "@/components/ui/PageHero";
import { NewSimulationForm } from "@/components/simulator/NewSimulationForm";

export const dynamic = "force-dynamic";

export default function NewSimulationPage() {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Request a simulation"
        title="Pick a posting we'll build a quarter around"
        description="Submit a job-posting URL — LinkedIn, Indeed, ZipRecruiter, a company careers page — or paste the JD body directly when the URL is auth-walled. Our team reviews each request and publishes the simulation to your dashboard, usually within 24 hours."
      />
      <NewSimulationForm />
    </div>
  );
}
