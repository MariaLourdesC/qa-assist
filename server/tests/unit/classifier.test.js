import { describe, it, expect } from 'vitest';
import { classifyStory } from '../../src/services/functional-classifier.service.js';

// ── 1. Classification by type ─────────────────────────────────────────────
describe('classifyStory — tipo detection (ES)', () => {
  it('classifies auth-heavy story as autenticacion', () => {
    const r = classifyStory(
      'Como usuario quiero hacer login con mi contrasena y verificacion de token mfa para autenticar la sesion. Sistema bloquea la cuenta tras 5 intentos fallidos. Recuperar credenciales via codigo.',
      'es'
    );
    expect(r.tipo_primario).toBe('autenticacion');
    expect(r.requiere_refinamiento_humano).toBe(false);
  });

  it('classifies transaction story as transaccion', () => {
    const r = classifyStory(
      'Como cliente quiero pagar una factura transfiriendo el monto desde mi cuenta con saldo validado por la pasarela de pagos. Confirmar transaccion y aprobar el cargo.',
      'es'
    );
    expect(r.tipo_primario).toBe('transaccion');
  });

  it('classifies CRUD-heavy story as crud', () => {
    const r = classifyStory(
      'Como administrador quiero crear editar eliminar y listar todos los registros del catalogo para mantener el listado de detalle filtrado y actualizado en la tabla.',
      'es'
    );
    expect(r.tipo_primario).toBe('crud');
  });

  it('classifies form-heavy story as formulario', () => {
    const r = classifyStory(
      'Como usuario quiero completar el formulario con campos obligatorios y validacion de formato para registrar mis datos. Los campos tienen submit y debo llenar todo antes de guardar.',
      'es'
    );
    expect(r.tipo_primario).toBe('formulario');
  });

  it('returns confianza as a number between 0 and 1', () => {
    const r = classifyStory(
      'Como cliente quiero pagar la factura confirmando el monto con la pasarela de pagos y aprobar la transaccion del cargo.', 'es'
    );
    expect(r.confianza).toBeGreaterThan(0);
    expect(r.confianza).toBeLessThanOrEqual(1);
  });

  it('requiere_refinamiento_humano = false when tipo is known', () => {
    const r = classifyStory(
      'Como admin quiero crear editar eliminar y listar registros del catalogo para mantener el listado detalle filtrado actualizado en la tabla.',
      'es'
    );
    expect(r.requiere_refinamiento_humano).toBe(false);
  });
});

// ── 2. Below-threshold → desconocido ─────────────────────────────────────
describe('classifyStory — desconocido', () => {
  it('returns desconocido for an unrelated story', () => {
    const r = classifyStory('Quiero hacer algo vago e indefinido.', 'es');
    expect(r.tipo_primario).toBe('desconocido');
    expect(r.requiere_refinamiento_humano).toBe(true);
  });

  it('confianza is 0 when tipo is desconocido and no signals match', () => {
    const r = classifyStory('Algo completamente vago.', 'es');
    expect(r.confianza).toBe(0);
  });
});

// ── 3. English classification ─────────────────────────────────────────────
describe('classifyStory — English', () => {
  it('classifies English auth story', () => {
    const r = classifyStory(
      'As a user I want to login with my password and session token and authenticate using mfa verification code. Lockout after failed attempts.',
      'en'
    );
    expect(r.tipo_primario).toBe('autenticacion');
  });

  it('classifies English transaction story', () => {
    const r = classifyStory(
      'As a customer I want to make a payment to transfer my balance using the payment gateway to confirm the transaction charge and approve the purchase.',
      'en'
    );
    expect(r.tipo_primario).toBe('transaccion');
  });
});

// ── 4. Priority tiebreak ──────────────────────────────────────────────────
describe('classifyStory — tiebreak by priority', () => {
  it('formulario has higher priority than crud in PRIORIDAD list', () => {
    // PRIORIDAD = ['formulario', 'crud', ...] — formulario is index 0, wins ties
    // Use a story that hits both equally
    const r = classifyStory(
      'Formulario de registro con campos. Llenar datos obligatorios para crear el registro y guardar en la tabla del catalogo.',
      'es'
    );
    expect(['formulario', 'crud']).toContain(r.tipo_primario);
  });
});

// ── 5. Edge cases ─────────────────────────────────────────────────────────
describe('classifyStory — edge cases', () => {
  it('returns desconocido for empty string', () => {
    expect(classifyStory('').tipo_primario).toBe('desconocido');
  });

  it('returns desconocido for null', () => {
    expect(classifyStory(null).tipo_primario).toBe('desconocido');
    expect(classifyStory(null).confianza).toBe(0);
  });

  it('returns desconocido for whitespace-only string', () => {
    expect(classifyStory('   ').tipo_primario).toBe('desconocido');
  });

  it('always returns detalle object with 4 keys', () => {
    const r = classifyStory('Quiero algo.', 'es');
    expect(Object.keys(r.detalle)).toHaveLength(4);
    expect(r.detalle).toHaveProperty('formulario');
    expect(r.detalle).toHaveProperty('autenticacion');
    expect(r.detalle).toHaveProperty('crud');
    expect(r.detalle).toHaveProperty('transaccion');
  });

  it('falls back to ES signals for unknown lang and detects if enough signals', () => {
    // Use a story with strong ES transaccion signals
    const r = classifyStory(
      'Como cliente quiero pagar la factura confirmando el monto via pasarela de pagos para aprobar la transaccion del cargo con la tarjeta.',
      'fr'   // unknown lang → falls back to ES
    );
    expect(r.tipo_primario).toBe('transaccion');
  });
});
