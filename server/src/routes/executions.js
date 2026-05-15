const express    = require('express');
const rateLimit  = require('express-rate-limit');
const authenticate = require('../middleware/authenticate');
const { getDb, saveDb } = require('../db/connection');

const router = express.Router();
router.use(authenticate);

const exportLimiter = rateLimit({ windowMs: 60_000, max: 20, legacyHeaders: false,
  message: { error: 'Too many export requests. Try again in a minute.' } });

// ── helpers ───────────────────────────────────────────────────────────────

function rows(rs) {
  if (!rs.length) return [];
  const { columns, values } = rs[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

function ownRun(db, runId, userId) {
  const r = db.exec(
    `SELECT ar.id FROM analysis_runs ar
     JOIN stories s ON s.id = ar.story_id
     JOIN projects p ON p.id = s.project_id
     WHERE ar.id = ? AND p.user_id = ?`, [runId, userId]);
  return r.length && r[0].values.length;
}

function ownExecution(db, execId, userId) {
  const r = db.exec(
    `SELECT te.id FROM test_executions te
     JOIN analysis_runs ar ON ar.id = te.analysis_run_id
     JOIN stories s ON s.id = ar.story_id
     JOIN projects p ON p.id = s.project_id
     WHERE te.id = ? AND p.user_id = ?`, [execId, userId]);
  return r.length && r[0].values.length;
}

function execStats(results) {
  const counts = { pass: 0, fail: 0, blocked: 0, skip: 0, pending: 0 };
  results.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  return counts;
}

function storyIdFromExec(db, execId) {
  const r = db.exec(
    `SELECT ar.story_id FROM analysis_runs ar
     JOIN test_executions te ON te.analysis_run_id = ar.id
     WHERE te.id = ?`, [execId]);
  return r.length && r[0].values.length ? r[0].values[0][0] : null;
}

function setStoryEstado(db, execId, estado) {
  const storyId = storyIdFromExec(db, execId);
  if (storyId) {
    db.run('UPDATE stories SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [estado, storyId]);
  }
  return storyId;
}

// ── POST /api/executions ──────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { analysis_run_id, test_cases, environment, notes } = req.body;
    if (!analysis_run_id || !Array.isArray(test_cases) || test_cases.length === 0) {
      return res.status(400).json({ error: 'analysis_run_id and test_cases[] are required' });
    }
    const db = await getDb();
    if (!ownRun(db, analysis_run_id, req.user.id)) {
      return res.status(404).json({ error: 'Analysis run not found' });
    }

    db.run(
      'INSERT INTO test_executions (analysis_run_id, environment, notes) VALUES (?, ?, ?)',
      [analysis_run_id, environment || null, notes || null]
    );
    const execId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];

    for (const tc of test_cases) {
      db.run(
        'INSERT INTO test_execution_results (execution_id, tc_id, tc_titulo, status) VALUES (?, ?, ?, ?)',
        [execId, tc.id, tc.titulo || tc.id, 'pending']
      );
    }

    // Mark story as "in testing"
    setStoryEstado(db, execId, 'in_testing');
    saveDb();

    res.status(201).json({ id: execId, analysis_run_id, environment, created_at: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/executions?analysis_run_id=X ─────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { analysis_run_id } = req.query;
    if (!analysis_run_id) return res.status(400).json({ error: 'analysis_run_id required' });
    const db = await getDb();
    if (!ownRun(db, analysis_run_id, req.user.id)) {
      return res.status(404).json({ error: 'Analysis run not found' });
    }

    const executions = rows(db.exec(
      'SELECT * FROM test_executions WHERE analysis_run_id = ? ORDER BY created_at DESC',
      [analysis_run_id]
    ));

    const enriched = executions.map(ex => {
      const results = rows(db.exec(
        'SELECT status FROM test_execution_results WHERE execution_id = ?', [ex.id]
      ));
      return { ...ex, stats: execStats(results), total: results.length };
    });

    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/executions/:id ───────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownExecution(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    const execs = rows(db.exec('SELECT * FROM test_executions WHERE id = ?', [req.params.id]));
    const results = rows(db.exec(
      'SELECT * FROM test_execution_results WHERE execution_id = ? ORDER BY id', [req.params.id]
    ));
    const storyId = storyIdFromExec(db, req.params.id);
    const storyRows = storyId ? db.exec('SELECT estado FROM stories WHERE id = ?', [storyId]) : [];
    const storyEstado = storyRows.length ? storyRows[0].values[0][0] : null;
    res.json({ ...execs[0], results, stats: execStats(results), story_id: storyId, story_estado: storyEstado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/executions/:id/results — update a single TC result ─────────

router.patch('/:id/results', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownExecution(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    const { tc_id, status, bug_titulo, bug_pasos_reales, bug_severidad, bug_ambiente, bug_screenshot_url, bug_notas } = req.body;
    if (!tc_id || !status) return res.status(400).json({ error: 'tc_id and status required' });

    const valid = ['pass', 'fail', 'blocked', 'skip', 'pending'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const { bug_status } = req.body;
    db.run(
      `UPDATE test_execution_results
       SET status = ?, bug_titulo = ?, bug_pasos_reales = ?, bug_severidad = ?,
           bug_ambiente = ?, bug_screenshot_url = ?, bug_notas = ?, bug_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE execution_id = ? AND tc_id = ?`,
      [status,
       bug_titulo || null, bug_pasos_reales || null,
       bug_severidad || 'media', bug_ambiente || null, bug_screenshot_url || null,
       bug_notas || null, bug_status || 'open',
       req.params.id, tc_id]
    );
    saveDb();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/executions/:id/complete ────────────────────────────────────

router.patch('/:id/complete', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownExecution(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    db.run(
      'UPDATE test_executions SET completed_at = CURRENT_TIMESTAMP, notes = ? WHERE id = ?',
      [req.body.notes || null, req.params.id]
    );

    // Auto-transition: passed if no failures, failed if any fail/blocked
    const bugRows = db.exec(
      `SELECT COUNT(*) FROM test_execution_results
       WHERE execution_id = ? AND status IN ('fail','blocked')`,
      [req.params.id]
    );
    const hasBugs = (bugRows[0]?.values[0]?.[0] || 0) > 0;
    setStoryEstado(db, req.params.id, hasBugs ? 'failed' : 'passed');
    saveDb();

    res.json({ ok: true, story_estado: hasBugs ? 'failed' : 'passed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/executions/:id/approve — QA sign-off ───────────────────────

router.patch('/:id/approve', async (req, res) => {
  try {
    const db = await getDb();
    if (!ownExecution(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    const storyId = setStoryEstado(db, req.params.id, 'approved');
    saveDb();
    res.json({ ok: true, story_id: storyId, story_estado: 'approved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/executions/:id/export-bugs — push failed TCs as Jira bugs ───

router.post('/:id/export-bugs', exportLimiter, async (req, res) => {
  try {
    const db = await getDb();
    if (!ownExecution(db, req.params.id, req.user.id)) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const { jiraUrl, email, apiToken, projectKey, issueType = 'Bug' } = req.body;
    if (!jiraUrl || !email || !apiToken || !projectKey) {
      return res.status(400).json({ error: 'jiraUrl, email, apiToken and projectKey are required' });
    }

    const failed = rows(db.exec(
      `SELECT * FROM test_execution_results
       WHERE execution_id = ? AND status IN ('fail','blocked') AND bug_jira_key IS NULL`,
      [req.params.id]
    ));

    if (failed.length === 0) return res.json({ created: [], errors: [] });

    const base64   = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const cleanUrl = jiraUrl.replace(/\/$/, '');
    const createUrl = `${cleanUrl}/rest/api/3/issue`;

    const created = [];
    const errors  = [];

    for (const r of failed) {
      const lines = [];
      if (r.bug_pasos_reales) lines.push(`*Resultado real:*\n${r.bug_pasos_reales}`);
      if (r.bug_ambiente)     lines.push(`*Ambiente:* ${r.bug_ambiente}`);
      if (r.bug_screenshot_url) lines.push(`*Evidencia:* ${r.bug_screenshot_url}`);

      const body = {
        fields: {
          project: { key: projectKey },
          issuetype: { name: issueType },
          summary: r.bug_titulo || `[${r.tc_id}] ${r.tc_titulo}`,
          priority: { name: severityToPriority(r.bug_severidad) },
          description: {
            type: 'doc', version: 1,
            content: lines.map(l => ({
              type: 'paragraph', content: [{ type: 'text', text: l }]
            }))
          },
          labels: ['qa-assist', 'bug-report']
        }
      };

      try {
        const resp = await fetch(createUrl, {
          method: 'POST',
          headers: { Authorization: `Basic ${base64}`, Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          errors.push({ tcId: r.tc_id, error: err.errors ? JSON.stringify(err.errors) : `HTTP ${resp.status}` });
        } else {
          const issue = await resp.json();
          db.run('UPDATE test_execution_results SET bug_jira_key = ? WHERE id = ?', [issue.key, r.id]);
          created.push({ tcId: r.tc_id, issueKey: issue.key, url: `${cleanUrl}/browse/${issue.key}` });
        }
      } catch (err) {
        errors.push({ tcId: r.tc_id, error: err.message });
      }
    }

    if (created.length) saveDb();
    res.json({ created, errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function severityToPriority(sev) {
  return { critica: 'Highest', alta: 'High', media: 'Medium', baja: 'Low' }[sev] || 'Medium';
}

module.exports = router;
