import {
  FileUp,
  Link2,
  Megaphone,
  QrCode,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { QuickAction } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type QuickActionsProps = {
  actions: QuickAction[];
};

const iconByActionId: Record<QuickAction["id"], LucideIcon> = {
  newCampaign: Megaphone,
  reviewSocialPosts: ScrollText,
  uploadSeoDocument: FileUp,
  generateQrCode: QrCode,
  createShortLink: Link2,
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Quick Actions</h2>
      <p className="mt-1 text-sm text-muted">Jump into the most-used workspace tasks.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = iconByActionId[action.id];

          return (
            <Button
              key={action.id}
              variant="secondary"
              className="h-full items-start justify-start rounded-2xl p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-[var(--color-accent-soft)] p-2 text-[var(--color-accent)]">
                  <Icon size={15} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="mt-1 text-xs font-medium text-muted">{action.description}</p>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
