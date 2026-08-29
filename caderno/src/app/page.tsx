"use client";

import { useCallback, useMemo, useState } from "react";
import { CadernoProvider, useCaderno } from "@/lib/store";
import { calcularAvisos, calcularLivre, resolverCartao, resolverDespesa } from "@/lib/calc";
import { useEscutaCuringa } from "@/lib/wakeword";
import { T } from "@/lib/theme";
import { Login } from "@/components/Login";
import { OfertaBiometria, TelaDesbloqueio } from "@/components/Biometria";
import { Centro } from "@/components/ui";
import { Home, type Tela } from "@/components/Home";
import { Calendario } from "@/components/Calendario";
import { ListaDespesas, ListaReceitas } from "@/components/Lista";
import { Ajustes } from "@/components/Ajustes";
import { Aristides } from "@/components/Aristides";

const ONBOARDING_CHAVE = "onboarding";

function AppShell() {
  const {
    model,
    carregando,
    offline,
    mes,
    setMes,
    nome,
    entrar,
    sair,
    dispatch,
    toast,
    mostrarToast,
    travado,
    tentarDesbloquear,
    ofertaBiometria,
    ativarBiometria,
    dispensarOfertaBiometria,
    escutaCuringa,
    alternarEscutaCuringa,
  } = useCaderno();
  const [tela, setTela] = useState<Tela>("home");
  const [gatilhoAristides, setGatilhoAristides] = useState<{ texto: string; ts: number } | null>(null);
  const hoje = useMemo(() => new Date(), []);

  const nomeAssistente = model?.config.assistente ?? "";
  const escutaAtiva = escutaCuringa && !!nome && !travado && !!model && tela !== "aristides";
  const aoAcionarCuringa = useCallback((resto: string) => {
    setTela("aristides");
    setGatilhoAristides({ texto: resto, ts: Date.now() });
  }, []);
  useEscutaCuringa(escutaAtiva, nomeAssistente, aoAcionarCuringa);

  if (carregando && !model) return <Centro>Carregando…</Centro>;
  if (!nome) return <Login onOk={entrar} />;
  if (travado) return <TelaDesbloqueio nome={nome} onTentar={tentarDesbloquear} />;
  if (!model) return <Centro>Sem conexão e sem dados salvos neste aparelho ainda. Conecte à internet uma vez.</Centro>;

  const livre = calcularLivre(model, mes, hoje);

  const despesas = model.despesas.map((d) => resolverDespesa(d, mes)).filter((d): d is NonNullable<typeof d> => d !== null);
  const cartoes = model.cartoes.map((c) => resolverCartao(c, model.parcelas, mes));
  const estadosDoMes = model.estados[mes] ?? {};
  const itensParaAviso = [
    ...despesas.map((d) => ({ id: d.id, nome: d.nome, icone: d.icone, dia: d.dia })),
    ...cartoes.map((c) => ({ id: c.id, nome: c.nome, icone: c.icone, dia: c.vencimento })),
  ];
  const estadosParaAviso: Record<string, { pago: number | null }> = {};
  for (const it of itensParaAviso) estadosParaAviso[it.id] = { pago: estadosDoMes[it.id]?.pago ?? null };
  const avisos = calcularAvisos(itensParaAviso, estadosParaAviso, model.avisosDispensados, mes, hoje);

  const onboardingVisivel = !model.avisosDispensados.includes(ONBOARDING_CHAVE);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", justifyContent: "center", padding: "20px 12px" }}>
      <div style={{ width: 400, maxWidth: "100%" }}>
        {ofertaBiometria && <OfertaBiometria onAtivar={ativarBiometria} onDispensar={dispensarOfertaBiometria} />}
        {escutaAtiva && (
          <div
            title={`Escutando "${nomeAssistente}"`}
            style={{
              position: "fixed",
              bottom: 16,
              right: 16,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: T.ink,
              color: T.paper,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              opacity: 0.55,
              zIndex: 400,
            }}
          >
            👂
          </div>
        )}
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
            assistente={model.config.assistente}
            mes={mes}
            livre={livre}
            avisos={avisos}
            onboardingVisivel={onboardingVisivel}
            onDispensarOnboarding={() => dispatch({ type: "dispensarAviso", chave: ONBOARDING_CHAVE })}
            onDispensarAviso={(chave) => dispatch({ type: "dispensarAviso", chave })}
            onIr={setTela}
          />
        )}

        {tela === "calendario" && (
          <Calendario model={model} mes={mes} setMes={setMes} dispatch={dispatch} mostrarToast={mostrarToast} onClose={() => setTela("home")} />
        )}

        {tela === "aristides" && (
          <Aristides model={model} mes={mes} nome={model.config.assistente} dispatch={dispatch} onClose={() => setTela("home")} gatilho={gatilhoAristides} />
        )}

        {tela === "despesas" && (
          <ListaDespesas model={model} mes={mes} setMes={setMes} dispatch={dispatch} mostrarToast={mostrarToast} onClose={() => setTela("home")} />
        )}

        {tela === "receitas" && (
          <ListaReceitas model={model} mes={mes} setMes={setMes} dispatch={dispatch} mostrarToast={mostrarToast} onClose={() => setTela("home")} />
        )}

        {tela === "ajustes" && (
          <Ajustes
            model={model}
            mes={mes}
            nome={nome}
            dispatch={dispatch}
            mostrarToast={mostrarToast}
            onSair={sair}
            onClose={() => setTela("home")}
            escutaCuringa={escutaCuringa}
            onAlternarEscutaCuringa={alternarEscutaCuringa}
          />
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <CadernoProvider>
      <AppShell />
    </CadernoProvider>
  );
}
