/**
 * Full pipeline integration test.
 * Runs all 6 services in sequence on a realistic BDD fixture and asserts
 * on shape, consistency, and key invariants — NOT on exact text content.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { parseStory }       from '../../src/services/story-parser.service.js';
import { classifyStory }    from '../../src/services/functional-classifier.service.js';
import { generateRules }    from '../../src/services/qa-rules-engine.service.js';
import { dedupeCompact }    from '../../src/services/dedupe-compact.service.js';
import { calculateScores }  from '../../src/services/scoring.service.js';
import { runQualityChecks } from '../../src/services/quality-checks.service.js';

const FIXTURE = resolve(import.meta.dirname, '../fixtures/pipeline/banking-login.feature');

const PROJECT = {
  nombre: 'Banca Digital',
  dominio: 'Finanzas',
  sensibilidad: 'interno',
  glosario: [
    { termino: 'JWT', definicion: 'JSON Web Token — token de autenticacion' },
    { termino: 'MFA', definicion: 'Multi-Factor Authentication' }
  ],
  reglas_negocio: [
    { regla: 'Bloquear cuenta tras 5 intentos fallidos', tipo: 'seguridad' },
    { regla: 'Tokens de recuperacion expiran en 30 minutos', tipo: 'restriccion' }
  ]
};

// Run the full pipeline once and share results across all tests
let texto, parser, classification, rawRules, resultado, scores, checks;

beforeAll(() => {
  texto          = readFileSync(FIXTURE, 'utf-8').trim();
  parser         = parseStory(texto, PROJECT.glosario, 'es');
  classification = classifyStory(texto, 'es');
  rawRules       = generateRules({ parser, classification, proyecto: PROJECT, lang: 'es' });
  resultado      = dedupeCompact(rawRules, parser);
  scores         = calculateScores({ parser, classification, resultado });
  checks         = runQualityChecks({ resultado, parser, classification, scores });
});

// ── Stage 1: Parser ───────────────────────────────────────────────────────
describe('pipeline — stage 1: parser', () => {
  it('detects BDD structure', () => {
    expect(parser.banderas.tiene_bdd).toBe(true);
    expect(parser.bdd.escenarios.length).toBeGreaterThanOrEqual(3);
  });

  it('detects Background steps', () => {
    expect(parser.bdd.background?.given.length).toBeGreaterThanOrEqual(1);
  });

  it('detects email integration (in Scenario 3)', () => {
    expect(parser.integraciones_detectadas).toContain('email');
  });

  it('glossary terms (JWT, MFA) are NOT flagged as vague', () => {
    // MFA/JWT are in glosario — should be excluded from vagos
    const vagosLower = parser.terminos_vagos.map(v => v.toLowerCase());
    expect(vagosLower).not.toContain('jwt');
    expect(vagosLower).not.toContain('mfa');
  });
});

// ── Stage 2: Classifier ───────────────────────────────────────────────────
describe('pipeline — stage 2: classifier', () => {
  it('classifies story as autenticacion', () => {
    expect(classification.tipo_primario).toBe('autenticacion');
  });

  it('confianza is above minimum threshold', () => {
    expect(classification.confianza).toBeGreaterThanOrEqual(0.3);
  });
});

// ── Stage 3: Rules engine ─────────────────────────────────────────────────
describe('pipeline — stage 3: rules engine', () => {
  it('generates at least 1 test case from each BDD scenario', () => {
    // 3 scenarios → 3+ TCs from BDD path
    expect(rawRules.test_cases.length).toBeGreaterThanOrEqual(3);
  });

  it('business rules appear as criterios', () => {
    const criterioTexts = rawRules.criterios_aceptacion.map(c => c.criterio);
    expect(criterioTexts.some(c => c.includes('5'))).toBe(true);   // "5 intentos"
  });

  it('all items have non-empty id and origen', () => {
    const allItems = [
      ...rawRules.ambiguedades,
      ...rawRules.criterios_aceptacion,
      ...rawRules.test_cases
    ];
    for (const item of allItems) {
      expect(item.id).toBeTruthy();
      expect(item.origen).toBeTruthy();
    }
  });
});

// ── Stage 4: Dedupe + compact ─────────────────────────────────────────────
describe('pipeline — stage 4: dedupe', () => {
  it('resultado has same or fewer items than rawRules', () => {
    expect(resultado.ambiguedades.length).toBeLessThanOrEqual(rawRules.ambiguedades.length);
    expect(resultado.test_cases.length).toBeLessThanOrEqual(rawRules.test_cases.length);
  });

  it('enforces block limits', () => {
    expect(resultado.ambiguedades.length).toBeLessThanOrEqual(8);
    expect(resultado.test_cases.length).toBeLessThanOrEqual(12);
    expect(resultado.riesgos.length).toBeLessThanOrEqual(6);
  });
});

// ── Stage 5: Scores ───────────────────────────────────────────────────────
describe('pipeline — stage 5: scoring', () => {
  it('all scores are between 0 and 100', () => {
    expect(scores.score_ambiguedad).toBeGreaterThanOrEqual(0);
    expect(scores.score_ambiguedad).toBeLessThanOrEqual(100);
    expect(scores.score_cobertura).toBeGreaterThanOrEqual(0);
    expect(scores.score_cobertura).toBeLessThanOrEqual(100);
    expect(scores.score_complejidad).toBeGreaterThanOrEqual(0);
    expect(scores.score_complejidad).toBeLessThanOrEqual(100);
  });

  it('autenticacion story has non-trivial complexity (auth adds 10 pts)', () => {
    expect(scores.score_complejidad).toBeGreaterThan(0);
  });
});

// ── Stage 6: Quality checks ───────────────────────────────────────────────
describe('pipeline — stage 6: quality checks', () => {
  it('returns all 7 boolean checks', () => {
    const keys = [
      'cobertura_minima', 'casos_accionables', 'sin_supuestos_no_soportados',
      'riesgos_relevantes', 'sin_redundancia_excesiva',
      'preguntas_refinamiento_utiles', 'requiere_refinamiento_humano'
    ];
    for (const k of keys) {
      expect(typeof checks[k]).toBe('boolean');
    }
  });
});

// ── End-to-end invariants ─────────────────────────────────────────────────
describe('pipeline — end-to-end invariants', () => {
  it('final resultado has all 6 required blocks as arrays', () => {
    const required = [
      'ambiguedades', 'preguntas_refinamiento', 'criterios_aceptacion',
      'test_cases', 'negativos_edge_cases', 'riesgos'
    ];
    for (const k of required) {
      expect(resultado[k]).toBeInstanceOf(Array);
    }
  });

  it('no block exceeds its LIMITES', () => {
    const LIMITES = { ambiguedades: 8, preguntas_refinamiento: 8, criterios_aceptacion: 10, test_cases: 12, negativos_edge_cases: 8, riesgos: 6 };
    for (const [k, max] of Object.entries(LIMITES)) {
      expect(resultado[k].length, `${k} exceeds limit`).toBeLessThanOrEqual(max);
    }
  });

  it('test cases from BDD have pasos derived from When steps', () => {
    const bddTC = resultado.test_cases.find(tc =>
      parser.bdd.escenarios.some(sc => tc.titulo === sc.titulo)
    );
    expect(bddTC).toBeDefined();
    expect(Array.isArray(bddTC.pasos)).toBe(true);
    expect(bddTC.pasos.length).toBeGreaterThan(0);
  });

  it('scores and checks are self-consistent: high ambiguedad → refinamiento required', () => {
    if (scores.score_ambiguedad >= 70) {
      expect(checks.requiere_refinamiento_humano).toBe(true);
    }
  });
});
