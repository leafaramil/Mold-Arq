"use client";

import { useEffect, useState } from "react";
import { T, fontSerif } from "@/lib/theme";
import { Btn, Centro } from "./ui";

export function TelaDesbloqueio({ nome, onTentar }: { nome: string; onTentar: () => Promise<boolean> }) {
  const [falhou, setFalhou] = useState(false);
  const [tentando, setTentando] = useState(false);

  async function tentar() {
    setTentando(true);
    setFalhou(false);
    const ok = await onTentar();
    if (!ok) setFalhou(true);
    setTentando(false);
  }

  useEffect(() => {
    void tentar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Centro>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: fontSerif, fontSize: 28, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Caderno</div>
        <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 28 }}>{nome}, toque pra desbloquear</div>
        <div
          onClick={tentar}
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: T.raised,
            border: `1.5px solid ${T.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            cursor: "pointer",
            margin: "0 auto 20px",
          }}
        >
          🔒
        </div>
        {falhou && !tentando && <div style={{ fontSize: 11.5, color: T.brick, marginBottom: 14 }}>Não reconheci. Toque de novo.</div>}
        <div style={{ maxWidth: 220, margin: "0 auto" }}>
          <Btn v="gold" onClick={tentar}>
            {tentando ? "Verificando…" : "Desbloquear"}
          </Btn>
        </div>
      </div>
    </Centro>
  );
}

export function OfertaBiometria({ onAtivar, onDispensar }: { onAtivar: () => Promise<boolean>; onDispensar: () => void }) {
  const [tentando, setTentando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function ativar() {
    setTentando(true);
    setFalhou(false);
    const ok = await onAtivar();
    setTentando(false);
    if (!ok) setFalhou(true);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(44,58,54,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600, padding: 24 }}>
      <div style={{ background: T.paper, borderRadius: 20, padding: 22, width: "100%", maxWidth: 330, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
        <div style={{ fontFamily: fontSerif, fontSize: 17, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Proteger com digital?</div>
        <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
          Assim só quem tiver a digital ou o rosto cadastrado neste aparelho consegue abrir o Caderno.
        </div>
        {falhou && <div style={{ fontSize: 11, color: T.brick, marginBottom: 10 }}>Não deu certo. Pode tentar de novo ou deixar pra depois.</div>}
        <Btn v="gold" onClick={ativar} style={{ marginBottom: 9 }}>
          {tentando ? "Aguardando…" : "Ativar"}
        </Btn>
        <Btn v="ghost" onClick={onDispensar}>
          Agora não
        </Btn>
      </div>
    </div>
  );
}
