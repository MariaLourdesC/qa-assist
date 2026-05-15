// scoring.service.js
// Calcula scores de ambiguedad, cobertura y complejidad segun spec §10.

function topar(n, max = 100) {
  return Math.min(max, Math.max(0, n));
}

// =========================
// 10.1 Score de Ambiguedad
// =========================
function scoreAmbiguedad(parser) {
  const b = parser.banderas || {};
  let score = 0;

  if (!b.tiene_actor) score += 15;
  if (!b.tiene_accion) score += 15;
  if (!b.tiene_objetivo) score += 10;

  const puntosVagos = Math.min(25, (parser.terminos_vagos?.length || 0) * 5);
  score += puntosVagos;

  if (!b.tiene_validaciones) score += 10;
  if (!b.tiene_errores) score += 10;
  if ((parser.roles_detectados?.length || 0) === 0) score += 8;
  if ((parser.restricciones_detectadas?.length || 0) === 0) score += 7;

  return topar(score);
}

// =========================
// 10.2 Score de Cobertura
// =========================
function scoreCobertura(resultado, scoreAmbig, classification) {
  let score = 0;

  if (scoreAmbig >= 20 && (resultado.ambiguedades?.length || 0) >= 1) score += 10;
  if ((resultado.preguntas_refinamiento?.length || 0) >= 2) score += 10;
  if ((resultado.criterios_aceptacion?.length || 0) >= 3) score += 15;
  if ((resultado.test_cases?.length || 0) >= 3) score += 20;
  if ((resultado.negativos_edge_cases?.length || 0) >= 2) score += 15;
  if ((resultado.riesgos?.length || 0) >= 1) score += 10;

  const testCasesCompletos = (resultado.test_cases || []).every(tc =>
    tc.precondiciones && Array.isArray(tc.pasos) && tc.pasos.length > 0 && tc.resultado_esperado
  );
  if (testCasesCompletos && (resultado.test_cases?.length || 0) > 0) score += 10;

  if ((classification?.confianza || 0) >= 0.7) score += 10;

  return topar(score);
}

// =========================
// 10.3 Score de Complejidad
// =========================
function scoreComplejidad(parser, classification) {
  let score = 0;

  const integraciones = parser.integraciones_detectadas?.length || 0;
  score += Math.min(36, integraciones * 12);

  const entidades = parser.entidades_detectadas?.length || 0;
  if (entidades >= 3) {
    score += Math.min(25, (entidades - 2) * 5);
  }

  const roles = parser.roles_detectados?.length || 0;
  if (roles >= 2) {
    score += Math.min(24, (roles - 1) * 8);
  }

  const tipo = classification?.tipo_primario;
  if (tipo === 'transaccion') score += 15;
  if (tipo === 'autenticacion' || classification?.subtipos?.includes('autenticacion')) score += 10;

  const textoPlano = JSON.stringify(parser).toLowerCase();
  if (/\b(concurren|concurrencia|paralelo|race|estado|transicion)\b/.test(textoPlano)) {
    score += 12;
  }

  const restricciones = parser.restricciones_detectadas?.length || 0;
  score += Math.min(20, restricciones * 5);

  return topar(score);
}

function calculateScores({ parser, classification, resultado }) {
  const ambiguedad = scoreAmbiguedad(parser);
  const cobertura = scoreCobertura(resultado, ambiguedad, classification);
  const complejidad = scoreComplejidad(parser, classification);
  return {
    score_ambiguedad: ambiguedad,
    score_cobertura: cobertura,
    score_complejidad: complejidad
  };
}

module.exports = { calculateScores, scoreAmbiguedad, scoreCobertura, scoreComplejidad };
