// server/src/routes/analyses.js
const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const { createLogger } = require('../utils/logger');
const log = createLogger('analyses');
const { getDb, saveDb } = require('../db/connection');
const { analyze } = require('../services/analysis-orchestrator.service');
const authenticate = require('../middleware/authenticate');

// All routes require authentication
router.use(authenticate);

const analysesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analysis requests. Try again in a minute.' }
});

function rowsToObjects(resultSet) {
  const { columns, values } = resultSet;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });
}

function safeJson(raw, fallback) {
  try { return JSON.parse(raw || JSON.stringify(fallback)); } catch { return fallback; }
}

function hidratar(row) {
  const parserOutput = safeJson(row.parser_output_json, {});
  return {
    id: row.id,
    story_id: row.story_id,
    version: row.version,
    analysis_mode: row.analysis_mode,
    created_at: row.created_at,
    meta: {
      analysis_mode: row.analysis_mode,
      prompt_version: row.prompt_version,
      uso_ia: !!row.llm_output_json,
      bloques_generados_por_ia: [],
      score_ambiguedad: row.score_ambiguedad,
      score_cobertura: row.score_cobertura,
      score_complejidad: row.score_complejidad,
      lang: parserOutput.lang || null
    },
    quality_checks: safeJson(row.quality_checks_json, {}),
    resultado: safeJson(row.final_output_json, {}),
    input_snapshot: safeJson(row.input_snapshot_json, {}),
    traceability: safeJson(row.traceability_json, {}),
    tc_tags: safeJson(row.tc_tags_json, {})
  };
}

// Verify the analysis run belongs to req.user via analysis → story → project
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

// Verify a story belongs to req.user
function ownStory(db, storyId, userId) {
  const r = db.exec(
    `SELECT s.id FROM stories s
     JOIN projects p ON p.id = s.project_id
     WHERE s.id = ? AND p.user_id = ?`,
    [storyId, userId]
  );
  return r.length && r[0].values.length;
}

