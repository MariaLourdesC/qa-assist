// server/src/routes/projects.js
const express      = require('express');
const router       = express.Router();
const { getDb, saveDb } = require('../db/connection');
const { sanitizeProjectInput } = require('../utils/validate');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

function rowsToObjects(resultSet) {
  const { columns, values } = resultSet;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json(rows.length ? rowsToObjects(rows[0]) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/stats
router.get('/:id/stats', async (req, res) => {
  try {
    const db = await getDb();
    const own = db.exec(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!own.length || !own[0].values.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const storyRows = db.exec('SELECT id, estado FROM stories WHERE project_id = ?', [req.params.id]);
    const stories = storyRows.length ? rowsToObjects(storyRows[0]) : [];
    const totalStories = stories.length;
    const analyzed = stories.filter(s => s.estado === 'analyzed').length;
    const drafts = totalStories - analyzed;

    let avgAmb = null, avgCob = null, avgCompl = null, totalAnalyses = 0, needsRefinement = 0;
    if (stories.length > 0) {
      const r = db.exec(`
        SELECT COUNT(*) AS total,
               AVG(score_ambiguedad)  AS amb,
               AVG(score_cobertura)   AS cob,
               AVG(score_complejidad) AS compl,
               SUM(CASE WHEN json_extract(quality_checks_json,'$.requiere_refinamiento_humano')=1 THEN 1 ELSE 0 END) AS need_ref
        FROM analysis_runs
        WHERE story_id IN (SELECT id FROM stories WHERE project_id = ?)`,
        [req.params.id]
      );
      if (r.length && r[0].values.length) {
        const v = r[0].values[0];
        totalAnalyses   = v[0] || 0;
        avgAmb          = v[1] != null ? Math.round(v[1]) : null;
        avgCob          = v[2] != null ? Math.round(v[2]) : null;
        avgCompl        = v[3] != null ? Math.round(v[3]) : null;
        needsRefinement = v[4] || 0;
      }
    }
    res.json({ total_stories: totalStories, analyzed_stories: analyzed, draft_stories: drafts,
               total_analyses: totalAnalyses, avg_score_ambiguedad: avgAmb,
               avg_score_cobertura: avgCob, avg_score_complejidad: avgCompl,
               needs_refinement: needsRefinement });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/qa-stats
router.get('/:id/qa-stats', async (req, res) => {
  try {
    const db = await getDb();
    const own = db.exec('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!own.length || !own[0].values.length) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // ── Stories by estado ─────────────────────────────────────────────
    const stateRows = db.exec(
      'SELECT estado, COUNT(*) AS n FROM stories WHERE project_id = ? GROUP BY estado',
      [req.params.id]
    );
    const stories_by_estado = {};
    if (stateRows.length) {
      stateRows[0].values.forEach(([estado, n]) => { stories_by_estado[estado] = n; });
    }

    // ── Execution summary ─────────────────────────────────────────────
    const execRows = db.exec(`
      SELECT
        COUNT(DISTINCT te.id)                                                  AS total_executions,
        SUM(CASE WHEN te.completed_at IS NOT NULL THEN 1 ELSE 0 END)           AS completed_executions,
        COUNT(ter.id)                                                           AS total_cases_run,
        SUM(CASE WHEN ter.status = 'pass'    THEN 1 ELSE 0 END)               AS total_pass,
        SUM(CASE WHEN ter.status = 'fail'    THEN 1 ELSE 0 END)               AS total_fail,
        SUM(CASE WHEN ter.status = 'blocked' THEN 1 ELSE 0 END)               AS total_blocked
      FROM test_executions te
      LEFT JOIN test_execution_results ter ON ter.execution_id = te.id
      JOIN analysis_runs ar ON ar.id = te.analysis_run_id
      JOIN stories s ON s.id = ar.story_id
      WHERE s.project_id = ?`, [req.params.id]);

    const ev = execRows.length && execRows[0].values.length ? execRows[0].values[0] : [0,0,0,0,0,0];
    const [total_executions, completed_executions, total_cases_run, total_pass, total_fail, total_blocked] = ev;
    const tested = (total_pass || 0) + (total_fail || 0) + (total_blocked || 0);
    const pass_rate = tested > 0 ? Math.round((total_pass / tested) * 100) : null;

    // ── Bug severity breakdown ────────────────────────────────────────
    const sevRows = db.exec(`
      SELECT ter.bug_severidad, COUNT(*) AS n
      FROM test_execution_results ter
      JOIN test_executions te ON te.id = ter.execution_id
      JOIN analysis_runs ar ON ar.id = te.analysis_run_id
      JOIN stories s ON s.id = ar.story_id
      WHERE s.project_id = ? AND ter.status IN ('fail','blocked')
      GROUP BY ter.bug_severidad`, [req.params.id]);
    const bugs_by_severity = { critica: 0, alta: 0, media: 0, baja: 0 };
    if (sevRows.length) sevRows[0].values.forEach(([sev, n]) => { if (sev) bugs_by_severity[sev] = n; });
    const total_bugs = Object.values(bugs_by_severity).reduce((a, b) => a + b, 0);
    const exported_bugs = (() => {
      const r = db.exec(`
        SELECT COUNT(*) FROM test_execution_results ter
        JOIN test_executions te ON te.id = ter.execution_id
        JOIN analysis_runs ar ON ar.id = te.analysis_run_id
        JOIN stories s ON s.id = ar.story_id
        WHERE s.project_id = ? AND ter.bug_jira_key IS NOT NULL`, [req.params.id]);
      return r.length ? (r[0].values[0][0] || 0) : 0;
    })();

    // ── Recent executions (last 5) ────────────────────────────────────
    const recentRows = db.exec(`
      SELECT te.id, te.environment, te.created_at, te.completed_at, s.titulo AS story_titulo,
             SUM(CASE WHEN ter.status='pass'    THEN 1 ELSE 0 END) AS pass,
             SUM(CASE WHEN ter.status='fail'    THEN 1 ELSE 0 END) AS fail,
             SUM(CASE WHEN ter.status='blocked' THEN 1 ELSE 0 END) AS blocked,
             COUNT(ter.id) AS total
      FROM test_executions te
      LEFT JOIN test_execution_results ter ON ter.execution_id = te.id
      JOIN analysis_runs ar ON ar.id = te.analysis_run_id
      JOIN stories s ON s.id = ar.story_id
      WHERE s.project_id = ?
      GROUP BY te.id
      ORDER BY te.created_at DESC LIMIT 5`, [req.params.id]);

    const recent_executions = recentRows.length ? recentRows[0].values.map(v => ({
      id: v[0], environment: v[1], created_at: v[2], completed_at: v[3],
      story_titulo: v[4], pass: v[5] || 0, fail: v[6] || 0, blocked: v[7] || 0, total: v[8] || 0
    })) : [];

    // ── Coverage by module ────────────────────────────────────────────
    const modRows = db.exec(`
      SELECT s.modulo,
             COUNT(DISTINCT s.id)                                                    AS stories,
             SUM(CASE WHEN s.estado IN ('passed','approved') THEN 1 ELSE 0 END)     AS qa_ok,
             SUM(CASE WHEN s.estado = 'failed'               THEN 1 ELSE 0 END)     AS qa_fail,
             SUM(CASE WHEN s.estado IN ('draft','analyzed')  THEN 1 ELSE 0 END)     AS pending
      FROM stories s WHERE s.project_id = ?
      GROUP BY s.modulo ORDER BY stories DESC`, [req.params.id]);

    const coverage_by_module = modRows.length ? modRows[0].values.map(v => ({
      modulo: v[0] || '—', stories: v[1] || 0, qa_ok: v[2] || 0, qa_fail: v[3] || 0, pending: v[4] || 0
    })) : [];

    // ── Defect density by module (bugs per story by module) ───────────────
    const defectRows = db.exec(`
      SELECT s.modulo,
             COUNT(DISTINCT s.id)  AS stories,
             COUNT(ter.id)         AS total_bugs
      FROM stories s
      LEFT JOIN analysis_runs ar ON ar.story_id = s.id
      LEFT JOIN test_executions te ON te.analysis_run_id = ar.id
      LEFT JOIN test_execution_results ter
            ON ter.execution_id = te.id AND ter.status IN ('fail','blocked')
      WHERE s.project_id = ?
      GROUP BY s.modulo
      ORDER BY total_bugs DESC`, [req.params.id]);

    const defect_density = defectRows.length ? defectRows[0].values.map(v => ({
      modulo:      v[0] || '—',
      stories:     v[1] || 0,
      total_bugs:  v[2] || 0,
      density:     v[1] > 0 ? Math.round(((v[2] || 0) / v[1]) * 10) / 10 : 0
    })) : [];

    // ── AC Coverage: % of ACs with at least 1 executed TC ─────────────────
    // Uses traceability_json to count covered ACs vs total ACs
    const traceRows = db.exec(`
      SELECT ar.traceability_json, ar.final_output_json
      FROM analysis_runs ar
      JOIN stories s ON s.id = ar.story_id
      WHERE s.project_id = ?
      AND ar.id IN (
        SELECT MAX(id) FROM analysis_runs GROUP BY story_id
      )`, [req.params.id]);

    let totalACs = 0, coveredACs = 0;
    if (traceRows.length) {
      traceRows[0].values.forEach(([traceJson, finalJson]) => {
        try {
          const final  = JSON.parse(finalJson || '{}');
          const trace  = JSON.parse(traceJson || '{}');
          const acs    = final.criterios_aceptacion || [];
          totalACs  += acs.length;
          coveredACs += acs.filter(ca => Array.isArray(trace[ca.id]) && trace[ca.id].length > 0).length;
        } catch {}
      });
    }
    const ac_coverage = totalACs > 0 ? Math.round((coveredACs / totalACs) * 100) : null;

    res.json({
      stories_by_estado,
      executions: { total: total_executions || 0, completed: completed_executions || 0,
                    total_cases_run: total_cases_run || 0, pass_rate },
      bugs: { total: total_bugs, by_severity: bugs_by_severity, exported: exported_bugs },
      coverage_by_module,
      defect_density,
      ac_coverage: { pct: ac_coverage, covered: coveredACs, total: totalACs },
      recent_executions
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length || !rows[0].values.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(rowsToObjects(rows[0])[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    let input;
    try { input = sanitizeProjectInput(req.body, { requireName: true }); }
    catch (err) { return res.status(err.status || 400).json({ error: err.message }); }

    const { nombre, descripcion, dominio, contexto_general, glosario, reglas_negocio, sensibilidad } = input;
    const stepLibrary = Array.isArray(req.body?.step_library) ? req.body.step_library : [];
    const db = await getDb();
    db.run(
      `INSERT INTO projects
         (nombre, descripcion, dominio, contexto_general, glosario_json, reglas_negocio_json, sensibilidad, user_id, step_library_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion || null, dominio || null, contexto_general || null,
       JSON.stringify(glosario || []), JSON.stringify(reglas_negocio || []),
       sensibilidad || 'interno', req.user.id, JSON.stringify(stepLibrary)]
    );
    const newId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    saveDb();
    res.status(201).json(rowsToObjects(db.exec('SELECT * FROM projects WHERE id = ?', [newId])[0])[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    let input;
    try { input = sanitizeProjectInput(req.body, { requireName: true }); }
    catch (err) { return res.status(err.status || 400).json({ error: err.message }); }

    const { nombre, descripcion, dominio, contexto_general, glosario, reglas_negocio, sensibilidad } = input;
    const stepLibrary = Array.isArray(req.body?.step_library) ? req.body.step_library : [];
    const db = await getDb();
    const own = db.exec(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!own.length || !own[0].values.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    db.run(
      `UPDATE projects
       SET nombre=?, descripcion=?, dominio=?, contexto_general=?,
           glosario_json=?, reglas_negocio_json=?, sensibilidad=?,
           step_library_json=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND user_id=?`,
      [nombre, descripcion || null, dominio || null, contexto_general || null,
       JSON.stringify(glosario || []), JSON.stringify(reglas_negocio || []),
       sensibilidad || 'interno', JSON.stringify(stepLibrary),
       req.params.id, req.user.id]
    );
    saveDb();
    res.json(rowsToObjects(db.exec('SELECT * FROM projects WHERE id = ?', [req.params.id])[0])[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const own = db.exec(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!own.length || !own[0].values.length) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    saveDb();
    res.json({ message: 'Proyecto eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
