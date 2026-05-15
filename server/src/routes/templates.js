'use strict';
const express      = require('express');
const router       = express.Router();
const { getDb, saveDb } = require('../db/connection');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

function rowsToObjects(rs) {
  const { columns, values } = rs;
  return values.map(row => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

function parse(raw, fallback = []) {
  try { return JSON.parse(raw || JSON.stringify(fallback)); } catch { return fallback; }
}

function hydrate(row) {
  return { ...row, glossary: parse(row.glossary_json), rules: parse(row.rules_json) };
}

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec(
      'SELECT * FROM custom_templates WHERE user_id = ? ORDER BY name ASC',
      [req.user.id]
    );
    res.json(rows.length ? rowsToObjects(rows[0]).map(hydrate) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/templates
router.post('/', async (req, res) => {
  const { name, glossary = [], rules = [] } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const db = await getDb();
    db.run(
      'INSERT INTO custom_templates (user_id, name, glossary_json, rules_json) VALUES (?, ?, ?, ?)',
      [req.user.id, name.trim().slice(0, 100), JSON.stringify(glossary), JSON.stringify(rules)]
    );
    const newId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    saveDb();
    const result = db.exec('SELECT * FROM custom_templates WHERE id = ?', [newId]);
    res.status(201).json(hydrate(rowsToObjects(result[0])[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/templates/:id
router.put('/:id', async (req, res) => {
  const { name, glossary, rules } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const db = await getDb();
    const own = db.exec('SELECT id FROM custom_templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!own.length || !own[0].values.length) return res.status(404).json({ error: 'Template not found' });
    db.run(
      'UPDATE custom_templates SET name=?, glossary_json=?, rules_json=?, updated_at=datetime(\'now\') WHERE id=? AND user_id=?',
      [name.trim().slice(0, 100), JSON.stringify(glossary ?? []), JSON.stringify(rules ?? []), req.params.id, req.user.id]
    );
    saveDb();
    const result = db.exec('SELECT * FROM custom_templates WHERE id = ?', [req.params.id]);
    res.json(hydrate(rowsToObjects(result[0])[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const own = db.exec('SELECT id FROM custom_templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!own.length || !own[0].values.length) return res.status(404).json({ error: 'Template not found' });
    db.run('DELETE FROM custom_templates WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    saveDb();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
