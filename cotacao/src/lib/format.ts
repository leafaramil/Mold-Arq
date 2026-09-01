export const fmt = (n: number | null | undefined): string =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const formatarData = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