// POST /api/analyses
router.post('/', analysesLimiter, async (req, res) => {
  try {
    const { story_id, analysis_mode } = req.body;
    if (!story_id) return res.status(400).json({ error: 'story_id es obligatorio' });

    const db = await getDb();

    // 1. Load story — verify it belongs to this user
    if (!ownStory(db, story_id, req.user.id)) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    const storyRows = db.exec('SELECT * FROM stories WHERE id = ?', [story_id]);
    const story = rowsToObjects(storyRows[0])[0];

    // 2. Load project
    const projRows = db.exec('SELECT * FROM projects WHERE id = ?', [story.project_id]);
    if (!projRows.length || !projRows[0].values.length) {
      return res.status(404).json({ error: 'Proyecto referenciado no encontrado' });
    }
    const projRaw = rowsToObjects(projRows[0])[0];
    const project = {
      ...projRaw,
      glosario: safeJson(projRaw.glosario_json, []),
      reglas_negocio: safeJson(projRaw.reglas_negocio_json, [])
    };

    // 3. Check hybrid restriction
    const mode = analysis_mode || 'local_only';
    if (mode === 'hybrid' && project.sensibilidad === 'restringido') {
      return res.status(400).json({
        error: 'El proyecto es restringido. IA bloqueada. Usa analysis_mode=local_only.'
      });
    }

    // 4. Run pipeline (pass userId + db for per-user cache isolation)
    const output = await analyze({ story, project, analysisMode: mode, userId: req.user.id, db });

    // 5. Version number
    const verRows = db.exec(
      'SELECT COALESCE(MAX(version), 0) AS maxv FROM analysis_runs WHERE story_id = ?',
      [story_id]
    );
    const nextVersion = (verRows[0]?.values[0][0] || 0) + 1;

    // 6. Persist
    db.run(
      `INSERT INTO analysis_runs
        (story_id, version, analysis_mode, prompt_version,
         input_snapshot_json, parser_output_json, classification_json,
         local_output_json, llm_output_json, final_output_json,
         quality_checks_json, score_ambiguedad, score_cobertura, score_complejidad, cache_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [story_id, nextVersion, mode, null,
       JSON.stringify({
         titulo:        story.titulo,
         descripcion:   story.descripcion,
         modulo:        story.modulo,
         fuente:        story.fuente        || null,
         notas_qa:      story.notas_qa      || null,
         project_nombre: project.nombre     || null,
         project_dominio: project.dominio   || null,
         glosario:      project.glosario    || [],
         reglas_negocio: project.reglas_negocio || []
       }),
       JSON.stringify(output._internal.parser_output),
       JSON.stringify(output._internal.classification),
       JSON.stringify(output._internal.local_output),
       output._internal.llm_meta ? JSON.stringify(output._internal.llm_meta) : null,
       JSON.stringify(output.resultado),
       JSON.stringify(output.quality_checks),
       output.meta.score_ambiguedad, output.meta.score_cobertura, output.meta.score_complejidad,
       output._cacheKey || null]
    );
    const newId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];

    // 7. Update story state
    db.run(`UPDATE stories SET estado='analyzed', updated_at=CURRENT_TIMESTAMP WHERE id=?`, [story_id]);
    saveDb();

    res.status(201).json({ analysis_run_id: newId, version: nextVersion, ...output });
  } catch (err) {
    log.error({ err: err.message, stack: err.stack }, 'pipeline error');
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analyses?story_id=N
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { story_id } = req.query;
    if (!story_id) return res.status(400).json({ error: 'story_id es obligatorio' });

    if (!ownStory(db, story_id, req.user.id)) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    const rows = db.exec(
      'SELECT * FROM analysis_runs WHERE story_id = ? ORDER BY version DESC',
      [story_id]
    );
    res.json(rows.length ? rowsToObjects(rows[0]).map(hidratar) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analyses/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRun(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Analysis run no encontrado' });
    }
    const rows = db.exec('SELECT * FROM analysis_runs WHERE id = ?', [req.params.id]);
    res.json(hidratar(rowsToObjects(rows[0])[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/analyses/:id/tc-tags
router.patch('/:id/tc-tags', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRun(db, req.params.id, req.user.id)) return res.status(404).json({ error: 'Not found' });
    db.run('UPDATE analysis_runs SET tc_tags_json = ? WHERE id = ?',
      [JSON.stringify(req.body.tc_tags || {}), req.params.id]);
    saveDb();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/analyses/:id/traceability
router.patch('/:id/traceability', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRun(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Analysis run no encontrado' });
    }
    const traceability = req.body.traceability;
    if (!traceability || typeof traceability !== 'object') {
      return res.status(400).json({ error: 'traceability object required' });
    }
    db.run('UPDATE analysis_runs SET traceability_json = ? WHERE id = ?',
      [JSON.stringify(traceability), req.params.id]);
    saveDb();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/analyses/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownRun(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Analysis run no encontrado' });
    }
    db.run('DELETE FROM analysis_runs WHERE id = ?', [req.params.id]);
    saveDb();
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/analyses/:id/suggest-rewrite
router.post('/:id/suggest-rewrite', analysesLimiter, async (req, res) => {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set.' });
    }

    const db = await getDb();
    if (!ownRun(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Analysis run no encontrado' });
    }

    const runRows = db.exec('SELECT * FROM analysis_runs WHERE id = ?', [req.params.id]);
    const run = hidratar(rowsToObjects(runRows[0])[0]);
    const storyRows = db.exec('SELECT * FROM stories WHERE id = ?', [run.story_id]);
    const story = rowsToObjects(storyRows[0])[0];
    const projRows = db.exec('SELECT * FROM projects WHERE id = ?', [story.project_id]);
    const project = projRows.length ? rowsToObjects(projRows[0])[0] : {};

    const lang = run.final_output ? (safeJson(run.parser_output_json, {}).lang || 'es') : 'es';
    const isEs = lang !== 'en';
    const resultado = run.resultado || {};
    const ambs = (resultado.ambiguedades || []).map(a => `- ${a.descripcion}`).join('\n') || (isEs ? '- (ninguna detectada)' : '- (none detected)');
    const preguntas = (resultado.preguntas_refinamiento || []).map(p => `- ${p.pregunta}`).join('\n') || (isEs ? '- (ninguna)' : '- (none)');

    const prompt = isEs ? `
Eres un experto en escritura de historias de usuario (user stories) para equipos ágiles.

CONTEXTO DEL PROYECTO:
Nombre: ${project.nombre || '—'}
Dominio: ${project.dominio || '—'}
${project.contexto_general ? `Contexto: ${project.contexto_general}` : ''}

HISTORIA ORIGINAL:
${story.descripcion}

PROBLEMAS DETECTADOS EN EL ANÁLISIS:
Ambigüedades:
${ambs}

Preguntas sin responder:
${preguntas}

INSTRUCCIONES:
1. Reescribe la historia CORRIGIENDO solo los problemas listados.
2. Mantén el mismo formato (user story "Como X…" o BDD Gherkin si el original lo usa).
3. Sé conciso: no más de un 60% más larga que la original.
4. NO inventes funcionalidades que no estén en el texto original.
5. Incluye al menos: actor claro, acción concreta, objetivo medible, un flujo de error, una validación.
6. Responde en ESPAÑOL.

Responde EXCLUSIVAMENTE con JSON válido sin markdown:
{"historia_mejorada": "texto completo de la historia reescrita", "cambios": ["punto 1", "punto 2"]}
` : `
You are an expert in writing user stories for agile teams.

PROJECT CONTEXT:
Name: ${project.nombre || '—'}
Domain: ${project.dominio || '—'}
${project.contexto_general ? `Context: ${project.contexto_general}` : ''}

ORIGINAL STORY:
${story.descripcion}

ISSUES DETECTED IN THE ANALYSIS:
Ambiguities:
${ambs}

Unanswered questions:
${preguntas}

INSTRUCTIONS:
1. Rewrite the story FIXING only the listed issues.
2. Keep the same format (user story "As a X…" or BDD Gherkin if original uses it).
3. Be concise: no more than 60% longer than the original.
4. DO NOT invent features not in the original text.
5. Include at least: clear actor, concrete action, measurable objective, one error flow, one validation.
6. Respond in ENGLISH.

Respond ONLY with valid JSON without markdown:
{"historia_mejorada": "full rewritten story text", "cambios": ["point 1", "point 2"]}
`;

    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    const response = await client.messages.create({
      model, max_tokens: 1024,
      messages: [{ role: 'user', content: prompt.trim() }]
    });

    const raw = response.content?.[0]?.text || '';
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch {}
    if (!parsed) {
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) { try { parsed = JSON.parse(fence[1]); } catch {} }
      if (!parsed) {
        const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
        if (f >= 0 && l > f) { try { parsed = JSON.parse(raw.slice(f, l + 1)); } catch {} }
      }
    }
    if (!parsed?.historia_mejorada) {
      return res.status(500).json({ error: 'Could not parse AI response.', raw: raw.slice(0, 300) });
    }
    res.json({
      historia_original: story.descripcion,
      historia_mejorada: parsed.historia_mejorada,
      cambios: Array.isArray(parsed.cambios) ? parsed.cambios : [],
      lang, model, usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
