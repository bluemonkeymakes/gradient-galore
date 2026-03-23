import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}
const sql = postgres(connectionString);

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

  await sql`CREATE INDEX IF NOT EXISTS idx_gradients_created_at ON gradients (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_palettes_created_at ON palettes (created_at DESC)`;

  console.log("Migration complete.");
  await sql.end();
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
