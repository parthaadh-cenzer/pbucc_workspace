import { OngoingCampaignsSection } from "@/components/campaigns/ongoing-campaigns-section";

export default function OngoingCampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Ongoing Campaigns</h2>
        <p className="mt-1 text-sm text-muted">
          Open campaign reports to review link, QR, and social performance trends.
        </p>
      </div>

      <OngoingCampaignsSection />
    </div>
  );
}
