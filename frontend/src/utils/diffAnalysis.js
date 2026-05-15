// Compara dos análisis bloque por bloque y devuelve added/removed/unchanged.
// Identifica items por su texto principal (descripcion / pregunta / criterio / titulo).

const BLOCK_TEXT_FIELD = {
  ambiguedades: 'descripcion',
  preguntas_refinamiento: 'pregunta',
  criterios_aceptacion: 'criterio',
  test_cases: 'titulo',
  negativos_edge_cases: 'descripcion',
  riesgos: 'descripcion'
};

function norm(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function diffBlock(arrA = [], arrB = [], field) {
  const setA = new Map(arrA.map(item => [norm(item[field]), item]));
  const setB = new Map(arrB.map(item => [norm(item[field]), item]));
  const added = [];
  const removed = [];
  const unchanged = [];

  for (const [key, item] of setA) {
    if (setB.has(key)) unchanged.push(item);
    else removed.push(item);
  }
  for (const [key, item] of setB) {
    if (!setA.has(key)) added.push(item);
  }

  return { added, removed, unchanged };
}

/**
 * @param {object} analysisA versión base
 * @param {object} analysisB versión comparada
 * @returns {object} { blockKey: { added, removed, unchanged }, summary: { added, removed, unchanged } }
 */
export function diffAnalyses(analysisA, analysisB) {
  const result = {};
  let totalAdded = 0, totalRemoved = 0, totalUnchanged = 0;

  for (const [block, field] of Object.entries(BLOCK_TEXT_FIELD)) {
    const a = analysisA?.resultado?.[block] || [];
    const b = analysisB?.resultado?.[block] || [];
    const d = diffBlock(a, b, field);
    result[block] = d;
    totalAdded += d.added.length;
    totalRemoved += d.removed.length;
    totalUnchanged += d.unchanged.length;
  }

  return {
    blocks: result,
    summary: { added: totalAdded, removed: totalRemoved, unchanged: totalUnchanged },
    fieldByBlock: BLOCK_TEXT_FIELD
  };
}
