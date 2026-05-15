// quality-checks.service.js
// Evalua 7 checks booleanos sobre la salida QA (spec §12).

const { similitud } = require('./dedupe-compact.service');

const PALABRAS_NO_ACCIONABLES = [
  'correctamente', 'adecuadamente', 'bien',
  'como se espera', 'sin errores', 'funciona',
  'debe funcionar'
];

const UMBRAL_REDUNDANCIA = 0.80;

// 12.1
function cobertura_minima(resultado, scoreAmbig) {
  const tc = resultado.test_cases?.length || 0;
  const ca = resultado.criterios_aceptacion?.length || 0;
  const amb = resultado.ambiguedades?.length || 0;
  return tc >= 3 && ca >= 2 && (amb >= 1 || scoreAmbig < 20);
}

// 12.2
function casos_accionables(resultado) {
  const tcs = resultado.test_cases || [];
  if (tcs.length === 0) return false;
  return tcs.every(tc => {
    if (!tc.precondiciones || !tc.precondiciones.trim()) return false;
    if (!Array.isArray(tc.pasos) || tc.pasos.length === 0) return false;
    if (!tc.resultado_esperado || !tc.resultado_esperado.trim()) return false;
    const re = tc.resultado_esperado.toLowerCase();
    if (PALABRAS_NO_ACCIONABLES.some(p => re.includes(p))) return false;
    return true;
  });
}

// 12.3
function sin_supuestos_no_soportados(resultado, parser) {
  const entidadesOk = new Set((parser.entidades_detectadas || []).map(e => e.toLowerCase()));
  const integracionesOk = new Set((parser.integraciones_detectadas || []).map(i => i.toLowerCase()));

  // No hay una forma 100% limpia de distinguir texto plano -> por ahora
  // solo penalizamos menciones de integraciones NO detectadas.
  const menciones = [
    ...(resultado.test_cases || []).flatMap(tc => [tc.titulo, ...(tc.pasos || []), tc.resultado_esperado, tc.precondiciones]),
    ...(resultado.criterios_aceptacion || []).map(c => c.criterio)
  ].join(' ').toLowerCase();

  const integracionesSospechosas = [
    'stripe', 'paypal', 'mercadopago', 'kafka', 'rabbitmq',
    'sqs', 'redis', 'elasticsearch'
  ];
  for (const intg of integracionesSospechosas) {
    if (menciones.includes(intg) && !integracionesOk.has(intg)) return false;
  }
  return true;
}

// 12.4
function riesgos_relevantes(resultado, scoreComp) {
  const n = resultado.riesgos?.length || 0;
  if (scoreComp < 30) return true;
  if (scoreComp >= 60) return n >= 2;
  return n >= 1;
}

// 12.5
function sin_redundancia_excesiva(resultado) {
  const textos = (lista, campo) => (lista || []).map(x => x[campo] || '');

  // test_cases con mismo resultado_esperado
  const resultados = (resultado.test_cases || []).map(tc => (tc.resultado_esperado || '').trim().toLowerCase());
  const setResultados = new Set(resultados.filter(Boolean));
  if (setResultados.size !== resultados.filter(Boolean).length) return false;

  // ambiguedades / criterios muy parecidos
  const grupos = [
    textos(resultado.ambiguedades, 'descripcion'),
    textos(resultado.criterios_aceptacion, 'criterio')
  ];
  for (const g of grupos) {
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        if (similitud(g[i], g[j]) > UMBRAL_REDUNDANCIA) return false;
      }
    }
  }
  return true;
}

// 12.6
function preguntas_refinamiento_utiles(resultado, parser) {
  const preguntas = resultado.preguntas_refinamiento || [];
  if (preguntas.length < 1) return false;

  const genericas = ['hay algo mas', 'algo adicional', 'algo mas?'];
  const señales = [
    ...(parser.entidades_detectadas || []),
    ...(parser.integraciones_detectadas || []),
    ...(parser.roles_detectados || []),
    ...(parser.terminos_vagos || [])
  ].map(s => s.toLowerCase());

  return preguntas.every(p => {
    const texto = (p.pregunta || '').trim();
    if (!texto.endsWith('?')) return false;
    const tl = texto.toLowerCase();
    if (genericas.some(g => tl.includes(g))) return false;
    // Debe referenciar algo de la historia (si hay señales disponibles)
    if (señales.length > 0) {
      return señales.some(s => tl.includes(s));
    }
    return true;
  });
}

// 12.7 — el mas importante
function requiere_refinamiento_humano(checks, scores, classification) {
  if (scores.score_ambiguedad >= 70) return true;
  if (!checks.cobertura_minima) return true;
  if (scores.score_cobertura < 40) return true;
  if (!checks.casos_accionables) return true;
  if (classification?.tipo_primario === 'desconocido') return true;
  return false;
}

function runQualityChecks({ resultado, parser, classification, scores }) {
  const checks = {
    cobertura_minima: cobertura_minima(resultado, scores.score_ambiguedad),
    casos_accionables: casos_accionables(resultado),
    sin_supuestos_no_soportados: sin_supuestos_no_soportados(resultado, parser),
    riesgos_relevantes: riesgos_relevantes(resultado, scores.score_complejidad),
    sin_redundancia_excesiva: sin_redundancia_excesiva(resultado),
    preguntas_refinamiento_utiles: preguntas_refinamiento_utiles(resultado, parser)
  };
  checks.requiere_refinamiento_humano = requiere_refinamiento_humano(checks, scores, classification);
  return checks;
}

module.exports = { runQualityChecks };
