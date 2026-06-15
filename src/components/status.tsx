import { Badge } from "@/components/ui";
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

function mk(map: Record<string, [string, Tone]>) {
  return (key: string) => {
    const [label, tone] = map[key] ?? [key, "neutral"];
    return <Badge tone={tone}>{label}</Badge>;
  };
}

export const OrderBadge = ({ status }: { status: OrderStatus }) =>
  mk({
    new: ["New", "info"],
    paid: ["Paid", "success"],
    allocated: ["Allocated", "merlot"],
    packed: ["Packed", "merlot"],
    shipped: ["Shipped", "warning"],
    delivered: ["Delivered", "success"],
    cancelled: ["Cancelled", "danger"],
  })(status);

export const PaymentBadge = ({ status }: { status: PaymentStatus }) =>
  mk({
    unpaid: ["Unpaid", "neutral"],
    pending: ["Pending", "warning"],
    paid: ["Paid", "success"],
    expired: ["Expired", "danger"],
    refunded: ["Refunded", "info"],
  })(status);

export const CaseStatusBadge = ({ status }: { status: CaseStatus }) =>
  mk({
    new: ["New", "info"],
    in_progress: ["In progress", "merlot"],
    waiting: ["Waiting", "warning"],
    resolved: ["Resolved", "success"],
  })(status);

export const PriorityBadge = ({ priority }: { priority: CasePriority }) =>
  mk({
    low: ["Low", "neutral"],
    medium: ["Medium", "info"],
    high: ["High", "warning"],
    urgent: ["Urgent", "danger"],
  })(priority);

export const ConvStatusBadge = ({ status }: { status: ConversationStatus }) =>
  mk({
    open: ["Open", "merlot"],
    pending: ["Pending", "warning"],
    resolved: ["Resolved", "success"],
  })(status);

export const ConsentBadge = ({ status }: { status: ConsentStatus }) =>
  mk({
    opted_in: ["Opted in", "success"],
    pending: ["Pending", "warning"],
    opted_out: ["Opted out", "danger"],
  })(status);

export const SyncBadge = ({ state }: { state: SyncState }) =>
  mk({
    synced: ["Synced", "success"],
    pending: ["Sync pending", "warning"],
    error: ["Sync error", "danger"],
    draft: ["Draft", "neutral"],
  })(state);

export const ShipmentBadge = ({ status }: { status: ShipmentStatus }) =>
  mk({
    draft: ["Draft", "neutral"],
    requested: ["Requested", "info"],
    picked_up: ["Picked up", "merlot"],
    in_transit: ["In transit", "warning"],
    delivered: ["Delivered", "success"],
    returned: ["Returned", "danger"],
  })(status);
