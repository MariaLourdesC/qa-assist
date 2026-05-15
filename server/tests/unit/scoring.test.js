import { describe, it, expect } from 'vitest';
import {
  calculateScores,
  scoreAmbiguedad,
  scoreCobertura,
  scoreComplejidad
} from '../../src/services/scoring.service.js';

// ── Fixture builders ──────────────────────────────────────────────────────
function parser({
  tiene_actor = true, tiene_accion = true, tiene_objetivo = true,
  tiene_validaciones = true, tiene_errores = true,
  terminos_vagos = [], roles_detectados = ['cliente'],
  restricciones_detectadas = ['100ms'],
  entidades_detectadas = [], integraciones_detectadas = []
} = {}) {
  return {
    banderas: { tiene_actor, tiene_accion, tiene_objetivo, tiene_validaciones, tiene_errores },
    terminos_vagos,
    roles_detectados,
    restricciones_detectadas,
    entidades_detectadas,
    integraciones_detectadas
  };
}

function classification({ tipo_primario = 'transaccion', confianza = 0.8, subtipos = [] } = {}) {
  return { tipo_primario, confianza, subtipos };
}

function resultado({
  nAmb = 3, nPre = 3, nCA = 4, nTC = 4, nEdge = 3, nRisk = 2, tcComplete = true
} = {}) {
  const tc = (id) => ({
    id,
    titulo: `TC-${id}`,
    precondiciones: 'precondiciones definidas',
    pasos: ['paso 1', 'paso 2'],
    resultado_esperado: tcComplete ? 'el sistema aprueba y notifica al usuario' : 'funciona'
  });
  return {
    ambiguedades:           Array.from({ length: nAmb }, (_, i) => ({ id: `AMB-${i}`, descripcion: `Ambiguedad ${i}` })),
    preguntas_refinamiento: Array.from({ length: nPre }, (_, i) => ({ id: `PRE-${i}`, pregunta: `Pregunta ${i}?` })),
    criterios_aceptacion:   Array.from({ length: nCA },  (_, i) => ({ id: `CA-${i}`, criterio: `Criterio ${i}` })),
    test_cases:             Array.from({ length: nTC },  (_, i) => tc(`TC-${i}`)),
    negativos_edge_cases:   Array.from({ length: nEdge }, (_, i) => ({ id: `EC-${i}`, descripcion: `Edge ${i}` })),
    riesgos:               Array.from({ length: nRisk }, (_, i) => ({ id: `RSK-${i}`, descripcion: `Riesgo ${i}` }))
  };
}

// ── 1. scoreAmbiguedad ────────────────────────────────────────────────────
describe('scoreAmbiguedad', () => {
  it('returns 0 when story is fully specified', () => {
    const score = scoreAmbiguedad(parser());
    expect(score).toBe(0);
  });

  it('adds 15 for missing actor', () => {
    const score = scoreAmbiguedad(parser({ tiene_actor: false }));
    expect(score).toBe(15);
  });

  it('adds 15 for missing accion', () => {
    const score = scoreAmbiguedad(parser({ tiene_accion: false }));
    expect(score).toBe(15);
  });

  it('adds 10 for missing objetivo', () => {
    const score = scoreAmbiguedad(parser({ tiene_objetivo: false }));
    expect(score).toBe(10);
  });

  it('adds 5 per vague term, capped at 25', () => {
    const withVague3  = scoreAmbiguedad(parser({ terminos_vagos: ['a', 'b', 'c'] }));
    const withVague10 = scoreAmbiguedad(parser({ terminos_vagos: Array(10).fill('x') }));
    expect(withVague3).toBe(15);   // 3 × 5
    expect(withVague10).toBe(25);  // capped at 25
  });

  it('is capped at 100', () => {
    const score = scoreAmbiguedad(parser({
      tiene_actor: false, tiene_accion: false, tiene_objetivo: false,
      tiene_validaciones: false, tiene_errores: false,
      terminos_vagos: Array(10).fill('x'),
      roles_detectados: [], restricciones_detectadas: []
    }));
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(0);
  });
});

