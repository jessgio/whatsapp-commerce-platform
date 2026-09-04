import { CheckCircle2, XCircle } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { env, isSupabaseConfigured } from "@/lib/env";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/rbac";
import { DEMO_USERS } from "@/lib/demo/data";
import { Avatar, Card, CardBody, CardHeader, CardTitle, PageHeader, Table, Th, Td } from "@/components/ui";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "sales", "cs", "warehouse"];

export default async function SettingsPage() {
  await requirePermission("settings.manage");

  const integrations = [
    { name: "Supabase (database & auth)", ok: isSupabaseConfigured() },
    { name: "WhatsApp Cloud API", ok: Boolean(env.whatsapp.token && env.whatsapp.phoneNumberId) },
    { name: "WhatsApp Catalog", ok: Boolean(env.whatsapp.catalogId) },
    {
      name: `Payments (${env.payments.provider})`,
      ok: env.payments.provider === "midtrans" ? Boolean(env.payments.midtransServerKey) : Boolean(env.payments.xenditSecretKey),
    },
    { name: "Biteship 3PL", ok: Boolean(env.shipping.biteshipKey) },
    { name: "Resend (email)", ok: Boolean(env.resendApiKey) },
    {
      name: "Cloudflare Turnstile",
      ok: Boolean(env.turnstile.siteKey && env.turnstile.secretKey),
    },
  ];

  const allPerms = ROLE_PERMISSIONS.admin;

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Integrations, team access and theme" />

      <Card>
        <CardHeader><CardTitle>Integration status</CardTitle></CardHeader>
        <CardBody className="space-y-2 pt-0">
          {integrations.map((i) => (
            <div key={i.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm text-foreground">{i.name}</span>
              {i.ok ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 size={16} /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
                  <XCircle size={16} /> Not configured
                </span>
              )}
            </div>
          ))}
          <p className="pt-1 text-xs text-muted">
            Configure credentials in <code className="rounded bg-surface-muted px-1">.env.local</code> (see <code className="rounded bg-surface-muted px-1">.env.example</code>).
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardBody className="space-y-2 pt-0">
          {DEMO_USERS.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Avatar name={u.name} color={u.avatarColor} size={32} />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{u.name}</div>
                <div className="text-xs text-muted">{u.email}</div>
              </div>
              <span className="rounded-full bg-beige-200 px-2.5 py-0.5 text-xs text-brown">{ROLE_LABELS[u.role]}</span>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Role permissions (RBAC)</CardTitle></CardHeader>
        <CardBody className="pt-0">
          <Table>
            <thead>
              <tr>
                <Th>Permission</Th>
                {ROLES.map((r) => (
                  <Th key={r} className="text-center">{ROLE_LABELS[r]}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPerms.map((perm) => (
                <tr key={perm} className="hover:bg-surface-muted">
                  <Td className="font-mono text-xs text-foreground">{perm}</Td>
                  {ROLES.map((r) => (
                    <Td key={r} className="text-center">
                      {ROLE_PERMISSIONS[r].includes(perm) ? (
                        <CheckCircle2 size={15} className="mx-auto text-success" />
                      ) : (
                        <span className="text-muted">·</span>
                      )}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Merlot Charm theme</CardTitle></CardHeader>
        <CardBody className="pt-0">
          <div className="flex flex-wrap gap-3">
            {[
              ["Cream", "#f6f1e9"],
              ["Beige", "#d8c9b5"],
              ["Taupe", "#b49e8e"],
              ["Brown", "#5f5448"],
              ["Merlot", "#6f2c3f"],
              ["Charcoal", "#2d2b2a"],
            ].map(([name, hex]) => (
              <div key={hex} className="text-center">
                <div className="h-14 w-20 rounded-lg border border-border" style={{ background: hex }} />
                <div className="mt-1 text-xs font-medium text-foreground">{name}</div>
                <div className="text-[10px] text-muted">{hex}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
