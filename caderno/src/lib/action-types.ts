// Todas as mutações possíveis do app. O mesmo formato é usado pelo reducer
// otimista do cliente (src/lib/optimistic.ts) e pela camada de banco
// (src/lib/db-actions.ts) — cada mutação do usuário vira exatamente uma
// dessas ações, despachada uma única vez para os dois lados.
import type { Config } from "./types";

export type NovoItemDespesa = {
  nome: string;
  icone: string;
  valor: number;
  dia: number | null;
  // Parcelamento avulso (financiamento, boleto em N vezes...) — não é fatura
  // de cartão. Quando presente, a despesa só aparece nos meses em que a
  // parcela está ativa (mesma regra de uma parcela de cartão, seção 4.8).
  parcelamento?: { valor: number; atual: number; total: number; base: string };
};

export type NovoItemReceita = {
  nome: string;
  icone: string;
  valor: number;
  dia: number | null;
  quando: string;
  q: "Q1" | "Q2";
};

export type Action =
  | { type: "separar"; mes: string; itemId: string; valor: number }
  | { type: "desSeparar"; mes: string; itemId: string }
  | { type: "pagar"; mes: string; itemId: string; valor: number }
  | { type: "desPagar"; mes: string; itemId: string }
  | { type: "receber"; mes: string; receitaId: string; valor: number; reservaPct: number | null }
  | { type: "desfazerRecebimento"; mes: string; receitaId: string }
  | { type: "devolver"; mes: string; receitaId: string; valor: number }
  | { type: "desfazerDevolucao"; mes: string; receitaId: string }
  | { type: "addGasto"; mes: string; itemId: string; valor: number; data: string; gastoId: string }
  | { type: "delGasto"; mes: string; itemId: string; gastoId: string }
  | { type: "fecharCaixinha"; mes: string; itemId: string }
  | { type: "editarEstado"; mes: string; itemId: string; campo: "pago" | "separado" | "recebido" | "devolvido"; valor: number }
  | { type: "recarregarCaixinha"; chave: string; mes: string; movId: string; disponivel: number; custo: number; tarifa: number }
  | { type: "gastarCaixinha"; chave: string; mes: string; movId: string; valor: number }
  | { type: "delMovCaixinha"; chave: string; movId: string }
  | { type: "dispensarAviso"; chave: string }
  | { type: "editarValor"; tipo: "despesa" | "receita"; itemId: string; mes: string; valor: number; soNesseMes: boolean }
  | { type: "removerItem"; tipo: "despesa" | "receita"; itemId: string; mes: string; soNesseMes: boolean }
  | { type: "addDespesa"; itemId: string; mes: string; apenasEsseMes: boolean; dados: NovoItemDespesa }
  | {
      type: "definirParcelamento";
      despesaId: string;
      parcelamento: { valor: number; atual: number; total: number; base: string } | null;
    }
  | { type: "addReceita"; itemId: string; mes: string; apenasEsseMes: boolean; dados: NovoItemReceita }
  | { type: "toggleReceita"; receitaId: string; campo: "ativa" | "reserva" }
  | { type: "updateConfig"; campo: keyof Config; valor: string | number | boolean }
  | { type: "updateCartao"; cartaoId: string; campo: "fechamento" | "vencimento"; valor: number | null }
  | {
      type: "addParcela";
      parcelaId: string;
      desc: string;
      parcela: number;
      atual: number;
      total: number;
      cartaoId: string;
      base: string;
    }
  | { type: "delParcela"; parcelaId: string }
  | { type: "retirarPote"; pote: "emergencia" | "folga"; histId: string; desc: string; valor: number }
  | { type: "definirSaldoInicialZul"; chave: string; movId: string; saldo: number; mes: string }
  | { type: "registrarConsumoIA"; mes: string; custo: number };
