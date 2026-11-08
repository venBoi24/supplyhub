export interface Point {
  lat: number;
  lng: number;
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
  // Resolved road geometry for the current leg (free OSRM routing). Null until
  // resolved or when routing is unavailable, in which case a fallback is used.
  route: Point[] | null;
}

export interface DeliveryState {
  agents: DeliveryAgent[];
  deliveries: Delivery[];
}

// Dar es Salaam, the home city of the marketplace.
export const MAP_CENTER: Point = { lat: -6.778, lng: 39.246 };
export const MAP_ZOOM = 13;

const METERS_PER_DEG_LAT = 111_320;

function segmentMeters(a: Point, b: Point): number {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dy = (b.lat - a.lat) * METERS_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * METERS_PER_DEG_LAT * Math.cos(midLat);
  return Math.hypot(dx, dy);
}

// Bearing in degrees clockwise from north, for rotating the courier arrow.
function segmentBearing(a: Point, b: Point): number {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dy = (b.lat - a.lat) * METERS_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * METERS_PER_DEG_LAT * Math.cos(midLat);
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

// Offline fallback: a simple two-bend path so tracking still works if the
// free routing service is unreachable.
export function buildRoute(a: Point, b: Point): Point[] {
  const midLng = (a.lng + b.lng) / 2;
  return [a, { lat: a.lat, lng: midLng }, { lat: b.lat, lng: midLng }, b];
}

export function routeLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += segmentMeters(points[i - 1]!, points[i]!);
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
  if (!first || !last) return { point: MAP_CENTER, heading: 0 };
  const clamped = Math.min(1, Math.max(0, t));
  const total = routeLength(points);
  let target = clamped * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const seg = segmentMeters(a, b);
    if (target <= seg || i === points.length - 1) {
      const f = seg === 0 ? 0 : Math.min(1, target / seg);
      return {
        point: { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f },
        heading: segmentBearing(a, b),
      };
    }
    target -= seg;
  }
  return { point: last, heading: 0 };
}

export function activeRoute(d: Delivery): Point[] | null {
  if (d.status === "to_pickup") return d.route ?? buildRoute(d.agentStart, d.pickup);
  if (d.status === "transit") return d.route ?? buildRoute(d.pickup, d.dropoff);
  if (d.status === "at_pickup") return buildRoute(d.pickup, d.dropoff);
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

// Free, key-less road routing from the public OSRM demo server. Returns a
// simplified polyline, or null on any failure so callers fall back gracefully.
export async function fetchRoadRoute(a: Point, b: Point): Promise<Point[] | null> {
  const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    const raw = json.routes?.[0]?.geometry?.coordinates;
    if (!raw || raw.length < 2) return null;
    const stride = Math.max(1, Math.ceil(raw.length / 160));
    const points: Point[] = [];
    for (let i = 0; i < raw.length; i += stride) {
      const c = raw[i]!;
      points.push({ lat: c[1], lng: c[0] });
    }
    const lastCoord = raw[raw.length - 1]!;
    points.push({ lat: lastCoord[1], lng: lastCoord[0] });
    return points;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
      pickup: { lat: -6.798, lng: 39.221 },
      dropoff: { lat: -6.748, lng: 39.27 },
      agentStart: { lat: -6.775, lng: 39.245 },
      agentId: "ag-1",
      status: "transit",
      legStartedAt: now,
      legDurationMs: 75_000,
      createdAt: now - 9 * 60_000,
      route: null,
    },
    {
      id: "dl-2",
      orderNumber: "SH-20418",
      buyer: "Neema Joseph",
      buyerAddress: "8 Coral Street, Oysterbay",
      storeName: "Mahajumanti",
      items: ["Maandazi · 6 pack"],
      total: "TZS 7,000",
      pickup: { lat: -6.783, lng: 39.283 },
      dropoff: { lat: -6.776, lng: 39.29 },
      agentStart: { lat: -6.8, lng: 39.26 },
      agentId: "ag-2",
      status: "to_pickup",
      legStartedAt: now,
      legDurationMs: 30_000,
      createdAt: now - 4 * 60_000,
      route: null,
    },
    {
      id: "dl-3",
      orderNumber: "SH-20419",
      buyer: "Frank Mwita",
      buyerAddress: "22 Hill Road, Upanga",
      storeName: "Mtsare Shop",
      items: ["Stoneware mug · set of 2"],
      total: "TZS 24,000",
      pickup: { lat: -6.805, lng: 39.22 },
      dropoff: { lat: -6.79, lng: 39.205 },
      agentStart: { lat: -6.78, lng: 39.25 },
      agentId: null,
      status: "pending",
      legStartedAt: 0,
      legDurationMs: 60_000,
      createdAt: now - 2 * 60_000,
      route: null,
    },
    {
      id: "dl-4",
      orderNumber: "SH-20416",
      buyer: "Grace Kimaro",
      buyerAddress: "3 Beach Road, Msasani",
      storeName: "Amigo Farm House",
      items: ["Free-range eggs · tray"],
      total: "TZS 9,000",
      pickup: { lat: -6.798, lng: 39.221 },
      dropoff: { lat: -6.766, lng: 39.25 },
      agentStart: { lat: -6.78, lng: 39.23 },
      agentId: "ag-1",
      status: "delivered",
      legStartedAt: now - 20 * 60_000,
      legDurationMs: 60_000,
      createdAt: now - 32 * 60_000,
      route: null,
    },
  ];

  return { agents, deliveries };
}
