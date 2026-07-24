"use client";

import { formatPct } from "@/utils/format";

const ACID_GREEN_DARK = "#0FB86E";
const RED = "#E5484D";

/** Gauge de margem operacional — faixas: <20% vermelho, 20–30% amarelo, ≥30% verde */
export function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(value, 0.6));
  const angle = -180 + (clamped / 0.6) * 180;
  const color = value >= 0.3 ? ACID_GREEN_DARK : value >= 0.2 ? "#E7A100" : RED;

  const arc = (start: number, end: number, stroke: string) => {
    const r = 70,
      cx = 90,
      cy = 90;
    const p = (a: number): [number, number] => [
      cx + r * Math.cos((a * Math.PI) / 180),
      cy + r * Math.sin((a * Math.PI) / 180),
    ];
    const [x1, y1] = p(start);
    const [x2, y2] = p(end);
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        stroke={stroke}
        strokeWidth="14"
        fill="none"
        strokeLinecap="butt"
      />
    );
  };

  return (
    <svg viewBox="0 0 180 100" className="w-full max-w-[260px] mx-auto">
      {arc(-180, -120, "#FCD9DA")}
      {arc(-120, -90, "#FCEEC9")}
      {arc(-90, 0, "#CFF5E3")}
      <line
        x1="90"
        y1="90"
        x2={90 + 55 * Math.cos((angle * Math.PI) / 180)}
        y2={90 + 55 * Math.sin((angle * Math.PI) / 180)}
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="90" cy="90" r="5" fill="#111" />
      <text x="90" y="70" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>
        {formatPct(value)}
      </text>
    </svg>
  );
}
