import { describe, it, expect } from 'vitest';
import { generateRules } from '../../src/services/qa-rules-engine.service.js';
import { parseStory } from '../../src/services/story-parser.service.js';

// ── Fixture builders ──────────────────────────────────────────────────────
function classification(tipo = 'transaccion', confianza = 0.75) {
  return { tipo_primario: tipo, confianza, subtipos: [], requiere_refinamiento_humano: false };
}

function proyecto(reglas = []) {
  return { nombre: 'Test', sensibilidad: 'interno', glosario: [], reglas_negocio: reglas };
}

// Build a real parser output for tests that need accurate flags
function parserFrom(texto, lang = 'es') {
  return parseStory(texto, [], lang);
}

// ── 1. Global rules fire on missing flags ─────────────────────────────────
describe('generateRules — global rules', () => {
  it('generates AMB for missing actor', () => {
    const parser = parserFrom('Quiero transferir dinero para ver el saldo.');
    const out = generateRules({ parser, classification: classification(), proyecto: proyecto() });
    const descs = out.ambiguedades.map(a => a.descripcion.toLowerCase());
    expect(descs.some(d => d.includes('actor') || d.includes('quien') || d.includes('rol'))).toBe(true);
  });

  it('generates AMB for missing validaciones', () => {
    const parser = parserFrom('Como cliente quiero transferir dinero para ver el saldo.', 'es');
    // Story has no "validar" signal
    const out = generateRules({ parser, classification: classification(), proyecto: proyecto() });
    const hasValidAMB = out.ambiguedades.some(a => a.descripcion.toLowerCase().includes('validac'));
    expect(hasValidAMB).toBe(true);
  });

  it('generates PRE for each detected vague term', () => {
    const parser = parserFrom('Como usuario quiero algo rapido y seguro para verlo facilmente.', 'es');
    const out = generateRules({ parser, classification: classification(), proyecto: proyecto() });
    expect(out.preguntas_refinamiento.length).toBeGreaterThan(0);
  });

  it('injects business rules as criterios', () => {
    const reglas = [
      { regla: 'Monto maximo 10000 USD', tipo: 'restriccion' },
      { regla: 'Bloquear tras 5 intentos', tipo: 'seguridad' }
    ];
    const parser = parserFrom('Como cliente quiero transferir dinero para ver el saldo.');
    const out = generateRules({ parser, classification: classification(), proyecto: proyecto(reglas) });
    expect(out.criterios_aceptacion.length).toBeGreaterThanOrEqual(2);
    const criterioTexts = out.criterios_aceptacion.map(c => c.criterio);
    expect(criterioTexts.some(c => c.includes('10000'))).toBe(true);
  });

  it('flags data sensible without protection policy', () => {
    // email without cifrar/encriptar
    const parser = parserFrom('Como cliente quiero enviar mi email y DNI para registrarme.');
    const out = generateRules({ parser, classification: classification(), proyecto: proyecto() });
    const hasSensible = out.ambiguedades.some(a =>
      a.descripcion.toLowerCase().includes('sensible') || a.descripcion.toLowerCase().includes('protec')
    );
    expect(hasSensible).toBe(true);
  });
});

