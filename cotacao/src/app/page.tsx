"use client";

import { useCallback, useState } from "react";
import { CotacaoProvider, useCotacao } from "@/lib/store";
import { T } from "@/lib/theme";
import { Login } from "@/components/Login";
import { OfertaBiometria, TelaDesbloqueio } from "@/components/Biometria";
import { Centro } from "@/components/ui";
import { Lista } from "@/components/Lista";
import { Resultado } from "@/components/Resultado";
import { Ajustes } from "@/components/Ajustes";
import type { ResultadoCotacao } from "@/lib/types";

type Tela = "lista" | "resultado" | "ajustes";

function AppShell() {
  const { model, carregando, offline, nome, entrar, sair, dispatch, toast, mostrarToast, travado, tentarDesbloquear, ofertaBiometria, ativarBiometria, dispensarOfertaBiometria } =
    useCotacao();
  const [tela, setTela] = useState<Tela>("lista");
  const [cotando, setCotando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCotacao | null>(null);

  const cotar = useCallback(async () => {
    setCotando(true);
    try {
      const resp = await fetch("/api/cotar", { method: "POST" });
      const dados = await resp.json();
      if (!resp.ok) {
        mostrarToast(dados.erro ?? "Não deu pra cotar agora.");
        return;
      }
      setResultado(dados as ResultadoCotacao);
      setTela("resultado");
    } catch {
      mostrarToast("Sem conexão — não deu pra cotar agora.");
    } finally {
      setCotando(false);
    }
  }, [mostrarToast]);

  if (carregando && !model) return <Centro>Carregando…</Centro>;
  if (!nome) return <Login onOk={entrar} />;
  if (travado) return <TelaDesbloqueio nome={nome} onTentar={tentarDesbloquear} />;
  if (!model) return <Centro>Sem conexão e sem dados salvos neste aparelho ainda. Conecte à internet uma vez.</Centro>;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", justifyContent: "center", padding: "20px 12px" }}>
      <div style={{ width: 400, maxWidth: "100%" }}>
        {ofertaBiometria && <OfertaBiometria onAtivar={ativarBiometria} onDispensar={dispensarOfertaBiometria} />}
        {offline && (
          <div style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", background: T.brick, color: "#fff", padding: "7px 16px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, zIndex: 500 }}>
            Sem internet — gravando neste aparelho
          </div>
        )}
        {toast && (
          <div style={{ position: "fixed", top: offline ? 48 : 14, left: "50%", transform: "translateX(-50%)", background: T.ink, color: T.paper, padding: "9px 18px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, zIndex: 500 }}>
            {toast}
          </div>
        )}

        {tela === "lista" && (
          <Lista itens={model.itens} nome={nome} cotando={cotando} dispatch={dispatch} onCotar={cotar} onAjustes={() => setTela("ajustes")} />
        )}

        {tela === "resultado" && resultado && (
          <Resultado resultado={resultado} onIrAjustes={() => setTela("ajustes")} onClose={() => setTela("lista")} />
        )}

        {tela === "ajustes" && (
          <Ajustes shibataToken={model.config.shibataToken} dispatch={dispatch} mostrarToast={mostrarToast} onSair={sair} onClose={() => setTela("lista")} />
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <CotacaoProvider>
      <AppShell />
    </CotacaoProvider>
  );
}
