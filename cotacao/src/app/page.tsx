"use client";

import { useCallback, useState } from "react";
import { CotacaoProvider, useCotacao } from "@/lib/store";
import { uid } from "@/lib/format";
import { T } from "@/lib/theme";
import { Login } from "@/components/Login";
import { OfertaBiometria, TelaDesbloqueio } from "@/components/Biometria";
import { Centro } from "@/components/ui";
import { Home } from "@/components/Home";
import { Lista } from "@/components/Lista";
import { Resultado } from "@/components/Resultado";
import { Ajustes } from "@/components/Ajustes";
import type { ResultadoCotacao } from "@/lib/types";

type Tela = "home" | "lista" | "resultado" | "ajustes";

function AppShell() {
  const { model, carregando, offline, nome, entrar, sair, dispatch, toast, mostrarToast, travado, tentarDesbloquear, ofertaBiometria, ativarBiometria, dispensarOfertaBiometria } =
    useCotacao();
  const [tela, setTela] = useState<Tela>("home");
  const [listaAtualId, setListaAtualId] = useState<string | null>(null);
  const [cotando, setCotando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCotacao | null>(null);

  const novaLista = useCallback(() => {
    const id = uid();
    dispatch({ type: "criarLista", listaId: id, criadaEm: new Date().toISOString() });
    setListaAtualId(id);
    setTela("lista");
  }, [dispatch]);

  const cotar = useCallback(async () => {
    if (!listaAtualId) return;
    setCotando(true);
    try {
      const resp = await fetch("/api/cotar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listaId: listaAtualId }),
      });
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
  }, [listaAtualId, mostrarToast]);

  if (carregando && !model) return <Centro>Carregando…</Centro>;
  if (!nome) return <Login onOk={entrar} />;
  if (travado) return <TelaDesbloqueio nome={nome} onTentar={tentarDesbloquear} />;
  if (!model) return <Centro>Sem conexão e sem dados salvos neste aparelho ainda. Conecte à internet uma vez.</Centro>;

  const listaAtual = model.listas.find((l) => l.id === listaAtualId) ?? null;
  const itensDaListaAtual = model.itens.filter((i) => i.listaId === listaAtualId);

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

        {tela === "home" && (
          <Home
            nome={nome}
            listas={model.listas}
            itens={model.itens}
            onNovaLista={novaLista}
            onAbrirLista={(id) => {
              setListaAtualId(id);
              setTela("lista");
            }}
            onAjustes={() => setTela("ajustes")}
          />
        )}

        {tela === "lista" && listaAtual && (
          <Lista
            lista={listaAtual}
            itens={itensDaListaAtual}
            cotando={cotando}
            dispatch={dispatch}
            onCotar={cotar}
            onExcluida={() => {
              setListaAtualId(null);
              setTela("home");
            }}
            onClose={() => setTela("home")}
          />
        )}

        {tela === "resultado" && resultado && (
          <Resultado resultado={resultado} onIrAjustes={() => setTela("ajustes")} onClose={() => setTela("lista")} />
        )}

        {tela === "ajustes" && (
          <Ajustes shibataToken={model.config.shibataToken} dispatch={dispatch} mostrarToast={mostrarToast} onSair={sair} onClose={() => setTela("home")} />
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
