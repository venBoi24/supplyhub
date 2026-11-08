export interface Point {
  x: number;
  y: number;
}

export type AgentStatus = "online" | "offline";

export interface DeliveryAgent {
  id: string;
  name: string;
  vehicle: string;
  plate: string;
  phone: string;
  rating: number;
  trips: number;
  status: AgentStatus;
}

export type DeliveryStatus =
  "pending" | "assigned" | "accepted" | "to_pickup" | "at_pickup" | "transit" | "delivered";

export interface Delivery {
  id: string;
  orderNumber: string;
  buyer: string;
  buyerAddress: string;
  storeName: string;
  items: string[];
  total: string;
  pickup: Point;
  dropoff: Point;
  agentStart: Point;
  agentId: string | null;
  status: DeliveryStatus;
  legStartedAt: number;
  legDurationMs: number;
  createdAt: number;
}

export interface DeliveryState {
  agents: DeliveryAgent[];
  deliveries: Delivery[];
}

export const MAP_W = 1000;
export const MAP_H = 640;

const snap = (v: number) => Math.round(v / 20) * 20;

export function buildRoute(a: Point, b: Point): Point[] {
  const mx = snap((a.x + b.x) / 2);
  return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
}

export function routeLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

export interface RoutePosition {
  point: Point;
  heading: number;
}

export function pointAt(points: Point[], t: number): RoutePosition {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return { point: { x: 0, y: 0 }, heading: 0 };
  const clamped = Math.min(1, Math.max(0, t));
  const total = routeLength(points);
  let target = clamped * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (target <= seg || i === points.length - 1) {
      const f = seg === 0 ? 0 : Math.min(1, target / seg);
      return {
        point: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f },
        heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }
    target -= seg;
  }
  return { point: last, heading: 0 };
}

export function activeRoute(d: Delivery): Point[] | null {
  if (d.status === "to_pickup") return buildRoute(d.agentStart, d.pickup);
  if (d.status === "transit" || d.status === "at_pickup") return buildRoute(d.pickup, d.dropoff);
  return null;
}

export function legProgress(d: Delivery, now: number): number {
  if (d.status !== "to_pickup" && d.status !== "transit") return d.status === "delivered" ? 1 : 0;
  if (d.legDurationMs <= 0) return 1;
  return Math.min(1, Math.max(0, (now - d.legStartedAt) / d.legDurationMs));
}

export function vehiclePosition(d: Delivery, now: number): RoutePosition | null {
  const route = activeRoute(d);
  if (!route) return null;
  return pointAt(route, legProgress(d, now));
}

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Awaiting courier",
  assigned: "Courier assigned",
  accepted: "Courier accepted",
  to_pickup: "Heading to pickup",
  at_pickup: "At the studio",
  transit: "On the way to you",
  delivered: "Delivered",
};

export const STATUS_ORDER: DeliveryStatus[] = [
  "assigned",
  "accepted",
  "to_pickup",
  "at_pickup",
  "transit",
  "delivered",
];

export function makeSeed(now: number): DeliveryState {
  const agents: DeliveryAgent[] = [
    {
      id: "ag-1",
      name: "Kelvin Mushi",
      vehicle: "Motorbike · Boxer 150",
      plate: "MC 4821",
      phone: "+255 714 220 184",
      rating: 4.9,
      trips: 312,
      status: "online",
    },
    {
      id: "ag-2",
      name: "Asha Juma",
      vehicle: "Cargo bike · e-assist",
      plate: "CB 1107",
      phone: "+255 765 903 441",
      rating: 4.8,
      trips: 208,
      status: "online",
    },
    {
      id: "ag-3",
      name: "Baraka Noel",
      vehicle: "Van · Suzuki Carry",
      plate: "T 6640",
      phone: "+255 713 551 209",
      rating: 4.7,
      trips: 154,
      status: "offline",
    },
  ];

  const deliveries: Delivery[] = [
    {
      id: "dl-1",
      orderNumber: "SH-20417",
      buyer: "Tilda Augustino",
      buyerAddress: "14 Palm Lane, Masaki",
      storeName: "Amigo Farm House",
      items: ["T-bone steak · 1kg", "Pumkini · 1"],
      total: "TZS 11,000",
      pickup: { x: 180, y: 140 },
      dropoff: { x: 820, y: 480 },
      agentStart: { x: 420, y: 320 },
      agentId: "ag-1",
      status: "transit",
      legStartedAt: now,
      legDurationMs: 75_000,
      createdAt: now - 9 * 60_000,
    },
    {
      id: "dl-2",
      orderNumber: "SH-20418",
      buyer: "Neema Joseph",
      buyerAddress: "8 Coral Street, Oysterbay",
      storeName: "Mahajumanti",
      items: ["Maandazi · 6 pack"],
      total: "TZS 7,000",
      pickup: { x: 520, y: 220 },
      dropoff: { x: 700, y: 120 },
      agentStart: { x: 300, y: 420 },
      agentId: "ag-2",
      status: "to_pickup",
      legStartedAt: now,
      legDurationMs: 30_000,
      createdAt: now - 4 * 60_000,
    },
    {
      id: "dl-3",
      orderNumber: "SH-20419",
      buyer: "Frank Mwita",
      buyerAddress: "22 Hill Road, Upanga",
      storeName: "Mtsare Shop",
      items: ["Stoneware mug · set of 2"],
      total: "TZS 24,000",
      pickup: { x: 320, y: 420 },
      dropoff: { x: 860, y: 260 },
      agentStart: { x: 600, y: 500 },
      agentId: null,
      status: "pending",
      legStartedAt: 0,
      legDurationMs: 60_000,
      createdAt: now - 2 * 60_000,
    },
    {
      id: "dl-4",
      orderNumber: "SH-20416",
      buyer: "Grace Kimaro",
      buyerAddress: "3 Beach Road, Msasani",
      storeName: "Amigo Farm House",
      items: ["Free-range eggs · tray"],
      total: "TZS 9,000",
      pickup: { x: 180, y: 140 },
      dropoff: { x: 640, y: 560 },
      agentStart: { x: 400, y: 200 },
      agentId: "ag-1",
      status: "delivered",
      legStartedAt: now - 20 * 60_000,
      legDurationMs: 60_000,
      createdAt: now - 32 * 60_000,
    },
  ];

  return { agents, deliveries };
}
