"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";

import { activeRoute, MAP_CENTER, MAP_ZOOM, vehiclePosition, type Delivery } from "./model";

interface DeliveryMapProps {
  deliveries: Delivery[];
  focusId: string | null;
  now: number;
}

// Free OpenStreetMap raster tiles — no API key, no account, no billing.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const PICKUP_HTML =
  '<span class="dh-pin dh-pin--pickup"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ccfbf1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg></span>';
const DROPOFF_HTML =
  '<span class="dh-pin dh-pin--dropoff"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffedd5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6"/></svg></span>';

function courierHtml(isFocus: boolean, heading: number): string {
  const size = isFocus ? 30 : 22;
  return `<span class="dh-courier${isFocus ? " dh-courier--focus" : ""}" style="width:${size}px;height:${size}px"><span class="dh-courier__rot" style="transform:rotate(${heading}deg)"><svg viewBox="0 0 24 24" width="${size - 10}" height="${size - 10}" fill="none" stroke="#fff7ed" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l6 16-6-4-6 4z" fill="#fff7ed" stroke="none"/></svg></span></span>`;
}

interface LayerMeta {
  routeKey?: string;
  routeFocus?: boolean;
  routeLine?: Leaflet.Polyline;
  routeGlow?: Leaflet.Polyline;
  pinKey?: string;
  pickupMarker?: Leaflet.Marker;
  dropoffMarker?: Leaflet.Marker;
  courier?: Leaflet.Marker;
  courierFocus?: boolean;
}

type GroupWithMeta = Leaflet.LayerGroup & { dhMeta?: LayerMeta };

