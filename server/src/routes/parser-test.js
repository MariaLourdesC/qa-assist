const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');
const { parseStory } = require('../services/story-parser.service');

// POST /api/parser-test
// Body: { texto: string, project_id?: number }
// Si se pasa project_id, usa su glosario para filtrar terminos vagos.
router.post('/', async (req, res) => {
  try {
    const { texto, project_id } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'El texto es obligatorio' });
    }

    let glosario = [];
    if (project_id) {
      const db = await getDb();
      const rows = db.exec('SELECT glosario_json FROM projects WHERE id = ?', [project_id]);
      if (rows.length && rows[0].values.length) {
        try {
          glosario = JSON.parse(rows[0].values[0][0] || '[]');
        } catch {
          glosario = [];
        }
      }
    }

    const resultado = parseStory(texto, glosario);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
