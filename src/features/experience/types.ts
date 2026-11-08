// Client-persisted Trust & Experience suite.
//
// The marketplace database schema is intentionally untouched, so buyer-side
// trust features (wishlist, alerts, inbox, addresses, security, sandbox orders,
// escrow, returns and verified-purchase reviews) live in a per-device store that
// syncs across tabs. Money is handled as integer cents; nothing here writes to
// the database or reads server secrets. Sandbox payments are clearly labelled
// and never charge a real account.

export type NotificationKind =
  "delivery" | "price" | "stock" | "chat" | "return" | "security" | "escrow" | "order";

export interface ExperienceNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: number;
  read: boolean;
  tab?: ExperienceTab;
}

export type ExperienceTab =
  "shop" | "orders" | "protection" | "reviews" | "inbox" | "security" | "saved" | "alerts";

export interface WatchSnapshot {
  slug: string;
  name: string;
  priceCents: number;
  inventory: number;
  image: string;
  currency: string;
}

export interface ChatMessage {
  id: string;
  from: "buyer" | "studio";
  text: string;
  at: number;
}

export interface ChatThread {
  vendorSlug: string;
  vendorName: string;
  messages: ChatMessage[];
  unread: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  region: string;
}

export interface LoginAlert {
  id: string;
  at: number;
  device: string;
  location: string;
}

export interface SecurityState {
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  phoneVerified: boolean;
  phoneNumber: string;
  loginAlerts: LoginAlert[];
}

export type SandboxPaymentMethod = "mpesa" | "mixx" | "airtel" | "card";

export type SandboxOrderStatus =
  | "held" // paid, funds in buyer protection
  | "processing"
  | "shipped"
  | "delivered" // courier finished, awaiting buyer confirm + OTP verified
  | "completed" // buyer confirmed receipt, escrow released
  | "return_requested"
  | "returned"
  | "refunded";

export interface OrderMilestone {
  key: string;
  label: string;
  at: number;
}

export interface SandboxOrderItem {
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
  image: string;
  vendorSlug: string;
  vendorName: string;
}

export interface ProductReview {
  id: string;
  orderNumber: string;
  rating: number;
  text: string;
  photo: string | null;
  at: number;
  author: string;
  sellerReply: string | null;
}

export interface ReturnRequest {
  reason: string;
  detail: string;
  status: "requested" | "approved" | "refunded";
  at: number;
}

export interface SandboxOrder {
  id: string;
  number: string;
  email: string;
  items: SandboxOrderItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  address: SavedAddress;
  paymentMethod: SandboxPaymentMethod;
  paymentPhone: string;
  status: SandboxOrderStatus;
  otp: string;
  otpVerified: boolean;
  escrowReleasedAt: number | null;
  createdAt: number;
  milestones: OrderMilestone[];
  returnRequest: ReturnRequest | null;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  agentStart: { lat: number; lng: number };
  legStartedAt: number;
  legDurationMs: number;
}

export interface ExperienceState {
  wishlist: string[];
  watch: Record<string, WatchSnapshot>;
  notifications: ExperienceNotification[];
  chats: Record<string, ChatThread>;
  addresses: SavedAddress[];
  security: SecurityState;
  orders: SandboxOrder[];
  reviews: Record<string, ProductReview[]>;
  guestEmail: string;
}

export const PAYMENT_LABEL: Record<SandboxPaymentMethod, string> = {
  mpesa: "M-Pesa",
  mixx: "Mixx by Yas",
  airtel: "Airtel Money",
  card: "Card (sandbox)",
};

export const ORDER_STATUS_LABEL: Record<SandboxOrderStatus, string> = {
  held: "Paid · in protection",
  processing: "Preparing your order",
  shipped: "On the way to you",
  delivered: "Delivered · confirm receipt",
  completed: "Completed · payment released",
  return_requested: "Return requested",
  returned: "Return approved",
  refunded: "Refunded",
};

export function formatCents(cents: number, currency = "TZS"): string {
  const whole = Math.round(cents / 100);
  return `${currency} ${whole.toLocaleString("en-US")}`;
}

export function emptyState(): ExperienceState {
  return {
    wishlist: [],
    watch: {},
    notifications: [],
    chats: {},
    addresses: [],
    security: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      phoneVerified: false,
      phoneNumber: "",
      loginAlerts: [],
    },
    orders: [],
    reviews: {},
    guestEmail: "",
  };
}
