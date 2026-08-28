export const fmt = (n: number | null | undefined): string =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const hojeISO = (d: Date): string => d.toISOString().slice(0, 10);

export const uid = (): string => Math.random().toString(36).slice(2, 10);
