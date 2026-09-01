"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Action } from "./action-types";
import { applyAction } from "./optimistic";
import { desbloquearComBiometria, registrarBiometria, suportaBiometria } from "./biometria";
import type { DataModel } from "./types";

const CACHE_KEY = "cotacao-modelo";
const FILA_KEY = "cotacao-fila";
const NOME_KEY = "cotacao-nome";
const BIOMETRIA_KEY = "cotacao-biometria";

interface BiometriaSalva {
  nome: string;
  credentialId: string;
}

function lerCache(): DataModel | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DataModel) : null;
  } catch {
    return null;
  }
}

function gravarCache(model: DataModel) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(model));
  } catch {
    // storage cheio ou indisponível — segue sem cache, não é fatal
  }
}

function lerFila(): Action[] {
  try {
    const raw = localStorage.getItem(FILA_KEY);
    return raw ? (JSON.parse(raw) as Action[]) : [];
  } catch {
    return [];
  }
}

function gravarFila(fila: Action[]) {
  try {
    localStorage.setItem(FILA_KEY, JSON.stringify(fila));
  } catch {
    // ignora
  }
}

function lerBiometria(): BiometriaSalva | null {
  try {
    const raw = localStorage.getItem(BIOMETRIA_KEY);
    return raw ? (JSON.parse(raw) as BiometriaSalva) : null;
  } catch {
    return null;
  }
}

interface CotacaoContextValue {
  model: DataModel | null;
  carregando: boolean;
  offline: boolean;
  sincronizando: boolean;
  nome: string | null;
  entrar: (n: string) => void;
  sair: () => void;
  dispatch: (action: Action) => void;
  toast: string | null;
  mostrarToast: (msg: string) => void;
  // trava biométrica local — não é autenticação de servidor
  travado: boolean;
  tentarDesbloquear: () => Promise<boolean>;
  ofertaBiometria: boolean;
  ativarBiometria: () => Promise<boolean>;
  dispensarOfertaBiometria: () => void;
}

const CotacaoContext = createContext<CotacaoContextValue | null>(null);

export function CotacaoProvider({ children }: { children: React.ReactNode }) {
  const [model, setModel] = useState<DataModel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [offline, setOffline] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [nome, setNome] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [travado, setTravado] = useState(false);
  const [ofertaBiometria, setOfertaBiometria] = useState(false);
  const filaRef = useRef<Action[]>([]);
  const flushando = useRef(false);

  const mostrarToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }, []);

  const buscarEstado = useCallback(async (): Promise<boolean> => {
    try {
      const resp = await fetch("/api/state", { cache: "no-store" });
      if (!resp.ok) throw new Error("falha ao buscar estado");
      const dados = (await resp.json()) as DataModel;
      setModel(dados);
      gravarCache(dados);
      setOffline(false);
      return true;
    } catch {
      setOffline(true);
      return false;
    }
  }, []);

  const flushFila = useCallback(async () => {
    if (flushando.current) return;
    flushando.current = true;
    setSincronizando(true);
    try {
      while (filaRef.current.length > 0) {
        const proxima = filaRef.current[0];
        try {
          const resp = await fetch("/api/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proxima),
          });
          if (!resp.ok) throw new Error("ação rejeitada");
          filaRef.current = filaRef.current.slice(1);
          gravarFila(filaRef.current);
          setOffline(false);
        } catch {
          setOffline(true);
          break;
        }
      }
      if (filaRef.current.length === 0) {
        await buscarEstado();
      }
    } finally {
      flushando.current = false;
      setSincronizando(false);
    }
  }, [buscarEstado]);

  useEffect(() => {
    let nomeSalvo: string | null = null;
    try {
      nomeSalvo = localStorage.getItem(NOME_KEY);
      setNome(nomeSalvo);
    } catch {
      // ignora
    }
    const biometria = lerBiometria();
    if (nomeSalvo && biometria && biometria.nome === nomeSalvo) {
      setTravado(true);
    } else if (nomeSalvo && !biometria) {
      void suportaBiometria().then((suporta) => {
        if (suporta) setOfertaBiometria(true);
      });
    }

    filaRef.current = lerFila();
    const cache = lerCache();
    if (cache) setModel(cache);
    (async () => {
      const ok = await buscarEstado();
      if (!ok && cache) {
        // sem rede, segue com o cache local
      }
      setCarregando(false);
      if (filaRef.current.length > 0) void flushFila();
    })();

    const aoVoltarOnline = () => void flushFila();
    const aoFocar = () => {
      if (document.visibilityState === "visible") void flushFila();
    };
    window.addEventListener("online", aoVoltarOnline);
    document.addEventListener("visibilitychange", aoFocar);
    return () => {
      window.removeEventListener("online", aoVoltarOnline);
      document.removeEventListener("visibilitychange", aoFocar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatch = useCallback(
    (action: Action) => {
      setModel((atual) => {
        if (!atual) return atual;
        const novo = applyAction(atual, action);
        gravarCache(novo);
        return novo;
      });
      filaRef.current = [...filaRef.current, action];
      gravarFila(filaRef.current);
      void flushFila();
    },
    [flushFila],
  );

  const entrar = useCallback((n: string) => {
    setNome(n);
    try {
      localStorage.setItem(NOME_KEY, n);
    } catch {
      // ignora
    }
    void suportaBiometria().then((suporta) => {
      if (suporta && !lerBiometria()) setOfertaBiometria(true);
    });
  }, []);

  const sair = useCallback(() => {
    setNome(null);
    setTravado(false);
    setOfertaBiometria(false);
    try {
      localStorage.removeItem(NOME_KEY);
      localStorage.removeItem(BIOMETRIA_KEY);
    } catch {
      // ignora
    }
  }, []);

  const tentarDesbloquear = useCallback(async (): Promise<boolean> => {
    const biometria = lerBiometria();
    if (!biometria) {
      setTravado(false);
      return true;
    }
    const ok = await desbloquearComBiometria(biometria.credentialId);
    if (ok) setTravado(false);
    return ok;
  }, []);

  const ativarBiometria = useCallback(async (): Promise<boolean> => {
    if (!nome) return false;
    const credentialId = await registrarBiometria(nome);
    if (!credentialId) return false;
    try {
      localStorage.setItem(BIOMETRIA_KEY, JSON.stringify({ nome, credentialId }));
    } catch {
      return false;
    }
    setOfertaBiometria(false);
    return true;
  }, [nome]);

  const dispensarOfertaBiometria = useCallback(() => setOfertaBiometria(false), []);

  const value = useMemo(
    () => ({
      model,
      carregando,
      offline,
      sincronizando,
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
    }),
    [model, carregando, offline, sincronizando, nome, entrar, sair, dispatch, toast, mostrarToast, travado, tentarDesbloquear, ofertaBiometria, ativarBiometria, dispensarOfertaBiometria],
  );

  return <CotacaoContext.Provider value={value}>{children}</CotacaoContext.Provider>;
}

export function useCotacao(): CotacaoContextValue {
  const ctx = useContext(CotacaoContext);
  if (!ctx) throw new Error("useCotacao precisa estar dentro de <CotacaoProvider>");
  return ctx;
}
