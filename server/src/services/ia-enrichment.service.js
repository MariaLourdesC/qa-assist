// ia-enrichment.service.js
// Enriquece el output del pipeline local con un LLM (Claude).
// Solo agrega items que el local no detectó. Marca todo con origen: 'ia'.

const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS = 30000;
const MAX_TOKENS = 2048;

let _client = null;
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  _client = new Anthropic({ apiKey });
  return _client;
}

function isAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

const PROMPT_LABELS = {
  es: {
    intro: 'Eres un experto en QA. Tu tarea es enriquecer un análisis de historia de usuario con elementos que el motor local NO DETECTÓ.',
    projectCtx: '## CONTEXTO DEL PROYECTO',
    name: 'Nombre',
    domain: 'Dominio',
    context: 'Contexto',
    glossary: 'Glosario',
    rules: 'Reglas de negocio',
    storyHdr: '## HISTORIA',
    title: 'Título',
    module: 'Módulo',
    qaNotes: 'Notas QA',
    description: 'Descripción',
    localHdr: '## ANÁLISIS LOCAL ACTUAL (no repitas estos items)',
    ambs: 'Ambigüedades',
    qs: 'Preguntas',
    rks: 'Riesgos',
    edges: 'Edge cases',
    instructionsHdr: '## INSTRUCCIONES',
    instr1: '1. Identifica entre 2 y 4 items NUEVOS por bloque que el análisis local pudo haber pasado por alto.',
    instr2: '2. Enfócate en lo que requiere experiencia de QA: reglas implícitas del dominio, casos de borde no obvios, riesgos de seguridad/performance/UX.',
    instr3: '3. NO repitas ni reformules items existentes.',
    instr4: '4. NO inventes entidades que no estén en la historia o el contexto del proyecto.',
    instr5: '5. Sé conciso: cada descripción/pregunta una sola línea.',
    instrLang: '6. Responde TODOS los textos (descripciones y preguntas) en ESPAÑOL.',
    formatHdr: '## FORMATO DE RESPUESTA',
    formatInstr: 'Responde EXCLUSIVAMENTE con JSON válido (sin markdown, sin explicación), con esta forma exacta:'
  },
  en: {
    intro: 'You are a QA expert. Your task is to enrich a user story analysis with items that the local engine DID NOT DETECT.',
    projectCtx: '## PROJECT CONTEXT',
    name: 'Name',
    domain: 'Domain',
    context: 'Context',
    glossary: 'Glossary',
    rules: 'Business rules',
    storyHdr: '## STORY',
    title: 'Title',
    module: 'Module',
    qaNotes: 'QA notes',
    description: 'Description',
    localHdr: '## CURRENT LOCAL ANALYSIS (do not repeat these items)',
    ambs: 'Ambiguities',
    qs: 'Questions',
    rks: 'Risks',
    edges: 'Edge cases',
    instructionsHdr: '## INSTRUCTIONS',
    instr1: '1. Identify between 2 and 4 NEW items per block that the local analysis may have missed.',
    instr2: '2. Focus on what requires QA experience: implicit domain rules, non-obvious edge cases, security/performance/UX risks.',
    instr3: '3. DO NOT repeat or rephrase existing items.',
    instr4: '4. DO NOT invent entities that are not in the story or project context.',
    instr5: '5. Be concise: one line per description/question.',
    instrLang: '6. Respond with ALL texts (descriptions and questions) in ENGLISH.',
    formatHdr: '## RESPONSE FORMAT',
    formatInstr: 'Respond ONLY with valid JSON (no markdown, no explanation), with this exact shape:'
  }
};

function buildPrompt({ story, project, localResult, lang = 'es' }) {
  const L = PROMPT_LABELS[lang] || PROMPT_LABELS.es;
  const parts = [];

  parts.push(L.intro);
  parts.push('');
  parts.push(L.projectCtx);
  parts.push(`${L.name}: ${project.nombre || '—'}`);
  if (project.dominio)          parts.push(`${L.domain}: ${project.dominio}`);
  if (project.contexto_general) parts.push(`${L.context}: ${project.contexto_general}`);

  if (project.glosario && project.glosario.length > 0) {
    parts.push(`${L.glossary}:`);
    project.glosario.forEach(g => parts.push(`  - ${g.termino}: ${g.definicion}`));
  }
  if (project.reglas_negocio && project.reglas_negocio.length > 0) {
    parts.push(`${L.rules}:`);
    project.reglas_negocio.forEach(r => parts.push(`  - [${r.tipo || 'rule'}] ${r.regla}`));
  }
  parts.push('');

  parts.push(L.storyHdr);
  parts.push(`${L.title}: ${story.titulo}`);
  if (story.modulo)   parts.push(`${L.module}: ${story.modulo}`);
  if (story.notas_qa) parts.push(`${L.qaNotes}: ${story.notas_qa}`);
  parts.push(`${L.description}:`);
  parts.push(story.descripcion);
  parts.push('');

  parts.push(L.localHdr);
  parts.push(`${L.ambs} (${localResult.ambiguedades.length}):`);
  localResult.ambiguedades.forEach(a => parts.push(`  - ${a.descripcion}`));
  parts.push(`${L.qs} (${localResult.preguntas_refinamiento.length}):`);
  localResult.preguntas_refinamiento.forEach(p => parts.push(`  - ${p.pregunta}`));
  parts.push(`${L.rks} (${localResult.riesgos.length}):`);
  localResult.riesgos.forEach(r => parts.push(`  - ${r.descripcion}`));
  parts.push(`${L.edges} (${localResult.negativos_edge_cases.length}):`);
  localResult.negativos_edge_cases.forEach(e => parts.push(`  - ${e.descripcion}`));
  parts.push('');

  parts.push(L.instructionsHdr);
  parts.push(L.instr1);
  parts.push(L.instr2);
  parts.push(L.instr3);
  parts.push(L.instr4);
  parts.push(L.instr5);
  parts.push(L.instrLang);
  parts.push('');
  parts.push(L.formatHdr);
  parts.push(L.formatInstr);
  parts.push('```');
  parts.push(JSON.stringify({
    ambiguedades: [{ descripcion: 'string', severidad: 'alta|media|baja' }],
    preguntas_refinamiento: [{ pregunta: 'string' }],
    riesgos: [{ descripcion: 'string', severidad: 'alta|media|baja' }],
    negativos_edge_cases: [{ descripcion: 'string' }]
  }, null, 2));
  parts.push('```');

  return parts.join('\n');
}

