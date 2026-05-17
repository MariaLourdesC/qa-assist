const express      = require('express');
const authenticate = require('../middleware/authenticate');
const { getDb, saveDb } = require('../db/connection');

const router = express.Router();
router.use(authenticate);

const STATUSES = ['draft', 'active', 'locked', 'archived'];

function r(rs) {
  if (!rs.length) return [];
  const { columns, values } = rs[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

function ownProject(db, id, userId) {
  const res = db.exec('SELECT id FROM projects WHERE id = ? AND user_id = ?', [id, userId]);
  return res.length && res[0].values.length;
}

function ownRelease(db, id, userId) {
  const res = db.exec(
    `SELECT rl.id FROM releases rl JOIN projects p ON p.id = rl.project_id
     WHERE rl.id = ? AND p.user_id = ?`, [id, userId]);
  return res.length && res[0].values.length;
}

function enrichRelease(db, release) {
  const stories = r(db.exec(
    'SELECT rs.story_id, rs.added_at, s.titulo, s.estado, s.modulo FROM release_stories rs JOIN stories s ON s.id = rs.story_id WHERE rs.release_id = ?',
    [release.id]
  ));
  return { ...release, stories };
}

// GET /api/releases?project_id=X
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const db = await getDb();
    if (!ownProject(db, project_id, req.user.id)) return res.status(404).json({ error: 'Project not found' });
    const releases = r(db.exec(
      'SELECT * FROM releases WHERE project_id = ? ORDER BY created_at DESC',
      [project_id]
    ));
    res.json(releases.map(rel => enrichRelease(db, rel)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/releases
router.post('/', async (req, res) => {
  try {
    const { project_id, name, version, description, deadline } = req.body;
    if (!project_id || !name?.trim()) return res.status(400).json({ error: 'project_id and name required' });
    const db = await getDb();
    if (!ownProject(db, project_id, req.user.id)) return res.status(404).json({ error: 'Project not found' });
    db.run(
      `INSERT INTO releases (project_id, user_id, name, version, description, deadline)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [project_id, req.user.id, name.trim().slice(0, 200), version?.slice(0, 50) || null,
       description?.slice(0, 1000) || null, deadline || null]
    );
    const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    saveDb();
    const created = r(db.exec('SELECT * FROM releases WHERE id = ?', [id]));
    res.status(201).json(enrichRelease(db, created[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/releases/:id
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRelease(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Release not found' });
    const current = r(db.exec('SELECT status FROM releases WHERE id = ?', [req.params.id]))[0];
    if (current.status === 'locked') return res.status(409).json({ error: 'Release is locked — cannot edit' });
    const { name, version, description, deadline, status } = req.body;
    const newStatus = STATUSES.includes(status) ? status : current.status;
    db.run(
      `UPDATE releases SET name=?, version=?, description=?, deadline=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [name?.trim().slice(0, 200) || '', version?.slice(0, 50) || null,
       description?.slice(0, 1000) || null, deadline || null, newStatus, req.params.id]
    );
    saveDb();
    const updated = r(db.exec('SELECT * FROM releases WHERE id = ?', [req.params.id]));
    res.json(enrichRelease(db, updated[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/releases/:id/lock
router.patch('/:id/lock', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRelease(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Release not found' });

    // Snapshot each story at lock time
    const stories = r(db.exec(
      'SELECT story_id FROM release_stories WHERE release_id = ?', [req.params.id]
    ));
    for (const { story_id } of stories) {
      const snap = r(db.exec('SELECT * FROM stories WHERE id = ?', [story_id]));
      if (snap.length) {
        db.run(
          'UPDATE release_stories SET story_snapshot_json = ? WHERE release_id = ? AND story_id = ?',
          [JSON.stringify(snap[0]), req.params.id, story_id]
        );
      }
    }
    db.run(
      `UPDATE releases SET status = 'locked', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]
    );
    saveDb();
    const updated = r(db.exec('SELECT * FROM releases WHERE id = ?', [req.params.id]));
    res.json(enrichRelease(db, updated[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/releases/:id/stories — add story
router.post('/:id/stories', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRelease(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Release not found' });
    const current = r(db.exec('SELECT status FROM releases WHERE id = ?', [req.params.id]))[0];
    if (current.status === 'locked') return res.status(409).json({ error: 'Release is locked' });
    const { story_id } = req.body;
    if (!story_id) return res.status(400).json({ error: 'story_id required' });
    try {
      db.run('INSERT INTO release_stories (release_id, story_id) VALUES (?, ?)', [req.params.id, story_id]);
      saveDb();
    } catch { return res.status(409).json({ error: 'Story already in this release' }); }
    const updated = r(db.exec('SELECT * FROM releases WHERE id = ?', [req.params.id]));
    res.json(enrichRelease(db, updated[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/releases/:id/stories/:storyId
router.delete('/:id/stories/:storyId', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRelease(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Release not found' });
    const current = r(db.exec('SELECT status FROM releases WHERE id = ?', [req.params.id]))[0];
    if (current.status === 'locked') return res.status(409).json({ error: 'Release is locked' });
    db.run('DELETE FROM release_stories WHERE release_id = ? AND story_id = ?', [req.params.id, req.params.storyId]);
    saveDb();
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/releases/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRelease(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Release not found' });
    db.run('DELETE FROM releases WHERE id = ?', [req.params.id]);
    saveDb();
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