// ── 2. Type-specific rules ────────────────────────────────────────────────
describe('generateRules — type-specific rules', () => {
  const parser = parserFrom('Como cliente quiero pagar y transferir dinero via pasarela de pagos.', 'es');

  it('generates test cases for transaccion type', () => {
    const out = generateRules({ parser, classification: classification('transaccion'), proyecto: proyecto() });
    expect(out.test_cases.length).toBeGreaterThanOrEqual(1);
  });

  it('generates riesgos for transaccion type', () => {
    const out = generateRules({ parser, classification: classification('transaccion'), proyecto: proyecto() });
    expect(out.riesgos.length).toBeGreaterThanOrEqual(1);
  });

  it('generates criterios for autenticacion type', () => {
    const authParser = parserFrom('Como usuario quiero hacer login con contrasena y token mfa.');
    const out = generateRules({ parser: authParser, classification: classification('autenticacion'), proyecto: proyecto() });
    expect(out.criterios_aceptacion.length).toBeGreaterThanOrEqual(1);
  });

  it('generates edge cases for crud type', () => {
    const crudParser = parserFrom('Como admin quiero crear editar y eliminar registros del catalogo.');
    const out = generateRules({ parser: crudParser, classification: classification('crud'), proyecto: proyecto() });
    expect(out.negativos_edge_cases.length).toBeGreaterThanOrEqual(1);
  });

  it('generates generic test case for desconocido type', () => {
    const out = generateRules({ parser, classification: classification('desconocido'), proyecto: proyecto() });
    expect(out.test_cases.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 3. BDD-derived test cases ─────────────────────────────────────────────
describe('generateRules — BDD scenario → test cases', () => {
  const bddText = `Feature: Transferencia
Scenario: Login exitoso
  Given el usuario tiene cuenta activa
  When ingresa credenciales validas
  Then el sistema crea sesion autenticada`;

  it('generates 1 TC per BDD scenario', () => {
    const parser = parserFrom(bddText);
    const out = generateRules({ parser, classification: classification('autenticacion'), proyecto: proyecto() });
    // 1 from BDD, possibly more from type-specific (if BDD overrides)
    expect(out.test_cases.length).toBeGreaterThanOrEqual(1);
    expect(out.test_cases[0].titulo).toMatch(/login exitoso/i);
  });

  it('TC precondiciones come from Given steps', () => {
    const parser = parserFrom(bddText);
    const out = generateRules({ parser, classification: classification('autenticacion'), proyecto: proyecto() });
    expect(out.test_cases[0].precondiciones).toMatch(/cuenta activa/i);
  });

  it('TC pasos come from When steps', () => {
    const parser = parserFrom(bddText);
    const out = generateRules({ parser, classification: classification('autenticacion'), proyecto: proyecto() });
    expect(out.test_cases[0].pasos[0]).toMatch(/credenciales/i);
  });

  it('generates criterio per Then step', () => {
    const parser = parserFrom(bddText);
    const out = generateRules({ parser, classification: classification('autenticacion'), proyecto: proyecto() });
    const criterioTexts = out.criterios_aceptacion.map(c => c.criterio);
    expect(criterioTexts.some(c => c.toLowerCase().includes('sesion'))).toBe(true);
  });
});

// ── 4. Output shape & ID format ───────────────────────────────────────────
describe('generateRules — output shape', () => {
  const parser = parserFrom('Como cliente quiero pagar la factura para completar la compra.', 'es');
  const out = generateRules({ parser, classification: classification(), proyecto: proyecto() });

  it('returns all 6 required blocks', () => {
    expect(out).toHaveProperty('ambiguedades');
    expect(out).toHaveProperty('preguntas_refinamiento');
    expect(out).toHaveProperty('criterios_aceptacion');
    expect(out).toHaveProperty('test_cases');
    expect(out).toHaveProperty('negativos_edge_cases');
    expect(out).toHaveProperty('riesgos');
  });

  it('all IDs follow the PREFIX-NNN format', () => {
    const allItems = [
      ...out.ambiguedades,
      ...out.preguntas_refinamiento,
      ...out.criterios_aceptacion,
      ...out.test_cases,
      ...out.negativos_edge_cases,
      ...out.riesgos
    ];
    for (const item of allItems) {
      expect(item.id).toMatch(/^[A-Z]+-\d{3}$/);
    }
  });

  it('all items have origen field', () => {
    const allItems = [
      ...out.ambiguedades,
      ...out.criterios_aceptacion,
      ...out.riesgos
    ];
    for (const item of allItems) {
      expect(item).toHaveProperty('origen');
    }
  });
});

// ── 4b. Additional type coverage ─────────────────────────────────────────
describe('generateRules — all 4 types + edge cases', () => {
  it('generates formulario test cases and edges', () => {
    const parser = parseStory('Como usuario quiero llenar el formulario con campos obligatorios validando el formato para registrar los datos y guardar.', [], 'es');
    const out = generateRules({ parser, classification: classification('formulario'), proyecto: proyecto() });
    expect(out.test_cases.length).toBeGreaterThanOrEqual(1);
    expect(out.negativos_edge_cases.length).toBeGreaterThanOrEqual(1);
    expect(out.riesgos.length).toBeGreaterThanOrEqual(1);
  });

  it('generates auth test cases with precondiciones and pasos', () => {
    const parser = parseStory('Como usuario quiero hacer login con contrasena y token mfa para autenticar mi sesion con credenciales validas.', [], 'es');
    const out = generateRules({ parser, classification: classification('autenticacion'), proyecto: proyecto() });
    expect(out.test_cases.length).toBeGreaterThanOrEqual(1);
    const tc = out.test_cases[0];
    expect(tc).toHaveProperty('precondiciones');
    expect(Array.isArray(tc.pasos)).toBe(true);
    expect(tc.pasos.length).toBeGreaterThan(0);
  });

  it('no-business-rules project generates AMB about missing rules', () => {
    const parser = parseStory('Como admin quiero crear y eliminar registros del catalogo.', [], 'es');
    const out = generateRules({ parser, classification: classification('crud'), proyecto: proyecto([]) });
    expect(out.ambiguedades.some(a => a.descripcion.toLowerCase().includes('regla'))).toBe(true);
  });

  it('generates Scenario Outline → TCs with param substitution', () => {
    const outlineText = `Feature: Pagos
Scenario Outline: Pago con <moneda>
  Given el usuario tiene saldo en <moneda>
  When transfiere <monto>
  Then el sistema confirma el pago en <moneda>
Examples:
  | moneda | monto |
  | USD    | 100   |
  | EUR    | 85    |`;
    const parser = parseStory(outlineText, [], 'es');
    const out = generateRules({ parser, classification: classification('transaccion'), proyecto: proyecto() });
    expect(out.test_cases.length).toBeGreaterThanOrEqual(3);
    expect(out.test_cases.some(tc => tc.titulo.includes('USD') || tc.titulo.includes('EUR'))).toBe(true);
  });
});

// ── 5. English rules ──────────────────────────────────────────────────────
describe('generateRules — English', () => {
  it('generates English-language ambiguity descriptions with lang=en', () => {
    const parser = parserFrom(
      'As a customer I want to pay an invoice to complete the purchase.', 'en'
    );
    const out = generateRules({ parser, classification: classification(), proyecto: proyecto(), lang: 'en' });
    const descs = out.ambiguedades.map(a => a.descripcion);
    // At least one English description expected
    expect(descs.some(d => /[A-Z]/.test(d[0]) && !/^Actor/.test(d))).toBe(true);
  });
});
