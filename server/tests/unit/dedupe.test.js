import { describe, it, expect } from 'vitest';
import { dedupeCompact, similitud, LIMITES } from '../../src/services/dedupe-compact.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────
const amb = (id, descripcion) => ({ id, descripcion, severidad: 'media', origen: 'local' });
const preg = (id, pregunta) => ({ id, pregunta, origen: 'local' });
const tc = (id, titulo, res = `resultado unico para ${id}`) => ({
  id, titulo, precondiciones: 'precondiciones', pasos: ['paso'], resultado_esperado: res, origen: 'local'
});
const riesgo = (id, desc) => ({ id, descripcion: desc, severidad: 'alta', origen: 'local' });

function makeResultado(overrides = {}) {
  return {
    ambiguedades: [], preguntas_refinamiento: [], criterios_aceptacion: [],
    test_cases: [], negativos_edge_cases: [], riesgos: [],
    ...overrides
  };
}

// ── 1. Similitud function ─────────────────────────────────────────────────
describe('similitud', () => {
  it('returns 1.0 for identical strings', () => {
    expect(similitud('validar monto de transferencia', 'validar monto de transferencia')).toBe(1);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(similitud('', '')).toBe(1);
  });

  it('returns 0 when one string is empty', () => {
    expect(similitud('algo importante', '')).toBe(0);
  });

  it('returns a value between 0 and 1 for partially similar strings', () => {
    const s = similitud('validar monto de transferencia bancaria', 'validar el monto de la transaccion');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it('returns low similarity for unrelated strings', () => {
    const s = similitud('autenticacion con token jwt', 'listado de productos del catalogo');
    expect(s).toBeLessThan(0.2);
  });

  it('is symmetric', () => {
    const a = 'error al validar el monto';
    const b = 'validacion del monto con error';
    expect(similitud(a, b)).toBeCloseTo(similitud(b, a), 10);
  });
});

// ── 2. Exact duplicate removal ────────────────────────────────────────────
describe('dedupeCompact — exact duplicates', () => {
  it('removes exact duplicate ambiguedades', () => {
    const r = makeResultado({
      ambiguedades: [
        amb('AMB-001', 'Actor no identificado en la historia'),
        amb('AMB-002', 'Actor no identificado en la historia')
      ]
    });
    const out = dedupeCompact(r, {});
    expect(out.ambiguedades).toHaveLength(1);
  });

  it('removes near-duplicate descriptions with very high overlap', () => {
    // These share 5/5 meaningful tokens → Jaccard well above 0.80
    const r = makeResultado({
      preguntas_refinamiento: [
        preg('PRE-001', 'Que validaciones aplican al campo de entrada del formulario?'),
        preg('PRE-002', 'Que validaciones aplican al campo de entrada del formulario y sus datos?')
      ]
    });
    const out = dedupeCompact(r, {});
    expect(out.preguntas_refinamiento).toHaveLength(1);
  });

  it('keeps non-similar items', () => {
    const r = makeResultado({
      ambiguedades: [
        amb('AMB-001', 'Actor no identificado'),
        amb('AMB-002', 'No se definen flujos de error en la transaccion'),
        amb('AMB-003', 'Objetivo de la historia no explicito')
      ]
    });
    const out = dedupeCompact(r, {});
    expect(out.ambiguedades).toHaveLength(3);
  });

  it('keeps the larger item when deduplicating', () => {
    const short = amb('AMB-001', 'Actor no identificado');
    const long  = { ...amb('AMB-002', 'Actor no identificado'), detalle: 'informacion adicional relevante' };
    const r = makeResultado({ ambiguedades: [short, long] });
    const out = dedupeCompact(r, {});
    expect(out.ambiguedades[0].id).toBe('AMB-002');
  });
});

// ── 3. Limit enforcement ──────────────────────────────────────────────────
describe('dedupeCompact — limits', () => {
  it(`enforces LIMITES.ambiguedades (max ${LIMITES.ambiguedades})`, () => {
    const ambs = Array.from({ length: LIMITES.ambiguedades + 4 }, (_, i) =>
      amb(`AMB-${i}`, `Ambiguedad totalmente diferente sobre aspecto especifico numero ${i} con contexto ${i * 7}`)
    );
    const out = dedupeCompact(makeResultado({ ambiguedades: ambs }), {});
    expect(out.ambiguedades.length).toBeLessThanOrEqual(LIMITES.ambiguedades);
  });

  it(`enforces LIMITES.test_cases (max ${LIMITES.test_cases})`, () => {
    const tcs = Array.from({ length: LIMITES.test_cases + 4 }, (_, i) =>
      tc(`TC-${i}`, `Caso de prueba especifico sobre flujo diferente numero ${i}`, `Resultado especifico distinto ${i}`)
    );
    const out = dedupeCompact(makeResultado({ test_cases: tcs }), {});
    expect(out.test_cases.length).toBeLessThanOrEqual(LIMITES.test_cases);
  });

  it(`enforces LIMITES.riesgos (max ${LIMITES.riesgos})`, () => {
    const riesgos = Array.from({ length: LIMITES.riesgos + 4 }, (_, i) =>
      riesgo(`RSK-${i}`, `Riesgo de seguridad con impacto distinto en el sistema numero ${i} con contexto diferente`)
    );
    const out = dedupeCompact(makeResultado({ riesgos }), {});
    expect(out.riesgos.length).toBeLessThanOrEqual(LIMITES.riesgos);
  });
});

// ── 4. Output shape ───────────────────────────────────────────────────────
describe('dedupeCompact — output shape', () => {
  it('always returns all 6 required blocks', () => {
    const out = dedupeCompact(makeResultado(), {});
    for (const key of Object.keys(LIMITES)) {
      expect(out).toHaveProperty(key);
      expect(out[key]).toBeInstanceOf(Array);
    }
  });
});

// ── 5. Edge cases ─────────────────────────────────────────────────────────
describe('dedupeCompact — edge cases', () => {
  it('handles null/undefined blocks gracefully', () => {
    const r = {
      ambiguedades: null, preguntas_refinamiento: undefined,
      criterios_aceptacion: [], test_cases: null,
      negativos_edge_cases: [], riesgos: undefined
    };
    expect(() => dedupeCompact(r, {})).not.toThrow();
    expect(dedupeCompact(r, {}).ambiguedades).toBeInstanceOf(Array);
  });

  it('throws when parser is null (programming error — not valid input)', () => {
    const r = makeResultado({ ambiguedades: [amb('AMB-001', 'Algo')] });
    // null parser is a caller error; dedupeCompact requires an object
    expect(() => dedupeCompact(r, null)).toThrow();
  });

  it('handles empty parser object gracefully', () => {
    const r = makeResultado({ ambiguedades: [amb('AMB-001', 'Algo')] });
    expect(() => dedupeCompact(r, {})).not.toThrow();
  });
});
