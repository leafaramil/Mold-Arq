"use client";

import type { CSSProperties, ReactNode } from "react";
import { T, fontSerif } from "@/lib/theme";

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
        padding: 24,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

export function Card({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: T.raised, border: `1px solid ${T.line}`, borderRadius: 16, padding: 15, marginBottom: 11, ...style }}>
      {children}
    </div>
  );
}

export function Tit({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: T.inkSoft, fontWeight: 700, marginBottom: 6 }}>
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "gold" | "green" | "blue" | "ghost";

const variantes: Record<BtnVariant, CSSProperties> = {
  primary: { background: T.ink, color: T.paper },
  gold: { background: T.gold, color: "#fff" },
  green: { background: T.green, color: "#fff" },
  blue: { background: T.blue, color: "#fff" },
  ghost: { background: "transparent", color: T.ink, border: `1.5px solid ${T.line}` },
};

export function Btn({
  children,
  onClick,
  v = "primary",
  disabled,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  v?: BtnVariant;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
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
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
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