export function DeliveryMap({ deliveries, focusId, now }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layersRef = useRef<Map<string, GroupWithMeta>>(new Map());
  const fittedKeyRef = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [tilesOk, setTilesOk] = useState(true);

  // Build / rebuild the per-delivery layers (route + pins + moving courier).
  // Runs inside an effect so it always reads the latest live data and never
  // touches refs during render.
  useEffect(() => {
    if (!ready) return;
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const layers = layersRef.current;
    const seen = new Set<string>();

    for (const d of deliveries) {
      seen.add(d.id);
      let group = layers.get(d.id);
      if (!group) {
        group = L.layerGroup().addTo(map) as GroupWithMeta;
        layers.set(d.id, group);
      }
      const isFocus = d.id === focusId;
      const route = activeRoute(d);
      const pos = vehiclePosition(d, now);
      const routeKey = route
        ? route.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|")
        : "";
      const meta: LayerMeta = (group.dhMeta ??= {});

      // Route polyline — only rebuilt when the geometry actually changes.
      if (meta.routeKey !== routeKey || meta.routeFocus !== isFocus) {
        if (meta.routeLine) group.removeLayer(meta.routeLine);
        if (meta.routeGlow) group.removeLayer(meta.routeGlow);
        meta.routeLine = undefined;
        meta.routeGlow = undefined;
        meta.routeKey = routeKey;
        meta.routeFocus = isFocus;
        if (route && route.length > 1) {
          const latlngs = route.map((p) => [p.lat, p.lng] as [number, number]);
          if (isFocus) {
            meta.routeGlow = L.polyline(latlngs, {
              color: "#f97316",
              weight: 11,
              opacity: 0.22,
              lineJoin: "round",
              lineCap: "round",
              interactive: false,
            }).addTo(group);
          }
          meta.routeLine = L.polyline(latlngs, {
            color: isFocus ? "#fb923c" : "#3b4d75",
            weight: isFocus ? 4 : 2.5,
            opacity: isFocus ? 0.95 : 0.6,
            dashArray: isFocus ? "1 9" : undefined,
            lineJoin: "round",
            lineCap: "round",
            className: isFocus ? "dh-route dh-route--focus" : "dh-route",
            interactive: false,
          }).addTo(group);
        }
      }

      // Pickup / dropoff pins for the focused delivery.
      const pinKey = isFocus
        ? `${d.pickup.lat},${d.pickup.lng}|${d.dropoff.lat},${d.dropoff.lng}`
        : "";
      if (meta.pinKey !== pinKey) {
        if (meta.pickupMarker) group.removeLayer(meta.pickupMarker);
        if (meta.dropoffMarker) group.removeLayer(meta.dropoffMarker);
        meta.pickupMarker = undefined;
        meta.dropoffMarker = undefined;
        meta.pinKey = pinKey;
        if (isFocus) {
          meta.pickupMarker = L.marker([d.pickup.lat, d.pickup.lng], {
            icon: L.divIcon({
              className: "dh-icon",
              html: PICKUP_HTML,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            }),
            interactive: false,
            keyboard: false,
          }).addTo(group);
          meta.dropoffMarker = L.marker([d.dropoff.lat, d.dropoff.lng], {
            icon: L.divIcon({
              className: "dh-icon",
              html: DROPOFF_HTML,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            }),
            interactive: false,
            keyboard: false,
          }).addTo(group);
        }
      }

      // Courier marker — created once, then moved smoothly each tick.
      if (pos) {
        let courier = meta.courier;
        if (!courier) {
          courier = L.marker([pos.point.lat, pos.point.lng], {
            icon: L.divIcon({
              className: "dh-icon dh-icon--courier",
              html: courierHtml(isFocus, pos.heading),
              iconSize: [isFocus ? 30 : 22, isFocus ? 30 : 22],
              iconAnchor: [isFocus ? 15 : 11, isFocus ? 15 : 11],
            }),
            interactive: false,
            keyboard: false,
            zIndexOffset: isFocus ? 1000 : 500,
          }).addTo(group);
          meta.courier = courier;
          meta.courierFocus = isFocus;
        } else {
          courier.setLatLng([pos.point.lat, pos.point.lng]);
          courier.setZIndexOffset(isFocus ? 1000 : 500);
          const rot = courier.getElement()?.querySelector<HTMLElement>(".dh-courier__rot");
          if (rot) rot.style.transform = `rotate(${pos.heading}deg)`;
          if (meta.courierFocus !== isFocus) {
            meta.courierFocus = isFocus;
            const size = isFocus ? 30 : 22;
            courier.setIcon(
              L.divIcon({
                className: "dh-icon dh-icon--courier",
                html: courierHtml(isFocus, pos.heading),
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              }),
            );
          }
        }
      } else if (meta.courier) {
        group.removeLayer(meta.courier);
        meta.courier = undefined;
      }
    }

    // Drop layers for deliveries that no longer exist (e.g. after reset).
    for (const [id, group] of layers) {
      if (!seen.has(id)) {
        map.removeLayer(group);
        layers.delete(id);
      }
    }

    // Fit the viewport to the focused delivery, or to all active couriers.
    const focus = deliveries.find((d) => d.id === focusId) ?? null;
    const fitKey = focus
      ? `f:${focus.id}:${focus.pickup.lat},${focus.pickup.lng}:${focus.dropoff.lat},${focus.dropoff.lng}`
      : `a:${deliveries.map((d) => d.id).join(",")}`;
    if (fittedKeyRef.current !== fitKey) {
      fittedKeyRef.current = fitKey;
      const pts: [number, number][] = [];
      if (focus) {
        pts.push([focus.pickup.lat, focus.pickup.lng], [focus.dropoff.lat, focus.dropoff.lng]);
        const p = vehiclePosition(focus, now);
        if (p) pts.push([p.point.lat, p.point.lng]);
      } else {
        for (const d of deliveries) {
          const p = vehiclePosition(d, now);
          if (p) pts.push([p.point.lat, p.point.lng]);
          pts.push([d.pickup.lat, d.pickup.lng], [d.dropoff.lat, d.dropoff.lng]);
        }
      }
      if (pts.length > 0) {
        map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15, animate: true });
      }
    }
  }, [ready, deliveries, focusId, now]);

  // Initialise the map once on the client.
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    const layers = layersRef.current;

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      LRef.current = L;
      map = L.map(containerRef.current, {
        center: [MAP_CENTER.lat, MAP_CENTER.lng],
        zoom: MAP_ZOOM,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
      });
      mapRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const tiles = L.tileLayer(TILE_URL, {
        attribution: TILE_ATTR,
        maxZoom: 19,
        className: "dh-tiles",
        crossOrigin: true,
      });
      let errors = 0;
      tiles.on("tileerror", () => {
        errors += 1;
        if (errors > 6 && !cancelled) setTilesOk(false);
      });
      tiles.on("tileload", () => {
        if (!cancelled) setTilesOk(true);
      });
      tiles.addTo(map);

      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
      mapRef.current = null;
      LRef.current = null;
      layers.clear();
      fittedKeyRef.current = "";
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        role="img"
        aria-label="Live delivery map showing couriers moving between studios and buyers across the city"
        className="dh-map h-full w-full"
      />
      {!tilesOk ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-9 z-[500] mx-auto w-fit rounded-lg border border-[#2a3a5f] bg-[#070a14]/90 px-3 py-1.5 text-[0.6875rem] text-[#fbbf24] backdrop-blur">
          Map tiles are slow to load — tracking continues on the fallback route.
        </div>
      ) : null}
      <style jsx global>{`
        .dh-map {
          background: #0a0f1d;
          font-family: inherit;
        }
        .dh-map .dh-tiles {
          filter: invert(1) hue-rotate(185deg) brightness(0.92) contrast(0.9) saturate(0.72);
        }
        .dh-map .leaflet-control-attribution {
          background: rgba(7, 10, 20, 0.78);
          color: #8b96ad;
          font-size: 10px;
          backdrop-filter: blur(4px);
        }
        .dh-map .leaflet-control-attribution a {
          color: #fb923c;
        }
        .dh-map .leaflet-bar {
          border: 1px solid #2a3a5f;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
        }
        .dh-map .leaflet-bar a {
          background: #0d1222;
          color: #edf1fb;
          border-bottom: 1px solid #223047;
          width: 30px;
          height: 30px;
          line-height: 30px;
        }
        .dh-map .leaflet-bar a:hover {
          background: #1a2440;
          color: #fb923c;
        }
        .dh-map .leaflet-bar a.leaflet-disabled {
          background: #0d1222;
          color: #4a5670;
        }
        .dh-icon {
          background: transparent;
          border: none;
        }
        .dh-icon--courier {
          transition: transform 0.5s linear;
          will-change: transform;
        }
        .dh-courier {
          position: relative;
          display: grid;
          place-items: center;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 30%, #fdba74, #f97316 55%, #c2410c);
          border: 2px solid #0a0f1d;
          box-shadow:
            0 0 0 3px rgba(249, 115, 22, 0.28),
            0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .dh-courier--focus {
          box-shadow:
            0 0 0 5px rgba(249, 115, 22, 0.32),
            0 0 22px rgba(249, 115, 22, 0.55);
        }
        .dh-courier--focus::after {
          content: "";
          position: absolute;
          inset: -7px;
          border-radius: 9999px;
          border: 2px solid rgba(249, 115, 22, 0.5);
          animation: dh-pulse 1.6s ease-out infinite;
        }
        .dh-courier__rot {
          display: grid;
          place-items: center;
          transition: transform 0.5s linear;
        }
        .dh-pin {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          border: 2px solid #0a0f1d;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
        }
        .dh-pin--pickup {
          background: radial-gradient(circle at 35% 30%, #2dd4bf, #0f766e);
        }
        .dh-pin--dropoff {
          background: radial-gradient(circle at 35% 30%, #fb923c, #c2410c);
        }
        .dh-route--focus {
          animation: dh-dash 1s linear infinite;
        }
        @keyframes dh-dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes dh-pulse {
          0% {
            transform: scale(0.85);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dh-icon--courier,
          .dh-courier__rot {
            transition: none;
          }
          .dh-route--focus,
          .dh-courier--focus::after {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
