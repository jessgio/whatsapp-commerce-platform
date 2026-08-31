import { Badge } from "@/components/ui";
import {
  BITESHIP_STATUS_TONES,
  biteshipStatusLabel,
  normalizeBiteshipStatus,
} from "@/lib/biteship-status";
import type {
  CasePriority,
  CaseStatus,
  ConsentStatus,
  ConversationStatus,
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  SyncState,
} from "@/lib/types";

type Tone = "neutral" | "merlot" | "success" | "warning" | "danger" | "info";
type ToneMap = Record<string, [string, Tone]>;

// Module scope: these render in every table row, and rebuilding the maps per
// render allocated a fresh object for each badge.
const ORDER: ToneMap = {
  new: ["New", "info"],
  paid: ["Paid", "success"],
  allocated: ["Allocated", "merlot"],
  packed: ["Packed", "merlot"],
  shipped: ["Shipped", "warning"],
  delivered: ["Delivered", "success"],
  cancelled: ["Cancelled", "danger"],
};

const PAYMENT: ToneMap = {
  unpaid: ["Unpaid", "neutral"],
  pending: ["Pending", "warning"],
  paid: ["Paid", "success"],
  expired: ["Expired", "danger"],
  refunded: ["Refunded", "info"],
};

const CASE_STATUS: ToneMap = {
  new: ["New", "info"],
  in_progress: ["In progress", "merlot"],
  waiting: ["Waiting", "warning"],
  resolved: ["Resolved", "success"],
};

const PRIORITY: ToneMap = {
  low: ["Low", "neutral"],
  medium: ["Medium", "info"],
  high: ["High", "warning"],
  urgent: ["Urgent", "danger"],
};

const CONVERSATION: ToneMap = {
  open: ["Open", "merlot"],
  pending: ["Pending", "warning"],
  resolved: ["Resolved", "success"],
};

const CONSENT: ToneMap = {
  opted_in: ["Opted in", "success"],
  pending: ["Pending", "warning"],
  opted_out: ["Opted out", "danger"],
};

const SYNC: ToneMap = {
  synced: ["Synced", "success"],
  pending: ["Sync pending", "warning"],
  error: ["Sync error", "danger"],
  draft: ["Draft", "neutral"],
};

const SHIPMENT: ToneMap = {
  draft: ["Draft", "neutral"],
  requested: ["Requested", "info"],
  picked_up: ["Picked up", "merlot"],
  in_transit: ["In transit", "warning"],
  delivered: ["Delivered", "success"],
  returned: ["Returned", "danger"],
};

function StatusBadge({ map, value }: { map: ToneMap; value: string }) {
  const [label, tone] = map[value] ?? [value, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge map={ORDER} value={status} />;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge map={PAYMENT} value={status} />;
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <StatusBadge map={CASE_STATUS} value={status} />;
}

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  return <StatusBadge map={PRIORITY} value={priority} />;
}

export function ConvStatusBadge({ status }: { status: ConversationStatus }) {
  return <StatusBadge map={CONVERSATION} value={status} />;
}

export function ConsentBadge({ status }: { status: ConsentStatus }) {
  return <StatusBadge map={CONSENT} value={status} />;
}

export function SyncBadge({ state }: { state: SyncState }) {
  return <StatusBadge map={SYNC} value={state} />;
}

export function ShipmentBadge({ status }: { status: ShipmentStatus }) {
  return <StatusBadge map={SHIPMENT} value={status} />;
}

export function BiteshipStatusBadge({ status }: { status: string }) {
  const key = normalizeBiteshipStatus(status);
  const tone = BITESHIP_STATUS_TONES[key] ?? "neutral";
  return <Badge tone={tone}>{biteshipStatusLabel(status)}</Badge>;
}
