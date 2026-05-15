const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');
const { parseStory } = require('../services/story-parser.service');
const { classifyStory } = require('../services/functional-classifier.service');
const { generateRules } = require('../services/qa-rules-engine.service');

// POST /api/rules-test
// Body: { texto: string, project_id?: number }
// Ejecuta parser -> classifier -> rules y devuelve la salida cruda (sin dedupe ni scores)
router.post('/', async (req, res) => {
  try {
    const { texto, project_id } = req.body;
    if (!texto) return res.status(400).json({ error: 'El texto es obligatorio' });

    let proyecto = {};
    if (project_id) {
      const db = await getDb();
      const rows = db.exec('SELECT glosario_json, reglas_negocio_json FROM projects WHERE id = ?', [project_id]);
      if (rows.length && rows[0].values.length) {
        const [glosario_json, reglas_negocio_json] = rows[0].values[0];
        try {
          proyecto = {
            glosario: JSON.parse(glosario_json || '[]'),
            reglas_negocio: JSON.parse(reglas_negocio_json || '[]')
          };
        } catch {
          proyecto = { glosario: [], reglas_negocio: [] };
        }
      }
    }

    const parser = parseStory(texto, proyecto.glosario || []);
    const classification = classifyStory(texto);
    const reglas = generateRules({ parser, classification, proyecto });

    res.json({
      estructura_detectada: parser,
      clasificacion_funcional: classification,
      resultado: reglas
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
