// server/scripts/001_rollback_auth.js
// EMERGENCY USE ONLY: node scripts/001_rollback_auth.js
// Recreates projects/stories without user_id (SQLite has no DROP COLUMN pre-3.35).
require('dotenv').config();
const { getDb, saveDb } = require('../src/db/connection');

async function down() {
  const db = await getDb();

  // Drop auth tables first (cascade handles refresh_tokens)
  db.run(`DROP TABLE IF EXISTS refresh_tokens`);
  db.run(`DROP TABLE IF EXISTS users`);

  // Recreate projects without user_id by CTAS + rename
  db.run(`
    CREATE TABLE projects_v0 AS
    SELECT id, nombre, descripcion, dominio, contexto_general,
           glosario_json, reglas_negocio_json, sensibilidad,
           config_analisis_json, created_at, updated_at
    FROM projects
  `);
  db.run(`DROP TABLE projects`);
  db.run(`ALTER TABLE projects_v0 RENAME TO projects`);

  // Recreate stories without user_id
  db.run(`
    CREATE TABLE stories_v0 AS
    SELECT id, project_id, titulo, modulo, descripcion, fuente,
           notas_qa, estado, created_at, updated_at
    FROM stories
  `);
  db.run(`DROP TABLE stories`);
  db.run(`ALTER TABLE stories_v0 RENAME TO stories`);

  saveDb();
  console.log('✓ Rollback 001 complete — auth tables removed, user_id columns stripped.');
}

down().catch(err => { console.error('Rollback failed:', err.message); process.exit(1); });
