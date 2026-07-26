import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listCampaigns } from "@/lib/data/campaigns";
import { listSegmentDefinitions } from "@/lib/data/segments";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/campaigns";
import { Badge, Button, PageHeader } from "@/components/ui";

function statusTone(
  status: keyof typeof CAMPAIGN_STATUS_LABELS,
): "neutral" | "merlot" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "sent":
      return "success";
    case "scheduled":
    case "sending":
      return "info";
    case "failed":
    case "cancelled":
      return "danger";
    case "draft":
    default:
      return "neutral";
  }
}

export default async function CampaignsPage() {
  const user = await requirePermission("marketing.view");
  const canEdit = can(user.role, "marketing.edit");
  const [campaigns, segments] = await Promise.all([
    listCampaigns(),
    listSegmentDefinitions(),
  ]);
  const segmentName = new Map(segments.map((s) => [s.id, s.name]));

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Reach segments on WhatsApp or email with scheduled sends"
        actions={
          canEdit ? (
            <Link href="/marketing/campaigns/new">
              <Button>
                <Plus size={15} /> New campaign
              </Button>
            </Link>
          ) : undefined
        }
      />

      {campaigns.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No campaigns yet</p>
          <p className="mt-1 text-sm text-muted">
            Create a campaign, pick a segment, schedule it, and design the message.
          </p>
          {canEdit && (
            <Link href="/marketing/campaigns/new" className="mt-4 inline-block">
              <Button>Create campaign</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Schedule</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-surface-muted/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/marketing/campaigns/${c.id}`}
                      className="font-medium text-foreground hover:text-merlot"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">{c.channel}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.segmentId
                      ? (segmentName.get(c.segmentId) ?? "Unknown segment")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.scheduledAt
                      ? new Date(c.scheduledAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(c.status)}>
                      {CAMPAIGN_STATUS_LABELS[c.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
