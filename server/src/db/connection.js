const initSqlJs = require('sql.js');
const path = require('path');
const fs   = require('fs');
const { createLogger } = require('../utils/logger');
const log = createLogger('db');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'qa-assist.db');

let db;
let initPromise;

async function getDb() {
  if (db) return db;

  // Evitar inicializaciones concurrentes
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Crear carpeta data/ si no existe
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const SQL = await initSqlJs();

    // Si ya existe el archivo, cargarlo; si no, crear DB nueva
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Activar foreign keys (SQLite las tiene desactivadas por defecto)
    db.run('PRAGMA foreign_keys = ON');

    // Ejecutar schema para crear tablas si no existen
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);

    // Guardar al disco despues de crear schema
    saveDb();

    log.info({ path: DB_PATH }, 'database ready');
    return db;
  })();

  return initPromise;
}

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
    initPromise = null;
  }
}

module.exports = { getDb, saveDb, closeDb };
