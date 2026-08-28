import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// A Vercel provisiona o Postgres (via integração Neon) e injeta a connection
// string numa dessas variáveis, dependendo de quando o banco foi criado.
// Instanciado sob demanda (não no import) para não quebrar o build antes de
// o banco estar conectado ao projeto.
let cached: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "Nenhuma connection string de banco encontrada (DATABASE_URL / POSTGRES_URL). " +
        "Conecte um banco Postgres ao projeto na Vercel, ou preencha caderno/.env.local.",
    );
  }
  cached = neon(connectionString);
  return cached;
}
