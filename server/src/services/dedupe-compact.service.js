// dedupe-compact.service.js
// Elimina duplicados, fusiona items muy parecidos y aplica limites por bloque.

const { normalizar } = require('./story-parser.service');

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para',
  'y', 'o', 'u', 'e', 'que', 'se', 'es', 'son', 'ser',
  'su', 'sus', 'lo', 'le', 'les', 'si', 'no', 'mas', 'menos',
  'como', 'cuando', 'donde'
]);

const UMBRAL_SIMILITUD = 0.80;

const LIMITES = {
  ambiguedades: 8,
  preguntas_refinamiento: 8,
  criterios_aceptacion: 10,
  test_cases: 12,
  negativos_edge_cases: 8,
  riesgos: 6
};

function tokenizar(texto) {
  return new Set(
    normalizar(texto)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t && !STOPWORDS.has(t))
  );
}

function similitud(a, b) {
  const ta = tokenizar(a);
  const tb = tokenizar(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  const comunes = [...ta].filter(t => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : comunes / union;
}

// Extrae el texto representativo de un item (segun el bloque)
function textoDe(item) {
  return item.descripcion || item.pregunta || item.criterio || item.titulo || '';
}

// Mide tamano total del item (heuristica "mas completo")
function tamanoDe(item) {
  return JSON.stringify(item).length;
}

function dedupeLista(items) {
  const resultado = [];
  for (const item of items) {
    const textoItem = textoDe(item);
    let duplicadoIdx = -1;
    for (let i = 0; i < resultado.length; i++) {
      if (similitud(textoItem, textoDe(resultado[i])) > UMBRAL_SIMILITUD) {
        duplicadoIdx = i;
        break;
      }
    }
    if (duplicadoIdx === -1) {
      resultado.push(item);
    } else if (tamanoDe(item) > tamanoDe(resultado[duplicadoIdx])) {
      resultado[duplicadoIdx] = item;
    }
  }
  return resultado;
}

// Prioriza por relevancia: items que mencionan mas entidades/integraciones van primero
function priorizar(items, señales) {
  const señalesSet = new Set(señales.map(s => normalizar(s)));
  return [...items].sort((a, b) => {
    const relA = contarRelevancia(a, señalesSet);
    const relB = contarRelevancia(b, señalesSet);
    if (relB !== relA) return relB - relA;
    // items "local" ganan a "ia" en empate
    if (a.origen !== b.origen) return a.origen === 'local' ? -1 : 1;
    return 0;
  });
}

function contarRelevancia(item, señalesSet) {
  const texto = normalizar(JSON.stringify(item));
  let n = 0;
  for (const s of señalesSet) {
    if (s && texto.includes(s)) n++;
  }
  return n;
}

/**
 * Aplica dedupe + priorizacion + limite a un bloque.
 */
function procesarBloque(items, limite, señales) {
  if (!Array.isArray(items)) return [];
  const deduped = dedupeLista(items);
  const priorizados = priorizar(deduped, señales);
  return priorizados.slice(0, limite);
}

/**
 * Aplica dedupe y limites a todo el resultado QA.
 * @param {object} resultado - { ambiguedades, preguntas_refinamiento, criterios_aceptacion, test_cases, negativos_edge_cases, riesgos }
 * @param {object} parser - para extraer entidades/integraciones (señales de relevancia)
 */
function dedupeCompact(resultado, parser = {}) {
  const señales = [
    ...(parser.entidades_detectadas || []),
    ...(parser.integraciones_detectadas || []),
    ...(parser.roles_detectados || [])
  ];

  return {
    ambiguedades: procesarBloque(resultado.ambiguedades, LIMITES.ambiguedades, señales),
    preguntas_refinamiento: procesarBloque(resultado.preguntas_refinamiento, LIMITES.preguntas_refinamiento, señales),
    criterios_aceptacion: procesarBloque(resultado.criterios_aceptacion, LIMITES.criterios_aceptacion, señales),
    test_cases: procesarBloque(resultado.test_cases, LIMITES.test_cases, señales),
    negativos_edge_cases: procesarBloque(resultado.negativos_edge_cases, LIMITES.negativos_edge_cases, señales),
    riesgos: procesarBloque(resultado.riesgos, LIMITES.riesgos, señales)
  };
}

module.exports = { dedupeCompact, similitud, LIMITES };
