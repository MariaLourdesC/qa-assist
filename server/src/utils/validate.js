// Helpers de validación y sanitización para inputs de texto.
// El frontend renderiza con {} (textContent), así que XSS no se ejecuta,
// pero igual limpiamos: límite de tamaño, normalización de control chars,
// y trim. Aplicar a todo lo que venga del usuario.

const LIMITS = {
  shortName:        200,    // titulos, dominio, etc.
  storyDescription: 5000,  // descripcion de historia — limita tokens al pipeline/LLM
  textBlock:        50000,  // contexto de proyecto, campos grandes
  glossaryTerm:     100,
  glossaryDef:      500,
  ruleBody:         300,
  ruleType:         50,
  notes:            2000,
  comment:          2000
};

const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function cleanString(value, maxLen) {
  if (value == null) return null;
  if (typeof value !== 'string') {
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    throw new Error(`Invalid string value`);
  }
  let s = value.replace(CONTROL_CHARS_RE, '').trim();
  if (maxLen != null && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function ensureRequired(value, field) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    const err = new Error(`Field "${field}" is required`);
    err.status = 400;
    throw err;
  }
}

function cleanArray(value, mapItem, max = 200) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    const err = new Error('Expected array');
    err.status = 400;
    throw err;
  }
  // Reject oversized arrays BEFORE allocating — prevents memory DoS
  if (value.length > max * 10) {
    const err = new Error(`Array too large (max ${max * 10} items)`);
    err.status = 400;
    throw err;
  }
  return value.slice(0, max).map(mapItem).filter(Boolean);
}

function sanitizeProjectInput(body, { requireName = false } = {}) {
  if (requireName) ensureRequired(body?.nombre, 'nombre');
  return {
    nombre:           cleanString(body?.nombre,           LIMITS.shortName),
    descripcion:      cleanString(body?.descripcion,      LIMITS.textBlock),
    dominio:          cleanString(body?.dominio,          LIMITS.shortName),
    contexto_general: cleanString(body?.contexto_general, LIMITS.textBlock),
    sensibilidad:     ['publico','interno','sensible','restringido'].includes(body?.sensibilidad) ? body.sensibilidad : 'interno',
    glosario: cleanArray(body?.glosario, (g) => {
      if (!g || typeof g !== 'object') return null;
      const termino = cleanString(g.termino, LIMITS.glossaryTerm);
      const definicion = cleanString(g.definicion, LIMITS.glossaryDef);
      if (!termino) return null;
      return { termino, definicion: definicion || '' };
    }),
    reglas_negocio: cleanArray(body?.reglas_negocio, (r) => {
      if (!r || typeof r !== 'object') return null;
      const regla = cleanString(r.regla, LIMITS.ruleBody);
      const tipo = cleanString(r.tipo, LIMITS.ruleType) || 'restriccion';
      if (!regla) return null;
      return { regla, tipo };
    })
  };
}

function sanitizeStoryInput(body, { requireBody = false } = {}) {
  if (requireBody) {
    ensureRequired(body?.titulo, 'titulo');
    ensureRequired(body?.descripcion, 'descripcion');
  }

  const rawDesc = body?.descripcion;
  if (typeof rawDesc === 'string' && rawDesc.length > LIMITS.storyDescription) {
    const err = new Error(
      `La descripción excede el límite de ${LIMITS.storyDescription} caracteres (${rawDesc.length} recibidos).`
    );
    err.status = 400;
    throw err;
  }

  return {
    titulo:      cleanString(body?.titulo,      LIMITS.shortName),
    modulo:      cleanString(body?.modulo,      LIMITS.shortName),
    descripcion: cleanString(body?.descripcion, LIMITS.storyDescription),
    fuente:      cleanString(body?.fuente,      LIMITS.shortName),
    notas_qa:    cleanString(body?.notas_qa,    LIMITS.notes),
    estado:      ['draft','analyzed','in_testing','passed','failed','approved','archived'].includes(body?.estado) ? body.estado : 'draft'
  };
}

function sanitizeFeedbackInput(body) {
  ensureRequired(body?.analysis_run_id, 'analysis_run_id');
  return {
    analysis_run_id: parseInt(body.analysis_run_id, 10),
    utilidad: ['muy_util','util','poco_util','inutil'].includes(body?.utilidad) ? body.utilidad : 'util',
    comentario: cleanString(body?.comentario, LIMITS.comment) || null
  };
}

module.exports = {
  cleanString,
  ensureRequired,
  sanitizeProjectInput,
  sanitizeStoryInput,
  sanitizeFeedbackInput,
  LIMITS
};
