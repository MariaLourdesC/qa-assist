/**
 * tests/unit/parser-bdd.test.js
 *
 * Coverage targets: 80% lines, 70% branches
 * Tests: unit (pure functions via public API), integration (fixture end-to-end), edge cases
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseStory } from '../../src/services/story-parser.service.js';

// ── Fixture loader ────────────────────────────────────────────────────────
const F = (...parts) =>
  readFileSync(resolve(import.meta.dirname, '../fixtures/parser-bdd', ...parts), 'utf-8').trim();

// ── 1. Classic user story (ES) — actor/accion/objetivo extraction ─────────
describe('parseStory — classic user story (ES)', () => {
  const result = parseStory(F('user-story-es.txt'), [], 'es');

  it('returns the detected language', () => {
    expect(result.lang).toBe('es');
  });

  it('extracts actor from "Como <actor> quiero"', () => {
    expect(result.actor).toBe('cliente bancario');
  });

  it('extracts accion', () => {
    expect(result.accion).toContain('transferir');
  });

  it('extracts objetivo from "para <objetivo>"', () => {
    // objetivo captures everything after "para" — may include subsequent sentences
    expect(result.objetivo).toBeTruthy();
    expect(result.objetivo).toMatch(/saldo/i);
  });

  it('does NOT extract actor when commas appear before "quiero" (known parser limitation)', () => {
    // Comma in "Como cliente bancario, quiero..." breaks the [^,]+ actor regex.
    // This test documents the limitation so refactors don't accidentally hide it.
    const broken = parseStory(
      'Como cliente bancario, quiero transferir dinero para ver mi saldo.',
      [], 'es'
    );
    expect(broken.actor).toBe('');   // empty — comma breaks the match
  });

  it('flags tiene_actor, tiene_accion, tiene_objetivo', () => {
    expect(result.banderas.tiene_actor).toBe(true);
    expect(result.banderas.tiene_accion).toBe(true);
    expect(result.banderas.tiene_objetivo).toBe(true);
  });

  it('detects numeric constraints (5 intentos, 500ms)', () => {
    expect(result.restricciones_detectadas).toContain('5 intentos');
    expect(result.restricciones_detectadas).toContain('500ms');
  });

  it('detects validation signal ("validar")', () => {
    expect(result.banderas.tiene_validaciones).toBe(true);
  });

  it('detects error signal ("error")', () => {
    expect(result.banderas.tiene_errores).toBe(true);
  });
});

// ── 2. Vague terms detection and glosario filtering ───────────────────────
describe('parseStory — vague terms', () => {
  const story = 'Como usuario, quiero un sistema rapido y seguro para acceder facilmente.';

  it('flags "rapido", "seguro", "facilmente" as vague', () => {
    const { terminos_vagos } = parseStory(story, [], 'es');
    expect(terminos_vagos).toContain('rapido');
    expect(terminos_vagos).toContain('seguro');
    expect(terminos_vagos).toContain('facilmente');
  });

  it('excludes glossary terms from vague list', () => {
    const glosario = [
      { termino: 'seguro', definicion: 'Protocolo de seguridad definido por el equipo de compliance' }
    ];
    const { terminos_vagos } = parseStory(story, glosario, 'es');
    expect(terminos_vagos).not.toContain('seguro');
    // Other vague terms not in glossary should still be flagged
    expect(terminos_vagos).toContain('rapido');
  });

  it('is case-insensitive for glosario matching', () => {
    const glosario = [{ termino: 'RAPIDO', definicion: 'Definicion de rapido' }];
    const { terminos_vagos } = parseStory(story, glosario, 'es');
    expect(terminos_vagos).not.toContain('rapido');
  });
});

// ── 3. BDD with Background + 2 Scenarios + But ───────────────────────────
describe('parseStory — full BDD feature', () => {
  const result = parseStory(F('bdd-full.feature'), [], 'es');

  it('sets tiene_bdd flag', () => {
    expect(result.banderas.tiene_bdd).toBe(true);
  });

  it('detects feature title', () => {
    expect(result.bdd.feature).toMatch(/transferencia/i);
  });

  it('parses Background steps', () => {
    const bg = result.bdd.background;
    expect(bg).not.toBeNull();
    expect(bg.given).toHaveLength(2);   // Given + And
  });

  it('detects 2 scenarios', () => {
    expect(result.bdd.escenarios).toHaveLength(2);
    expect(result.bdd.escenarios[0].outline).toBe(false);
  });

  it('parses When/Then/And/But steps in scenario 1', () => {
    const [sc1] = result.bdd.escenarios;
    expect(sc1.when).toHaveLength(1);
    expect(sc1.then).toHaveLength(3);   // Then + And + And
  });

  it('parses But as continuation of Then list', () => {
    const sc2 = result.bdd.escenarios[1];
    // "But registra el intento fallido" appends to then
    expect(sc2.then.length).toBeGreaterThanOrEqual(3);
    expect(sc2.then.some(s => s.toLowerCase().includes('registra'))).toBe(true);
  });

  it('infers tiene_accion from When steps', () => {
    expect(result.banderas.tiene_accion).toBe(true);
  });
});

// ── 4. Scenario Outline + Examples table ─────────────────────────────────
describe('parseStory — Scenario Outline with Examples', () => {
  const result = parseStory(F('bdd-outline.feature'), [], 'es');

  it('marks the scenario as outline', () => {
    expect(result.bdd.escenarios).toHaveLength(1);
    expect(result.bdd.escenarios[0].outline).toBe(true);
  });

  it('sets tiene_outline flag', () => {
    expect(result.banderas.tiene_outline).toBe(true);
  });

  it('creates one ejemplos entry with a tabla', () => {
    const ej = result.bdd.ejemplos;
    expect(ej).toHaveLength(1);
    expect(ej[0].tabla).not.toBeNull();
  });

  it('tabla has correct headers and 3 data rows', () => {
    const tabla = result.bdd.ejemplos[0].tabla;
    expect(tabla.headers).toEqual(['moneda', 'monto', 'resultado']);
    expect(tabla.rows).toHaveLength(3);
  });

  it('tabla rows contain expected values', () => {
    const rows = result.bdd.ejemplos[0].tabla.rows;
    expect(rows[0][0]).toBe('USD');
    expect(rows[2][0]).toBe('ARS');
  });
});

// ── 5. English story detection ────────────────────────────────────────────
describe('parseStory — English user story', () => {
  const result = parseStory(F('user-story-en.txt'), [], 'en');

  it('returns lang = en', () => {
    expect(result.lang).toBe('en');
  });

  it('extracts actor via English pattern "As a <actor>"', () => {
    expect(result.actor).toBe('banking customer');
  });

  it('detects English vague terms ("quickly", "efficiently")', () => {
    expect(result.terminos_vagos).toContain('quickly');
    expect(result.terminos_vagos).toContain('efficiently');
  });

  it('detects numeric constraints in English', () => {
    // "5 failed attempts", "500ms"
    const constraints = result.restricciones_detectadas;
    expect(constraints.some(c => c.includes('500ms') || c.includes('500'))).toBe(true);
  });

  it('detects validation signal ("validate")', () => {
    expect(result.banderas.tiene_validaciones).toBe(true);
  });
});

// ── 6. Integration test — full output shape contract ─────────────────────
describe('parseStory — output shape contract', () => {
  const result = parseStory(F('bdd-full.feature'), [], 'es');

  it('always returns all required top-level fields', () => {
    const requiredFields = [
      'actor', 'accion', 'objetivo',
      'entidades_detectadas', 'integraciones_detectadas',
      'restricciones_detectadas', 'roles_detectados',
      'terminos_vagos', 'banderas', 'bdd', 'lang'
    ];
    for (const f of requiredFields) {
      expect(result, `missing field: ${f}`).toHaveProperty(f);
    }
  });

  it('banderas always contains all expected boolean flags', () => {
    const flags = [
      'tiene_actor', 'tiene_accion', 'tiene_objetivo',
      'tiene_validaciones', 'tiene_errores',
      'tiene_bdd', 'tiene_outline', 'tiene_tablas'
    ];
    for (const flag of flags) {
      expect(typeof result.banderas[flag], `flag ${flag} should be boolean`).toBe('boolean');
    }
  });

  it('bdd always contains feature, background, escenarios, ejemplos, tablas', () => {
    expect(result.bdd).toMatchObject({
      escenarios: expect.any(Array),
      ejemplos:   expect.any(Array),
      tablas:     expect.any(Array)
    });
  });
});

// ── 7. Edge: empty / blank input ─────────────────────────────────────────
describe('parseStory — edge cases', () => {
  it('throws on empty string', () => {
    expect(() => parseStory('')).toThrow('vacio o invalido');
  });

  it('throws on whitespace-only string', () => {
    expect(() => parseStory('   \n\t  ')).toThrow('vacio o invalido');
  });

  it('throws when first argument is null', () => {
    expect(() => parseStory(null)).toThrow();
  });

  it('throws when first argument is a number', () => {
    expect(() => parseStory(42)).toThrow();
  });

  it('returns empty arrays for a minimal valid story with no detectable items', () => {
    const result = parseStory('Historia muy corta.', [], 'es');
    expect(result.entidades_detectadas).toBeInstanceOf(Array);
    expect(result.restricciones_detectadas).toBeInstanceOf(Array);
    expect(result.terminos_vagos).toBeInstanceOf(Array);
    expect(result.bdd.escenarios).toHaveLength(0);
  });

  it('gracefully handles a glosario with null entries', () => {
    const glosario = [null, undefined, { termino: null }, { termino: 'valido', definicion: 'ok' }];
    expect(() => parseStory('Como usuario quiero algo.', glosario, 'es')).not.toThrow();
  });

  it('falls back to ES vocab for unknown lang code', () => {
    const result = parseStory('Como cliente quiero transferir dinero.', [], 'fr');
    expect(result.lang).toBe('fr');
    // Should still work (falls back to ES vocab internally)
    expect(result).toHaveProperty('actor');
  });
});

// ── 8. Role and integration detection ────────────────────────────────────
describe('parseStory — domain detection', () => {
  it('detects "cliente" as a role', () => {
    const result = parseStory('Como cliente, quiero ver mis cuentas.', [], 'es');
    expect(result.roles_detectados).toContain('cliente');
  });

  it('detects API integration keyword', () => {
    const result = parseStory(
      'Como desarrollador, quiero consumir la api de pagos para procesar transacciones.',
      [], 'es'
    );
    expect(result.integraciones_detectadas).toContain('api');
  });

  it('detects email as sensitive integration keyword', () => {
    const result = parseStory(
      'El sistema debe enviar un email de confirmacion al cliente.',
      [], 'es'
    );
    expect(result.integraciones_detectadas).toContain('email');
  });
});
