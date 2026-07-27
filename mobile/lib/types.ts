export type Role = "admin" | "sales" | "cs" | "warehouse";

export type Permission =
  | "inbox.view"
  | "inbox.reply"
  | "orders.view"
  | "orders.edit"
  | string;

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerWaId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  status: "open" | "pending" | "resolved";
  unread: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  lastInboundAt: string | null;
  topic: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  kind: string;
  body: string;
  createdAt: string;
  authorName?: string | null;
  status?: string | null;
}

export type OrderStatus =
  | "new"
  | "paid"
  | "allocated"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

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
  channel: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentProvider?: string | null;
  paymentLink?: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: OrderItem[];
  flaggedIssue?: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  shippingAddress?: {
    recipientName: string;
    line1: string;
    city: string;
    postalCode: string;
  } | null;
}
