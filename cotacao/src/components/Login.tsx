"use client";

import { T, fontSerif } from "@/lib/theme";
import { Centro } from "./ui";

export function Login({ onOk }: { onOk: (nome: string) => void }) {
  return (
    <Centro>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: fontSerif, fontSize: 32, fontWeight: 600, color: T.ink }}>Cotação</div>
        <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 32 }}>quem está usando?</div>
        <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
          {["Rafael", "Letícia"].map((n) => (
            <div key={n} onClick={() => onOk(n)} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: T.raised,
                  border: `1.5px solid ${T.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                }}
              >
                👆
              </div>
              <div style={{ fontWeight: 700, color: T.ink, fontSize: 13 }}>{n}</div>
            </div>
          ))}
        </div>
      </div>
    </Centro>
  );
}
