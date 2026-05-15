import { describe, it, expect } from 'vitest';
import { runQualityChecks } from '../../src/services/quality-checks.service.js';

// ── Fixture builders ──────────────────────────────────────────────────────
const goodTC = (id, res) => ({
  id,
  titulo: `TC-${id}`,
  precondiciones: 'Usuario autenticado con cuenta activa',
  pasos: ['Ingresar monto valido', 'Confirmar operacion'],
  // Each TC has a unique resultado_esperado to avoid sin_redundancia failure
  resultado_esperado: res ?? `El sistema procesa la transaccion ${id} y emite comprobante especifico`
});

function goodResultado() {
  return {
    ambiguedades: [{ id: 'AMB-001', descripcion: 'Actor no definido' }],
    preguntas_refinamiento: [
      { id: 'PRE-001', pregunta: 'Cual es el monto maximo de transferencia de cuenta?' },
      { id: 'PRE-002', pregunta: 'Que ocurre si el saldo de la cuenta es insuficiente?' }
    ],
    criterios_aceptacion: [
      { id: 'CA-001', criterio: 'El sistema valida el monto antes de debitar la cuenta' },
      { id: 'CA-002', criterio: 'El sistema notifica al cliente tras cada transferencia' },
      { id: 'CA-003', criterio: 'La operacion de transferencia es idempotente' }
    ],
    test_cases: [goodTC('TC-001'), goodTC('TC-002'), goodTC('TC-003')],
    negativos_edge_cases: [
      { id: 'EC-001', descripcion: 'Transferencia con saldo exactamente en el limite de cuenta' },
      { id: 'EC-002', descripcion: 'Timeout del procesador externo durante la transferencia' }
    ],
    riesgos: [
      { id: 'RSK-001', descripcion: 'Duplicacion de cargos en la cuenta sin idempotencia', severidad: 'alta' },
      { id: 'RSK-002', descripcion: 'Fallo de la pasarela durante transferencia', severidad: 'media' }
    ]
  };
}

function goodParser() {
  return {
    entidades_detectadas:    ['transferencia', 'cuenta'],
    integraciones_detectadas: ['pasarela'],
    roles_detectados:        ['cliente'],
    terminos_vagos:          []
  };
}

function goodClassification() {
  return { tipo_primario: 'transaccion', confianza: 0.8, subtipos: [] };
}

function goodScores() {
  return { score_ambiguedad: 30, score_cobertura: 75, score_complejidad: 40 };
}

// ── 1. All checks pass ────────────────────────────────────────────────────
describe('runQualityChecks — all passing', () => {
  const args = {
    resultado: goodResultado(), parser: goodParser(),
    classification: goodClassification(), scores: goodScores()
  };
  const checks = runQualityChecks(args);

  it('cobertura_minima passes with ≥3 TC, ≥2 CA, ≥1 AMB', () => {
    expect(checks.cobertura_minima).toBe(true);
  });

  it('casos_accionables passes when all TCs have precond + steps + result', () => {
    expect(checks.casos_accionables).toBe(true);
  });

  it('sin_supuestos_no_soportados passes when no undeclared integrations', () => {
    expect(checks.sin_supuestos_no_soportados).toBe(true);
  });

  it('riesgos_relevantes passes with enough risks for complexity', () => {
    expect(checks.riesgos_relevantes).toBe(true);
  });

  it('sin_redundancia_excesiva passes with unique resultado_esperado per TC', () => {
    expect(checks.sin_redundancia_excesiva).toBe(true);
  });

  it('preguntas_refinamiento_utiles passes with signal-referencing questions ending in ?', () => {
    expect(checks.preguntas_refinamiento_utiles).toBe(true);
  });

  it('requiere_refinamiento_humano is false when everything is ok', () => {
    expect(checks.requiere_refinamiento_humano).toBe(false);
  });
});

