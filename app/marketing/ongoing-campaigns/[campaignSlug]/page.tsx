import { CampaignDetailPageClient } from "@/components/campaigns/campaign-detail-page-client";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignSlug: string;
  }>;
};

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { campaignSlug } = await params;

  return <CampaignDetailPageClient slug={campaignSlug} />;
}
