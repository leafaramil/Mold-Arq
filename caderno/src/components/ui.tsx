"use client";

import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { T, fontSerif } from "@/lib/theme";
import { nomeMes, mesVizinho } from "@/lib/calc";

export function Centro({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        color: T.inkSoft,
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export const Card = forwardRef<HTMLDivElement, { children: ReactNode; style?: CSSProperties }>(function Card({ children, style }, ref) {
  return (
    <div ref={ref} style={{ background: T.raised, border: `1px solid ${T.line}`, borderRadius: 16, padding: 15, marginBottom: 11, ...style }}>
      {children}
    </div>
  );
});

export function Tit({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.inkSoft, fontWeight: 700, marginBottom: 6 }}>
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "gold" | "sage" | "blue" | "ghost";

const variantes: Record<BtnVariant, CSSProperties> = {
  primary: { background: T.ink, color: T.paper },
  gold: { background: T.gold, color: "#fff" },
  sage: { background: T.sage, color: "#fff" },
  blue: { background: T.blue, color: "#fff" },
  ghost: { background: "transparent", color: T.ink, border: `1.5px solid ${T.line}` },
};

export function Btn({
  children,
  onClick,
  v = "primary",
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  v?: BtnVariant;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: 13,
        borderRadius: 13,
        fontWeight: 700,
        fontSize: 13.5,
        border: "none",
        cursor: "pointer",
        width: "100%",
        fontFamily: "inherit",
        ...variantes[v],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Topo({ titulo, sub, onClose }: { titulo: string; sub?: string; onClose?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 13 }}>
      <div>
        <div style={{ fontFamily: fontSerif, fontSize: 21, fontWeight: 600, color: T.ink }}>{titulo}</div>
        {sub && <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>{sub}</div>}
      </div>
      {onClose && (
        <div
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: T.raised,
            border: `1px solid ${T.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ✕
        </div>
      )}
    </div>
  );
}

export function NavMes({ mes, setMes }: { mes: string; setMes: (m: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: T.raised,
        border: `1px solid ${T.line}`,
        borderRadius: 13,
        padding: "9px 12px",
        marginBottom: 13,
      }}
    >
      <div onClick={() => setMes(mesVizinho(mes, -1))} style={{ cursor: "pointer", fontSize: 20, color: T.gold, padding: "0 10px", fontWeight: 700 }}>
        ‹
      </div>
      <div style={{ fontFamily: fontSerif, fontSize: 15, fontWeight: 600, color: T.ink }}>{nomeMes(mes)}</div>
      <div onClick={() => setMes(mesVizinho(mes, 1))} style={{ cursor: "pointer", fontSize: 20, color: T.gold, padding: "0 10px", fontWeight: 700 }}>
        ›
      </div>
    </div>
  );
}