// ── 2. Individual check failures ──────────────────────────────────────────
describe('runQualityChecks — individual failures', () => {
  const base = { parser: goodParser(), classification: goodClassification(), scores: goodScores() };

  it('cobertura_minima fails with <3 test cases', () => {
    const r = { ...goodResultado(), test_cases: [goodTC('TC-001'), goodTC('TC-002')] };
    expect(runQualityChecks({ ...base, resultado: r }).cobertura_minima).toBe(false);
  });

  it('cobertura_minima fails with <2 criterios', () => {
    const r = { ...goodResultado(), criterios_aceptacion: [{ id: 'CA-001', criterio: 'Solo uno' }] };
    expect(runQualityChecks({ ...base, resultado: r }).cobertura_minima).toBe(false);
  });

  it('casos_accionables fails when a TC has empty precondiciones', () => {
    const bad = { ...goodTC('BAD'), precondiciones: '' };
    const r = { ...goodResultado(), test_cases: [goodTC('TC-001'), goodTC('TC-002'), bad] };
    expect(runQualityChecks({ ...base, resultado: r }).casos_accionables).toBe(false);
  });

  it('casos_accionables fails when a TC has empty pasos', () => {
    const bad = { ...goodTC('BAD'), pasos: [] };
    const r = { ...goodResultado(), test_cases: [goodTC('TC-001'), goodTC('TC-002'), bad] };
    expect(runQualityChecks({ ...base, resultado: r }).casos_accionables).toBe(false);
  });

  it('casos_accionables fails with non-actionable result ("funciona correctamente")', () => {
    const bad = { ...goodTC('BAD'), resultado_esperado: 'El sistema funciona correctamente' };
    const r = { ...goodResultado(), test_cases: [goodTC('TC-001'), goodTC('TC-002'), bad] };
    expect(runQualityChecks({ ...base, resultado: r }).casos_accionables).toBe(false);
  });

  it('sin_supuestos fails when undeclared integration is mentioned in test cases', () => {
    const bad = { ...goodTC('BAD'), resultado_esperado: 'El pago via stripe es procesado correctamente' };
    const r = { ...goodResultado(), test_cases: [goodTC('TC-001'), goodTC('TC-002'), bad] };
    expect(runQualityChecks({ ...base, resultado: r }).sin_supuestos_no_soportados).toBe(false);
  });

  it('sin_redundancia fails when two TCs share identical resultado_esperado', () => {
    const same = 'El sistema completa la operacion con exito';
    const tc1 = { ...goodTC('TC-001'), resultado_esperado: same };
    const tc2 = { ...goodTC('TC-002'), resultado_esperado: same };
    const r = { ...goodResultado(), test_cases: [tc1, tc2, goodTC('TC-003')] };
    expect(runQualityChecks({ ...base, resultado: r }).sin_redundancia_excesiva).toBe(false);
  });

  it('preguntas_refinamiento_utiles fails when question lacks question mark', () => {
    const r = {
      ...goodResultado(),
      preguntas_refinamiento: [{ id: 'PRE-001', pregunta: 'Cual es el monto maximo' }]
    };
    expect(runQualityChecks({ ...base, resultado: r }).preguntas_refinamiento_utiles).toBe(false);
  });
});

// ── 3. requiere_refinamiento_humano triggers ──────────────────────────────
describe('runQualityChecks — requiere_refinamiento_humano', () => {
  const base = { parser: goodParser(), classification: goodClassification() };

  it('triggers when score_ambiguedad >= 70', () => {
    const c = runQualityChecks({ ...base, resultado: goodResultado(), scores: { ...goodScores(), score_ambiguedad: 70 } });
    expect(c.requiere_refinamiento_humano).toBe(true);
  });

  it('triggers when score_cobertura < 40', () => {
    const c = runQualityChecks({ ...base, resultado: goodResultado(), scores: { ...goodScores(), score_cobertura: 35 } });
    expect(c.requiere_refinamiento_humano).toBe(true);
  });

  it('triggers when tipo_primario is desconocido', () => {
    const c = runQualityChecks({
      ...base, resultado: goodResultado(), scores: goodScores(),
      classification: { tipo_primario: 'desconocido', confianza: 0 }
    });
    expect(c.requiere_refinamiento_humano).toBe(true);
  });

  it('does not trigger when all conditions are within bounds', () => {
    const c = runQualityChecks({ ...base, resultado: goodResultado(), scores: goodScores() });
    expect(c.requiere_refinamiento_humano).toBe(false);
  });
});

// ── 3b. riesgos_relevantes branches ──────────────────────────────────────
describe('runQualityChecks — riesgos_relevantes branches', () => {
  const base = { parser: goodParser(), classification: goodClassification() };

  it('passes when complexity < 30 even with 0 riesgos', () => {
    const c = runQualityChecks({
      ...base,
      resultado: { ...goodResultado(), riesgos: [] },
      scores: { ...goodScores(), score_complejidad: 20 }
    });
    expect(c.riesgos_relevantes).toBe(true);
  });

  it('fails when complexity >= 60 and riesgos < 2', () => {
    const c = runQualityChecks({
      ...base,
      resultado: { ...goodResultado(), riesgos: [{ id: 'RSK-001', descripcion: 'Solo uno', severidad: 'alta' }] },
      scores: { ...goodScores(), score_complejidad: 65 }
    });
    expect(c.riesgos_relevantes).toBe(false);
  });

  it('passes when 30 <= complexity < 60 with at least 1 riesgo', () => {
    const c = runQualityChecks({
      ...base,
      resultado: { ...goodResultado(), riesgos: [{ id: 'RSK-001', descripcion: 'Un riesgo', severidad: 'alta' }] },
      scores: { ...goodScores(), score_complejidad: 45 }
    });
    expect(c.riesgos_relevantes).toBe(true);
  });
});

// ── 4. Output shape ───────────────────────────────────────────────────────
describe('runQualityChecks — output shape', () => {
  it('always returns all 7 boolean checks', () => {
    const c = runQualityChecks({
      resultado: goodResultado(), parser: goodParser(),
      classification: goodClassification(), scores: goodScores()
    });
    const keys = [
      'cobertura_minima', 'casos_accionables', 'sin_supuestos_no_soportados',
      'riesgos_relevantes', 'sin_redundancia_excesiva',
      'preguntas_refinamiento_utiles', 'requiere_refinamiento_humano'
    ];
    for (const k of keys) {
      expect(typeof c[k], `${k} should be boolean`).toBe('boolean');
    }
  });
});
