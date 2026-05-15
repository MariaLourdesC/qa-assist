const express   = require('express');
const rateLimit = require('express-rate-limit');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

// 30 Jira API calls per minute per IP — covers both import and export
const jiraLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many Jira requests. Try again in a minute.' }
});

// POST /api/jira/import — fetch a Jira issue and return normalized story fields
router.post('/import', jiraLimiter, async (req, res) => {
  const { jiraUrl, email, apiToken, issueKey } = req.body;
  if (!jiraUrl || !email || !apiToken || !issueKey) {
    return res.status(400).json({ error: 'jiraUrl, email, apiToken and issueKey are required' });
  }

  const base64 = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const cleanUrl = jiraUrl.replace(/\/$/, '');
  const url = `${cleanUrl}/rest/api/3/issue/${encodeURIComponent(issueKey.trim().toUpperCase())}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${base64}`, Accept: 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.errorMessages?.[0] || err.message || `HTTP ${response.status}`;
      return res.status(response.status >= 500 ? 502 : response.status).json({ error: msg });
    }

    const issue = await response.json();
    const fields = issue.fields || {};

    res.json({
      issueKey: issue.key,
      titulo: fields.summary || '',
      modulo: fields.components?.[0]?.name || '',
      descripcion: adfToText(fields.description),
      fuente: `${cleanUrl}/browse/${issue.key}`,
      notas_qa: ''
    });
  } catch (err) {
    res.status(502).json({ error: `Jira connection error: ${err.message}` });
  }
});

// POST /api/jira/export-tests — create issues in Jira from test cases
router.post('/export-tests', jiraLimiter, async (req, res) => {
  const { jiraUrl, email, apiToken, projectKey, issueType = 'Story', testCases, storyTitle } = req.body;
  if (!jiraUrl || !email || !apiToken || !projectKey || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: 'jiraUrl, email, apiToken, projectKey and testCases[] are required' });
  }

  const base64 = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const cleanUrl = jiraUrl.replace(/\/$/, '');
  const createUrl = `${cleanUrl}/rest/api/3/issue`;

  const results = [];
  const errors = [];

  for (const tc of testCases) {
    try {
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${base64}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildIssueBody(projectKey, issueType, tc, storyTitle))
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.errors ? JSON.stringify(err.errors) : `HTTP ${response.status}`;
        errors.push({ tcId: tc.id, error: msg });
      } else {
        const created = await response.json();
        results.push({ tcId: tc.id, issueKey: created.key, url: `${cleanUrl}/browse/${created.key}` });
      }
    } catch (err) {
      errors.push({ tcId: tc.id, error: err.message });
    }
  }

  res.json({ created: results, errors });
});

// ── Helpers ────────────────────────────────────────────────────────────────

function adfToText(adf) {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  const parts = [];
  function walk(node) {
    if (!node) return;
    if (node.type === 'text') { parts.push(node.text || ''); return; }
    if (Array.isArray(node.content)) node.content.forEach(walk);
    if (['paragraph', 'heading', 'listItem', 'rule'].includes(node.type)) parts.push('\n');
  }
  walk(adf);
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function buildIssueBody(projectKey, issueType, tc, storyTitle) {
  const lines = [];
  if (storyTitle) lines.push(`*Historia:* ${storyTitle}`);
  if (tc.precondiciones) lines.push(`*Precondiciones:* ${tc.precondiciones}`);
  if (tc.pasos?.length) {
    lines.push('*Pasos:*');
    tc.pasos.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  if (tc.resultado_esperado) lines.push(`*Resultado esperado:* ${tc.resultado_esperado}`);

  return {
    fields: {
      project: { key: projectKey },
      issuetype: { name: issueType },
      summary: `[${tc.id}] ${tc.titulo}`,
      description: {
        type: 'doc',
        version: 1,
        content: lines.map(line => ({
          type: 'paragraph',
          content: [{ type: 'text', text: line }]
        }))
      },
      labels: ['qa-assist', 'test-case']
    }
  };
}

module.exports = router;
