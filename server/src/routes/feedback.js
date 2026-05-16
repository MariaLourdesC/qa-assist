// server/src/routes/feedback.js
const express      = require('express');
const router       = express.Router();
const { getDb, saveDb } = require('../db/connection');
const { sanitizeFeedbackInput } = require('../utils/validate');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

function rowsToObjects(resultSet) {
  const { columns, values } = resultSet;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });
}

function hidratar(row) {
  let copied_blocks = null;
  if (row.copied_blocks_json) {
    try { copied_blocks = JSON.parse(row.copied_blocks_json); } catch {}
  }
  return { ...row, copied_blocks };
}

// Verify an analysis run belongs to req.user via run → story → project
function ownRun(db, runId, userId) {
  const r = db.exec(
    `SELECT ar.id FROM analysis_runs ar
     JOIN stories s ON s.id = ar.story_id
     JOIN projects p ON p.id = s.project_id
     WHERE ar.id = ? AND p.user_id = ?`,
    [runId, userId]
  );
  return r.length && r[0].values.length;
}

// POST /api/feedback
router.post('/', async (req, res) => {
  try {
    let input;
    try { input = sanitizeFeedbackInput(req.body); }
    catch (err) { return res.status(err.status || 400).json({ error: err.message }); }

    const { analysis_run_id, utilidad, comentario } = input;
    const rawBlocks = req.body?.copied_blocks;
    if (rawBlocks != null && (!Array.isArray(rawBlocks) || rawBlocks.length > 500)) {
      return res.status(400).json({ error: 'copied_blocks must be an array of at most 500 items' });
    }
    const copied_blocks = Array.isArray(rawBlocks) ? rawBlocks.slice(0, 50) : null;

    const db = await getDb();

    // Verify the analysis run belongs to this user before accepting feedback
    if (!ownRun(db, analysis_run_id, req.user.id)) {
      return res.status(400).json({ error: 'El analysis_run referenciado no existe' });
    }

    db.run(
      `INSERT INTO analysis_feedback (analysis_run_id, utilidad, comentario, copied_blocks_json)
       VALUES (?, ?, ?, ?)`,
      [analysis_run_id, utilidad, comentario || null,
       copied_blocks ? JSON.stringify(copied_blocks) : null]
    );
    const newId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    saveDb();

    const result = db.exec('SELECT * FROM analysis_feedback WHERE id = ?', [newId]);
    res.status(201).json(hidratar(rowsToObjects(result[0])[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/feedback?analysis_run_id=N
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { analysis_run_id } = req.query;

    if (analysis_run_id) {
      if (!ownRun(db, analysis_run_id, req.user.id)) {
        return res.status(404).json({ error: 'Analysis run no encontrado' });
      }
      const rows = db.exec(
        'SELECT * FROM analysis_feedback WHERE analysis_run_id = ? ORDER BY created_at DESC',
        [analysis_run_id]
      );
      return res.json(rows.length ? rowsToObjects(rows[0]).map(hidratar) : []);
    }

    // No filter — return feedback for all runs belonging to this user
    const rows = db.exec(
      `SELECT af.* FROM analysis_feedback af
       JOIN analysis_runs ar ON ar.id = af.analysis_run_id
       JOIN stories s ON s.id = ar.story_id
       JOIN projects p ON p.id = s.project_id
       WHERE p.user_id = ?
       ORDER BY af.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.length ? rowsToObjects(rows[0]).map(hidratar) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
