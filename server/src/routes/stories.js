// server/src/routes/stories.js
const express      = require('express');
const router       = express.Router();
const { getDb, saveDb } = require('../db/connection');
const { sanitizeStoryInput } = require('../utils/validate');
const authenticate = require('../middleware/authenticate');

// All routes require authentication
router.use(authenticate);

function rowsToObjects(resultSet) {
  const { columns, values } = resultSet;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// ── Ownership helpers ─────────────────────────────────────────────────────

// Verify a project belongs to req.user
function ownProject(db, projectId, userId) {
  const r = db.exec('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  return r.length && r[0].values.length;
}

// Verify a story belongs to req.user (via project)
function ownStory(db, storyId, userId) {
  const r = db.exec(
    `SELECT s.id FROM stories s
     JOIN projects p ON p.id = s.project_id
     WHERE s.id = ? AND p.user_id = ?`,
    [storyId, userId]
  );
  return r.length && r[0].values.length;
}

// ── Jaccard duplicate detection ───────────────────────────────────────────

const STOPWORDS = new Set([
  'el','la','los','las','un','una','de','del','que','y','en','con','por','para','como','si','no',
  'mi','tu','su','sus','se','lo','le','les','ya','mas','pero','o','al','es','son','ser','estar',
  'esta','este','quiero','necesito','puedo','debe','muy','cuando','donde','sobre','desde','hasta',
  'the','a','an','of','to','in','for','on','with','as','is','are','be','will','can','should',
  'this','that','i','you','want','need','must','have','do','does','from','at','by','if','when','where'
]);

function tokenize(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !STOPWORDS.has(w))
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// POST /api/stories/check-duplicates
// Must be defined BEFORE /:id to avoid route collision
router.post('/check-duplicates', async (req, res) => {
  try {
    const { project_id, titulo, descripcion, exclude_id } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id es obligatorio' });
    if (!titulo && !descripcion) return res.json({ matches: [] });

    const db = await getDb();

    // Verify project belongs to user before scanning its stories
    if (!ownProject(db, project_id, req.user.id)) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const rows = db.exec(
      'SELECT id, titulo, descripcion, modulo, estado FROM stories WHERE project_id = ?',
      [project_id]
    );
    const stories = rows.length ? rowsToObjects(rows[0]) : [];
    const tokensA = tokenize(`${titulo || ''} ${descripcion || ''}`);
    if (tokensA.size === 0) return res.json({ matches: [] });

    const matches = stories
      .filter(s => !exclude_id || s.id !== Number(exclude_id))
      .map(s => {
        const score = jaccard(tokensA, tokenize(`${s.titulo || ''} ${s.descripcion || ''}`));
        return { id: s.id, titulo: s.titulo, modulo: s.modulo, estado: s.estado, score: Number(score.toFixed(3)) };
      })
      .filter(m => m.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({ matches });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stories?project_id=N
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { project_id } = req.query;

    if (project_id) {
      // Verify project ownership before listing its stories
      if (!ownProject(db, project_id, req.user.id)) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }
      const rows = db.exec(
        'SELECT * FROM stories WHERE project_id = ? ORDER BY updated_at DESC',
        [project_id]
      );
      return res.json(rows.length ? rowsToObjects(rows[0]) : []);
    }

    // No project_id — return all stories for this user across all their projects
    const rows = db.exec(
      `SELECT s.* FROM stories s
       JOIN projects p ON p.id = s.project_id
       WHERE p.user_id = ?
       ORDER BY s.updated_at DESC`,
      [req.user.id]
    );
    res.json(rows.length ? rowsToObjects(rows[0]) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stories/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownStory(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    const rows = db.exec('SELECT * FROM stories WHERE id = ?', [req.params.id]);
    res.json(rowsToObjects(rows[0])[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stories
router.post('/', async (req, res) => {
  try {
    const project_id = parseInt(req.body?.project_id, 10);
    if (!project_id) return res.status(400).json({ error: 'project_id es obligatorio' });

    let input;
    try { input = sanitizeStoryInput(req.body, { requireBody: true }); }
    catch (err) { return res.status(err.status || 400).json({ error: err.message }); }

    const { titulo, modulo, descripcion, fuente, notas_qa, estado } = input;
    const db = await getDb();

    // Project must exist AND belong to user
    if (!ownProject(db, project_id, req.user.id)) {
      return res.status(400).json({ error: 'El proyecto referenciado no existe' });
    }

    db.run(
      `INSERT INTO stories (project_id, titulo, modulo, descripcion, fuente, notas_qa, estado, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [project_id, titulo, modulo || null, descripcion, fuente || null, notas_qa || null,
       estado || 'draft', req.user.id]
    );
    const newId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    saveDb();
    res.status(201).json(rowsToObjects(db.exec('SELECT * FROM stories WHERE id = ?', [newId])[0])[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stories/:id
router.put('/:id', async (req, res) => {
  try {
    let input;
    try { input = sanitizeStoryInput(req.body, { requireBody: true }); }
    catch (err) { return res.status(err.status || 400).json({ error: err.message }); }

    const { titulo, modulo, descripcion, fuente, notas_qa, estado } = input;
    const db = await getDb();

    if (!ownStory(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    db.run(
      `UPDATE stories
       SET titulo=?, modulo=?, descripcion=?, fuente=?, notas_qa=?, estado=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [titulo, modulo || null, descripcion, fuente || null, notas_qa || null,
       estado || 'draft', req.params.id]
    );
    saveDb();
    res.json(rowsToObjects(db.exec('SELECT * FROM stories WHERE id = ?', [req.params.id])[0])[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stories/:id/clone
router.post('/:id/clone', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownStory(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    const rows = db.exec('SELECT * FROM stories WHERE id = ?', [req.params.id]);
    if (!rows.length || !rows[0].values.length) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    const { columns, values } = rows[0];
    const orig = Object.fromEntries(columns.map((c, i) => [c, values[0][i]]));

    const prefix = req.body?.prefix || 'Copia de';
    const newTitulo = `${prefix} ${orig.titulo}`.slice(0, 200);

    db.run(
      `INSERT INTO stories (project_id, titulo, modulo, descripcion, fuente, notas_qa, estado, user_id)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [orig.project_id, newTitulo, orig.modulo, orig.descripcion,
       orig.fuente, orig.notas_qa, req.user.id]
    );
    const newId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    saveDb();

    const newRows = db.exec('SELECT * FROM stories WHERE id = ?', [newId]);
    const story = Object.fromEntries(newRows[0].columns.map((c, i) => [c, newRows[0].values[0][i]]));
    res.status(201).json(story);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/stories/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownStory(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    db.run('DELETE FROM stories WHERE id = ?', [req.params.id]);
    saveDb();
    res.json({ message: 'Historia eliminada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stories/bulk-delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids[] is required' });
    }
    if (ids.length > 100) return res.status(400).json({ error: 'Max 100 ids per request' });

    const db = await getDb();
    let deleted = 0;
    for (const id of ids) {
      if (!ownStory(db, id, req.user.id)) continue; // silently skip unowned
      db.run('DELETE FROM stories WHERE id = ?', [id]);
      deleted++;
    }
    if (deleted > 0) saveDb();
    res.json({ deleted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stories/bulk-approve
router.post('/bulk-approve', async (req, res) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids[] is required' });
    }
    if (ids.length > 100) return res.status(400).json({ error: 'Max 100 ids per request' });

    const db = await getDb();
    let approved = 0;
    for (const id of ids) {
      if (!ownStory(db, id, req.user.id)) continue;
      db.run(`UPDATE stories SET estado = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
      approved++;
    }
    if (approved > 0) saveDb();
    res.json({ approved });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
