"use client";

import { useId } from "react";

import { activeRoute, MAP_H, MAP_W, vehiclePosition, type Delivery } from "./model";

interface DeliveryMapProps {
  deliveries: Delivery[];
  focusId: string | null;
  now: number;
}

const V_STREETS = [100, 200, 320, 420, 520, 640, 760, 860];
const H_STREETS = [80, 140, 220, 320, 420, 480, 560];

export function DeliveryMap({ deliveries, focusId, now }: DeliveryMapProps) {
  const uid = useId().replace(/[:]/g, "");
  const focus = deliveries.find((d) => d.id === focusId) ?? null;

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role="img"
      aria-label="Live delivery map showing couriers moving between studios and buyers"
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <filter id={`blur-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Base asphalt */}
      <rect width={MAP_W} height={MAP_H} fill="#0a0f1d" />

      {/* Water band */}
      <path
        d={`M ${MAP_W} 0 L ${MAP_W} ${MAP_H} L 900 ${MAP_H} C 940 480 920 300 960 140 L 940 0 Z`}
        fill="#0e1e38"
      />
      <path
        d="M 950 60 C 930 220 950 420 920 600"
        stroke="#1a3357"
        strokeWidth="3"
        fill="none"
        opacity="0.7"
      />

      {/* Park blocks */}
      <rect x="230" y="250" width="150" height="120" rx="14" fill="#12271f" />
      <rect x="560" y="340" width="120" height="90" rx="14" fill="#12271f" />
      <circle cx="280" cy="290" r="10" fill="#1a3a2c" />
      <circle cx="330" cy="330" r="14" fill="#1a3a2c" />
      <circle cx="600" cy="375" r="9" fill="#1a3a2c" />

      {/* City blocks */}
      {[
        [110, 90, 80, 40],
        [210, 90, 100, 40],
        [430, 90, 80, 40],
        [650, 90, 100, 40],
        [110, 150, 80, 60],
        [430, 150, 80, 60],
        [650, 150, 100, 60],
        [110, 330, 110, 80],
        [430, 330, 120, 80],
        [770, 330, 80, 80],
        [110, 430, 110, 40],
        [430, 430, 120, 40],
        [770, 430, 80, 40],
        [210, 490, 100, 60],
        [530, 490, 100, 60],
        [770, 490, 80, 60],
      ].map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="8"
          fill="#0f1526"
          stroke="#161f36"
          strokeWidth="1"
        />
      ))}

      {/* Streets */}
      {V_STREETS.map((x) => (
        <line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={MAP_H}
          stroke={x === 420 || x === 640 ? "#243352" : "#1a2440"}
          strokeWidth={x === 420 || x === 640 ? 5 : 3}
        />
      ))}
      {H_STREETS.map((y) => (
        <line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={MAP_W}
          y2={y}
          stroke={y === 220 || y === 420 ? "#243352" : "#1a2440"}
          strokeWidth={y === 220 || y === 420 ? 5 : 3}
        />
      ))}

      {/* Routes */}
      {deliveries.map((d) => {
        const route = activeRoute(d);
        if (!route) return null;
        const isFocus = d.id === focusId;
        const pts = route.map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <g key={`route-${d.id}`}>
            {isFocus ? (
              <polyline
                points={pts}
                fill="none"
                stroke="#f97316"
                strokeWidth="10"
                opacity="0.25"
                filter={`url(#blur-${uid})`}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            <polyline
              points={pts}
              fill="none"
              stroke={isFocus ? "#f97316" : "#2c3d63"}
              strokeWidth={isFocus ? 4 : 2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={isFocus ? "10 8" : undefined}
              opacity={isFocus ? 1 : 0.7}
            >
              {isFocus ? (
                <animate
                  attributeName="stroke-dashoffset"
                  from="36"
                  to="0"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              ) : null}
            </polyline>
          </g>
        );
      })}

      {/* Pickup / dropoff pins for the focused delivery */}
      {focus ? (
        <g>
          <g transform={`translate(${focus.pickup.x}, ${focus.pickup.y})`}>
            <circle r="16" fill="#0f766e" opacity="0.25" />
            <circle r="9" fill="#0f766e" stroke="#5eead4" strokeWidth="2" />
            <path
              d="M -3 1 h 6 M -3 -2 h 6 M 0 -5 v 8"
              stroke="#ccfbf1"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
          <g transform={`translate(${focus.dropoff.x}, ${focus.dropoff.y})`}>
            <circle r="16" fill="#f97316" opacity="0.2" />
            <circle r="9" fill="#c2410c" stroke="#fdba74" strokeWidth="2" />
            <path
              d="M -3.5 1 L 0 -3 L 3.5 1 M -2.5 0 v 3.5 h 5 v -3.5"
              stroke="#ffedd5"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      ) : null}

      {/* Vehicles */}
      {deliveries.map((d) => {
        const pos = vehiclePosition(d, now);
        if (!pos) return null;
        const isFocus = d.id === focusId;
        const r = isFocus ? 13 : 9;
        return (
          <g
            key={`veh-${d.id}`}
            style={{
              transform: `translate(${pos.point.x}px, ${pos.point.y}px)`,
              transition: "transform 0.5s linear",
            }}
          >
            <circle r={r * 2.4} fill={`url(#glow-${uid})`} />
            <circle r={r + 4} fill="#f97316" opacity="0.25">
              <animate
                attributeName="r"
                values={`${r + 2};${r + 8};${r + 2}`}
                dur="1.6s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.35;0.05;0.35"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>
            <g
              style={{
                transform: `rotate(${pos.heading}deg)`,
                transition: "transform 0.5s linear",
              }}
            >
              <circle r={r} fill="#f97316" stroke="#0a0f1d" strokeWidth="2.5" />
              <path
                d={`M ${-r * 0.35} 0 L ${r * 0.45} 0 M ${r * 0.1} ${-r * 0.3} L ${r * 0.45} 0 L ${r * 0.1} ${r * 0.3}`}
                stroke="#fff7ed"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
