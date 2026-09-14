export type Role = "admin" | "sales" | "cs" | "warehouse";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

export type ConsentStatus = "opted_in" | "pending" | "opted_out";
export type ConsentChannel = "click_to_chat" | "web_form" | "ad" | "import" | "manual";

export interface Customer {
  id: string;
  waId: string; // WhatsApp phone id — the stable identity key
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  birthDate: string | null; // YYYY-MM-DD
  consentStatus: ConsentStatus;
  consentChannel: ConsentChannel;
  segments: string[];
  tags: string[];
  lifetimeValue: number;
  orderCount: number;
  firstSeenAt: string;
  lastOrderAt: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  /** Public profile-edit link token (never shown in CRM UI). */
  editToken?: string | null;
  /** Custom QR form answers keyed by custom_* field keys. */
  formAnswers?: Record<string, string | boolean | number | null>;
  /** First fisik (system /daftar) voucher for this phone (sticky). */
  leadDiscountCode?: string | null;
  /** First Form Digital voucher for this phone (sticky). */
  digitalDiscountCode?: string | null;
  createdAt: string;
}

export interface Address {
  id: string;
  customerId: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  line1: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

export type ConversationStatus = "open" | "pending" | "resolved";

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerWaId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  status: ConversationStatus;
  unread: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  lastInboundAt: string | null; // drives the 24h window
  firstResponseSeconds: number | null;
  topic: string | null;
}

export type MessageDirection = "in" | "out";
export type MessageKind = "text" | "image" | "template" | "order" | "system";

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  kind: MessageKind;
  body: string;
  createdAt: string;
  authorName: string | null;
  status: "sent" | "delivered" | "read" | "failed" | null;
}

export type CasePriority = "low" | "medium" | "high" | "urgent";
export type CaseStatus = "new" | "in_progress" | "waiting" | "resolved";

export interface SupportCase {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  subject: string;
  priority: CasePriority;
  status: CaseStatus;
  ownerId: string | null;
  ownerName: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SyncState = "synced" | "pending" | "error" | "draft";

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  imageColor: string;
  retailPrice: number;
  discountPercent: number;
  stock: number;
  reserved: number;
  reorderPoint: number;
  active: boolean;
  catalogSync: SyncState;
  units30d: number;
  unitsPrev30d: number;
}

export type OrderStatus =
  | "new"
  | "paid"
  | "allocated"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "expired" | "refunded";

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: "midtrans" | "xendit" | null;
  paymentLink: string | null;
  channel: "whatsapp_cart" | "agent";
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: {
    recipientName: string;
    line1: string;
    city: string;
    postalCode: string;
  } | null;
  courier: string | null;
  trackingNumber: string | null;
  labelNumber: string | null; // AWB / scannable label affixed at packing
  flaggedIssue: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShipmentStatus =
  | "draft"
  | "requested"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "returned";

export interface ShipmentEvent {
  status: string;
  note: string;
  at: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  courier: string;
  service: string;
  trackingNumber: string;
  status: ShipmentStatus;
  cost: number;
  destinationCity: string;
  events: ShipmentEvent[];
  createdAt: string;
  biteshipOrderId?: string | null;
}

export interface PackProgressItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  required: number;
  scanned: number;
}

export interface PackScanLog {
  sku: string;
  name: string;
  at: string;
}

export type PackStatus = "in_progress" | "completed";

export interface PackSession {
  id: string;
  orderId: string;
  orderCode: string;
  labelNumber: string;
  packerId: string;
  packerName: string;
  status: PackStatus;
  startedAt: string;
  completedAt: string | null;
  items: PackProgressItem[];
  scans: PackScanLog[];
}

export interface WarehouseNotice {
  id: string;
  orderId: string;
  orderCode: string;
  raisedByName: string;
  type: "stock_issue" | "address_issue" | "damage" | "delay" | "other";
  message: string;
  status: "open" | "ack" | "resolved";
  createdAt: string;
}