function tryParseJson(text) {
  if (!text) return null;
  // Try direct parse, then extract from ```json ... ``` or first { ... last }
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  return null;
}

function nextId(existing, prefix) {
  const used = new Set((existing || []).map(x => x.id));
  let n = 1;
  while (used.has(`${prefix}-IA-${String(n).padStart(3, '0')}`)) n++;
  return () => `${prefix}-IA-${String(n++).padStart(3, '0')}`;
}

function normalizeSeveridad(s) {
  const v = String(s || '').toLowerCase();
  return ['alta', 'media', 'baja'].includes(v) ? v : 'media';
}

/**
 * Enriquece el resultado local con items generados por IA.
 * @returns {object} { resultado_enriquecido, llm_meta }
 *   - resultado_enriquecido tiene la misma forma que el resultado local pero con items extra.
 *   - llm_meta describe qué pasó (modelo, tokens, error si falló).
 */
async function enrichWithIA({ story, project, localResult, lang = 'es' }) {
  const client = getClient();
  if (!client) {
    return {
      resultado: localResult,
      llm_meta: { used: false, reason: 'no_api_key' }
    };
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const prompt = buildPrompt({ story, project, localResult, lang });

  let raw, parsed, error = null, usage = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    }, { signal: controller.signal });
    clearTimeout(timer);
    raw = response.content?.[0]?.text || '';
    usage = response.usage || null;
    parsed = tryParseJson(raw);
    if (!parsed) error = 'parse_failed';
  } catch (err) {
    error = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'request_failed');
  }

  if (error || !parsed) {
    return {
      resultado: localResult,
      llm_meta: { used: false, error, model, usage, raw_preview: raw ? raw.slice(0, 200) : null }
    };
  }

  // Normalizar y mergear, marcando origen y asignando IDs únicos
  const ambIdGen = nextId(localResult.ambiguedades, 'AMB');
  const preIdGen = nextId(localResult.preguntas_refinamiento, 'PRE');
  const rskIdGen = nextId(localResult.riesgos, 'RSK');
  const ecIdGen  = nextId(localResult.negativos_edge_cases, 'EC');

  const newAmbs = (parsed.ambiguedades || []).filter(x => x?.descripcion).map(x => ({
    id: ambIdGen(),
    descripcion: x.descripcion,
    severidad: normalizeSeveridad(x.severidad),
    origen: 'ia'
  }));
  const newPres = (parsed.preguntas_refinamiento || []).filter(x => x?.pregunta).map(x => ({
    id: preIdGen(),
    pregunta: x.pregunta,
    origen: 'ia'
  }));
  const newRsks = (parsed.riesgos || []).filter(x => x?.descripcion).map(x => ({
    id: rskIdGen(),
    descripcion: x.descripcion,
    severidad: normalizeSeveridad(x.severidad),
    origen: 'ia'
  }));
  const newEcs = (parsed.negativos_edge_cases || []).filter(x => x?.descripcion).map(x => ({
    id: ecIdGen(),
    descripcion: x.descripcion,
    origen: 'ia'
  }));

  const enriched = {
    ...localResult,
    ambiguedades:           [...localResult.ambiguedades, ...newAmbs],
    preguntas_refinamiento: [...localResult.preguntas_refinamiento, ...newPres],
    riesgos:                [...localResult.riesgos, ...newRsks],
    negativos_edge_cases:   [...localResult.negativos_edge_cases, ...newEcs]
  };

  const bloques_generados_por_ia = [];
  if (newAmbs.length) bloques_generados_por_ia.push('ambiguedades');
  if (newPres.length) bloques_generados_por_ia.push('preguntas_refinamiento');
  if (newRsks.length) bloques_generados_por_ia.push('riesgos');
  if (newEcs.length)  bloques_generados_por_ia.push('negativos_edge_cases');

  return {
    resultado: enriched,
    llm_meta: {
      used: true,
      model,
      usage,
      added: {
        ambiguedades: newAmbs.length,
        preguntas_refinamiento: newPres.length,
        riesgos: newRsks.length,
        negativos_edge_cases: newEcs.length
      },
      bloques_generados_por_ia,
      raw
    }
  };
}

module.exports = { enrichWithIA, isAvailable };
