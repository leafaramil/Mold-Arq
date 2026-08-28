// Roda o schema.sql contra o Postgres apontado por POSTGRES_URL.
// Uso local: preencha caderno/.env.local com a POSTGRES_URL da Vercel e rode `npm run db:migrate`.
// Em produção isso pode ser rodado uma vez via `vercel env pull` + este script.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("DATABASE_URL / POSTGRES_URL não definida. Configure caderno/.env.local ou exporte a variável.");
    process.exit(1);
  }
  const sql = neon(connectionString);
  const schema = readFileSync(path.join(__dirname, "..", "sql", "schema.sql"), "utf-8");
  // O driver HTTP da Neon executa uma instrução por chamada — separa o
  // schema em statements individuais (nenhum deles usa ';' dentro de string).
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const statement of statements) {
    await sql(statement);
  }
  console.log(`Schema aplicado com sucesso (${statements.length} statements).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
