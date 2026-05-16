const express      = require('express');
const authenticate = require('../middleware/authenticate');
const { getDb }    = require('../db/connection');

const router = express.Router();
router.use(authenticate);

// GET /api/search?q=texto — busca en proyectos y historias del usuario
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ projects: [], stories: [] });

    const db = await getDb();
    const like = `%${q}%`;

    // Proyectos
    const projRows = db.exec(
      `SELECT id, nombre, dominio, descripcion
       FROM projects
       WHERE user_id = ? AND (nombre LIKE ? OR dominio LIKE ? OR descripcion LIKE ?)
       ORDER BY updated_at DESC LIMIT 10`,
      [req.user.id, like, like, like]
    );

    // Historias (con nombre del proyecto)
    const storyRows = db.exec(
      `SELECT s.id, s.titulo, s.modulo, s.estado, s.updated_at,
              p.id AS project_id, p.nombre AS project_nombre
       FROM stories s
       JOIN projects p ON p.id = s.project_id
       WHERE p.user_id = ? AND (s.titulo LIKE ? OR s.modulo LIKE ? OR s.descripcion LIKE ?)
       ORDER BY s.updated_at DESC LIMIT 20`,
      [req.user.id, like, like, like]
    );

    function rows(rs) {
      if (!rs.length) return [];
      const { columns, values } = rs[0];
      return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
    }

    res.json({ projects: rows(projRows), stories: rows(storyRows) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