// ── 2. scoreCobertura ─────────────────────────────────────────────────────
describe('scoreCobertura', () => {
  it('returns 0 when resultado is empty and classification confidence is low', () => {
    // High confianza adds 10 pts even with empty resultado — use low confidence
    const score = scoreCobertura(
      resultado({ nAmb: 0, nPre: 0, nCA: 0, nTC: 0, nEdge: 0, nRisk: 0 }),
      50,
      classification({ confianza: 0.2 })   // below 0.7 threshold
    );
    expect(score).toBe(0);
  });

  it('awards points for each threshold met', () => {
    // Everything ≥ threshold — should score high
    const score = scoreCobertura(resultado(), 50, classification({ confianza: 0.9 }));
    expect(score).toBeGreaterThan(60);
  });

  it('awards bonus when test_cases have all fields non-empty', () => {
    // scoreCobertura checks: precondiciones && pasos.length > 0 && resultado_esperado truthy
    // Use low confianza to stay below 100 cap, and TCs that differ only in resultado_esperado
    const cls = classification({ confianza: 0.2 });

    function makeRawResultado(resultadoEsperado) {
      const tc = (id) => ({
        id, titulo: `TC-${id}`, precondiciones: 'precond',
        pasos: ['step'], resultado_esperado: resultadoEsperado
      });
      return {
        ambiguedades:           [{ id: 'a' }],
        preguntas_refinamiento: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
        criterios_aceptacion:   [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }],
        test_cases:             [tc('1'), tc('2'), tc('3'), tc('4')],
        negativos_edge_cases:   [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
        riesgos:               [{ id: 'r1' }, { id: 'r2' }]
      };
    }

    const withComplete   = scoreCobertura(makeRawResultado('El sistema aprueba la transaccion'), 50, cls);
    const withIncomplete = scoreCobertura(makeRawResultado(''), 50, cls);  // empty resultado_esperado → not complete
    expect(withComplete).toBeGreaterThan(withIncomplete);
  });

  it('awards bonus for high classification confidence', () => {
    const highConf = scoreCobertura(resultado(), 50, classification({ confianza: 0.8 }));
    const lowConf  = scoreCobertura(resultado(), 50, classification({ confianza: 0.2 }));
    expect(highConf).toBeGreaterThan(lowConf);
  });

  it('is capped at 100', () => {
    const score = scoreCobertura(resultado(), 80, classification({ confianza: 0.99 }));
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── 3. scoreComplejidad ───────────────────────────────────────────────────
describe('scoreComplejidad', () => {
  it('returns 0 for a simple story with no integrations or entities', () => {
    const score = scoreComplejidad(
      parser({ integraciones_detectadas: [], entidades_detectadas: [], restricciones_detectadas: [] }),
      classification({ tipo_primario: 'crud', subtipos: [] })
    );
    expect(score).toBe(0);
  });

  it('adds 12 per integration (up to 3)', () => {
    const score = scoreComplejidad(
      parser({ integraciones_detectadas: ['stripe', 'kafka', 'sqs', 'redis'], restricciones_detectadas: [] }),
      classification({ tipo_primario: 'formulario', subtipos: [] })
    );
    expect(score).toBe(36);   // capped at 36 = 3 × 12
  });

  it('adds 15 for transaccion type', () => {
    const base = scoreComplejidad(
      parser({ integraciones_detectadas: [], entidades_detectadas: [], restricciones_detectadas: [] }),
      classification({ tipo_primario: 'formulario', subtipos: [] })
    );
    const withTx = scoreComplejidad(
      parser({ integraciones_detectadas: [], entidades_detectadas: [], restricciones_detectadas: [] }),
      classification({ tipo_primario: 'transaccion', subtipos: [] })
    );
    expect(withTx - base).toBe(15);
  });

  it('is capped at 100', () => {
    const score = scoreComplejidad(
      parser({
        integraciones_detectadas: ['a', 'b', 'c', 'd'],
        entidades_detectadas: Array(20).fill('entity'),
        roles_detectados: Array(10).fill('role'),
        restricciones_detectadas: Array(10).fill('constraint')
      }),
      classification({ tipo_primario: 'transaccion', subtipos: ['autenticacion'] })
    );
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── 4. calculateScores integration ───────────────────────────────────────
describe('calculateScores — combined', () => {
  it('returns all three score fields', () => {
    const scores = calculateScores({
      parser: parser(),
      classification: classification(),
      resultado: resultado()
    });
    expect(scores).toHaveProperty('score_ambiguedad');
    expect(scores).toHaveProperty('score_cobertura');
    expect(scores).toHaveProperty('score_complejidad');
  });

  it('all scores are integers between 0 and 100', () => {
    const scores = calculateScores({
      parser: parser(),
      classification: classification(),
      resultado: resultado()
    });
    for (const key of ['score_ambiguedad', 'score_cobertura', 'score_complejidad']) {
      expect(scores[key]).toBeGreaterThanOrEqual(0);
      expect(scores[key]).toBeLessThanOrEqual(100);
      expect(Number.isInteger(scores[key])).toBe(true);
    }
  });

  it('missing-everything parser → high ambiguedad score', () => {
    const scores = calculateScores({
      parser: parser({
        tiene_actor: false, tiene_accion: false, tiene_objetivo: false,
        tiene_validaciones: false, tiene_errores: false,
        terminos_vagos: ['rapido', 'seguro', 'facil'],
        roles_detectados: [], restricciones_detectadas: []
      }),
      classification: classification(),
      resultado: resultado()
    });
    expect(scores.score_ambiguedad).toBeGreaterThan(50);
  });
});
