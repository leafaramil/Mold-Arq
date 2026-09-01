"use client";

import { useState } from "react";
import { T } from "@/lib/theme";
import type { Action } from "@/lib/action-types";
import { Btn, Card, Tit, Topo } from "./ui";

export function Ajustes({
  shibataToken,
  dispatch,
  mostrarToast,
  onSair,
  onClose,
}: {
  shibataToken: string | null;
  dispatch: (action: Action) => void;
  mostrarToast: (msg: string) => void;
  onSair: () => void;
  onClose: () => void;
}) {
  const [token, setToken] = useState(shibataToken ?? "");

  function salvar() {
    dispatch({ type: "setShibataToken", token: token.trim() });
    mostrarToast("Token do Shibata atualizado");
  }

  return (
    <div>
      <Topo titulo="Ajustes" onClose={onClose} />

      <Card>
        <Tit>Token do Shibata</Tit>
        <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 10, lineHeight: 1.5 }}>
          O Shibata usa um token de sessão que expira de tempos em tempos. Quando a cotação avisar que ele
          expirou, capture um novo token pelo DevTools do navegador no site do Shibata e cole aqui.
        </div>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="cole o token JWT aqui…"
          rows={4}
          style={{
            width: "100%",
            border: `1px solid ${T.line}`,
            borderRadius: 10,
            padding: 10,
            fontSize: 12,
            fontFamily: "monospace",
            background: T.paper,
            color: T.ink,
            resize: "vertical",
            marginBottom: 10,
          }}
        />
        <Btn v="gold" onClick={salvar}>
          Salvar token
        </Btn>
      </Card>

      <Card>
        <Btn v="ghost" onClick={onSair}>
          Trocar de usuário
        </Btn>
      </Card>
    </div>
  );
}
