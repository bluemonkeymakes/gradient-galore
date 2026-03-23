import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL || "postgres://localhost:5432/gradient_galore");

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS gradients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      state TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      preview_css TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS palettes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      base_color TEXT NOT NULL,
      shades TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Migration complete.");
  await sql.end();
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
