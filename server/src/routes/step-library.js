const express      = require('express');
const authenticate = require('../middleware/authenticate');
const { getDb, saveDb } = require('../db/connection');

const router = express.Router();
router.use(authenticate);

const CATEGORIES = ['setup', 'precondition', 'verification', 'teardown', 'util'];

function rows(rs) {
  if (!rs.length) return [];
  const { columns, values } = rs[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

function ownProject(db, projectId, userId) {
  const r = db.exec('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  return r.length && r[0].values.length;
}

function ownStep(db, stepId, userId) {
  const r = db.exec(
    `SELECT sl.id FROM step_library sl JOIN projects p ON p.id = sl.project_id
     WHERE sl.id = ? AND p.user_id = ?`, [stepId, userId]);
  return r.length && r[0].values.length;
}

function hydrate(step) {
  let pasos = [];
  try { pasos = JSON.parse(step.pasos_json || '[]'); } catch {}
  return { ...step, pasos };
}

// GET /api/step-library?project_id=X
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const db = await getDb();
    if (!ownProject(db, project_id, req.user.id)) return res.status(404).json({ error: 'Project not found' });
    const data = rows(db.exec(
      'SELECT * FROM step_library WHERE project_id = ? ORDER BY category, title',
      [project_id]
    ));
    res.json(data.map(hydrate));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/step-library
router.post('/', async (req, res) => {
  try {
    const { project_id, title, category, pasos } = req.body;
    if (!project_id || !title?.trim()) return res.status(400).json({ error: 'project_id and title required' });
    const db = await getDb();
    if (!ownProject(db, project_id, req.user.id)) return res.status(404).json({ error: 'Project not found' });

    const cat = CATEGORIES.includes(category) ? category : 'setup';
    const pasosJson = JSON.stringify(
      Array.isArray(pasos) ? pasos.slice(0, 50).map(p => String(p).slice(0, 500)) : []
    );
    db.run(
      `INSERT INTO step_library (project_id, user_id, title, category, pasos_json) VALUES (?, ?, ?, ?, ?)`,
      [project_id, req.user.id, title.trim().slice(0, 200), cat, pasosJson]
    );
    const newId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    saveDb();
    const created = rows(db.exec('SELECT * FROM step_library WHERE id = ?', [newId]));
    res.status(201).json(hydrate(created[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/step-library/:id
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownStep(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Step not found' });
    const { title, category, pasos } = req.body;
    const cat = CATEGORIES.includes(category) ? category : 'setup';
    const pasosJson = JSON.stringify(
      Array.isArray(pasos) ? pasos.slice(0, 50).map(p => String(p).slice(0, 500)) : []
    );
    db.run(
      `UPDATE step_library SET title = ?, category = ?, pasos_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title?.trim().slice(0, 200) || '', cat, pasosJson, req.params.id]
    );
    saveDb();
    const updated = rows(db.exec('SELECT * FROM step_library WHERE id = ?', [req.params.id]));
    res.json(hydrate(updated[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/step-library/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownStep(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Step not found' });
    db.run('DELETE FROM step_library WHERE id = ?', [req.params.id]);
    saveDb();
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
