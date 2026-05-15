// story-parser.service.js
// Parser determinístico de historias. Soporta:
//  - User story tradicional ("Como X quiero Y para Z")
//  - Gherkin/BDD: Feature, Background, Scenario, Scenario Outline,
//    Given/When/Then/And/But, Examples, tablas con pipes
//  - Bilingüe es/en

// =============== VOCABULARIO ==================
const VOCAB = {
  es: {
    TERMINOS_VAGOS: [
      'adecuado','adecuadamente','correcto','correctamente',
      'apropiado','apropiadamente','optimo','optimamente',
      'robusto','seguro',
      'rapido','rapidamente','en tiempo real','inmediatamente',
      'facil','facilmente','simple','simplemente',
      'amigable','intuitivo','moderno',
      'eficiente','eficientemente',
      'varios','algunos','muchos','pocos',
      'etc','y demas','entre otros',
      'cuando sea necesario','si aplica','segun corresponda',
      'bien','mejor','bueno'
    ],
    SEÑALES_VALIDACION: [
      'validar','validacion','validaciones','obligatorio','obligatoria',
      'requerido','requerida','formato','verificar','comprobar'
    ],
    SEÑALES_ERROR: [
      'error','errores','fallo','falla','fallar',
      'rechazar','rechazo','invalido','invalida',
      'incorrecto','incorrecta','no permitido'
    ],
    INTEGRACIONES: [
      'api','endpoint','webhook','servicio externo','microservicio',
      'base de datos','bd','bbdd','sqs','kafka','rabbitmq',
      'pasarela','gateway','stripe','paypal','mercadopago',
      'correo','email','smtp','sms','notificacion push'
    ],
    ROLES_COMUNES: [
      'usuario','administrador','admin','cliente','operador',
      'supervisor','gerente','invitado','visitante',
      'vendedor','comprador','tecnico','auditor'
    ],
    ARTICULOS_RE: /\b(?:el|la|los|las|un|una|unos|unas)\s+([a-z]{4,}(?:\s+[a-z]{3,})?)\b/g,
    PALABRAS_FUNCIONALES: ['sistema','usuario','misma','mismo','cual','cuales'],
    GHERKIN_STORY_RE: /como\s+(?:un|una|el|la|los|las)?\s*([^,]+?)\s+(?:quiero|necesito|deseo|puedo)\s+([^,]+?)(?:\s+(?:para|de modo que|a fin de)\s+(.+))?$/i,
    NUMERIC_RE: /\b\d+\s*(?:ms|s|segundos?|minutos?|horas?|dias?|mb|gb|kb|%|caracteres?|intentos?)\b/g,
    MAX_RE: /\bmaximo\s+de?\s+\d+/i,
    MAX_FULL_RE: /maximo\s+de?\s+\d+[^,.]*/i,
    MIN_RE: /\bminimo\s+de?\s+\d+/i,
    MIN_FULL_RE: /minimo\s+de?\s+\d+[^,.]*/i,
    KEYWORDS: {
      feature:    ['feature','característica','caracteristica','historia'],
      background: ['background','antecedentes','contexto'],
      scenario:   ['scenario','escenario'],
      outline:    ['scenario outline','esquema del escenario','plantilla del escenario'],
      examples:   ['examples','ejemplos'],
      given:      ['given','dado que','dado','dada que','dada'],
      when:       ['when','cuando'],
      then:       ['then','entonces'],
      and:        ['and','y'],
      but:        ['but','pero']
    }
  },
  en: {
    TERMINOS_VAGOS: [
      'adequate','adequately','proper','properly',
      'appropriate','appropriately','optimal','optimally',
      'robust','secure',
      'fast','quickly','real time','real-time','immediately',
      'easy','easily','simple','simply',
      'friendly','intuitive','modern',
      'efficient','efficiently',
      'several','some','many','few',
      'etc','and so on','among others',
      'when necessary','if applicable','as appropriate',
      'good','better','well'
    ],
    SEÑALES_VALIDACION: [
      'validate','validation','validations','required','mandatory',
      'format','verify','check'
    ],
    SEÑALES_ERROR: [
      'error','errors','failure','fail','fails',
      'reject','rejected','invalid','wrong',
      'incorrect','not allowed','disallowed'
    ],
    INTEGRACIONES: [
      'api','endpoint','webhook','external service','microservice',
      'database','db','sqs','kafka','rabbitmq',
      'gateway','stripe','paypal',
      'mail','email','smtp','sms','push notification'
    ],
    ROLES_COMUNES: [
      'user','administrator','admin','customer','client','operator',
      'supervisor','manager','guest','visitor',
      'seller','buyer','technician','auditor'
    ],
    ARTICULOS_RE: /\b(?:the|a|an)\s+([a-z]{4,}(?:\s+[a-z]{3,})?)\b/g,
    PALABRAS_FUNCIONALES: ['system','user','same','which','that'],
    GHERKIN_STORY_RE: /as\s+(?:a|an|the)?\s*([^,]+?)\s+(?:i\s+want|i\s+need|i\s+would\s+like|i\s+can)\s+([^,]+?)(?:\s+(?:so\s+that|in\s+order\s+to|to)\s+(.+))?$/i,
    NUMERIC_RE: /\b\d+\s*(?:ms|s|seconds?|minutes?|hours?|days?|mb|gb|kb|%|chars?|characters?|attempts?)\b/g,
    MAX_RE: /\b(?:max(?:imum)?)\s+(?:of\s+)?\d+/i,
    MAX_FULL_RE: /(?:max(?:imum)?)\s+(?:of\s+)?\d+[^,.]*/i,
    MIN_RE: /\b(?:min(?:imum)?)\s+(?:of\s+)?\d+/i,
    MIN_FULL_RE: /(?:min(?:imum)?)\s+(?:of\s+)?\d+[^,.]*/i,
    KEYWORDS: {
      feature:    ['feature'],
      background: ['background'],
      scenario:   ['scenario'],
      outline:    ['scenario outline'],
      examples:   ['examples'],
      given:      ['given'],
      when:       ['when'],
      then:       ['then'],
      and:        ['and'],
      but:        ['but']
    }
  }
};

// =============== HELPERS ==================
function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectarTerminos(textoNormalizado, lista) {
  const encontrados = [];
  for (const termino of lista) {
    const regex = new RegExp(`\\b${termino.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(textoNormalizado)) encontrados.push(termino);
  }
  return encontrados;
}

function detectarEntidades(textoNormalizado, vocab) {
  const entidades = new Set();
  const patron = new RegExp(vocab.ARTICULOS_RE.source, vocab.ARTICULOS_RE.flags);
  let match;
  while ((match = patron.exec(textoNormalizado)) !== null) {
    const candidato = match[1].trim();
    if (!vocab.PALABRAS_FUNCIONALES.includes(candidato)) entidades.add(candidato);
  }
  return Array.from(entidades);
}

function detectarRestricciones(textoNormalizado, vocab) {
  const restricciones = [];
  const patronNumerico = new RegExp(vocab.NUMERIC_RE.source, vocab.NUMERIC_RE.flags);
  let match;
  while ((match = patronNumerico.exec(textoNormalizado)) !== null) {
    restricciones.push(match[0]);
  }
  if (vocab.MAX_RE.test(textoNormalizado)) {
    const m = textoNormalizado.match(vocab.MAX_FULL_RE);
    if (m) restricciones.push(m[0]);
  }
  if (vocab.MIN_RE.test(textoNormalizado)) {
    const m = textoNormalizado.match(vocab.MIN_FULL_RE);
    if (m) restricciones.push(m[0]);
  }
  return Array.from(new Set(restricciones));
}

function extraerEstructuraGherkin(textoNormalizado, vocab) {
  const match = textoNormalizado.match(vocab.GHERKIN_STORY_RE);
  if (match) {
    return {
      actor: (match[1] || '').trim(),
      accion: (match[2] || '').trim(),
      objetivo: (match[3] || '').trim()
    };
  }
  return { actor: '', accion: '', objetivo: '' };
}

// =============== BDD PARSER ==================
function startsWithKeyword(line, keywords) {
  const low = line.toLowerCase().trim();
  for (const kw of keywords) {
    if (low === kw || low.startsWith(kw + ' ') || low.startsWith(kw + ':')) return kw;
  }
  return null;
}

function stripKeyword(line, keyword) {
  const re = new RegExp(`^\\s*${keyword.replace(/\s+/g, '\\s+')}\\s*[:\\-]?\\s*`, 'i');
  return line.replace(re, '').trim();
}

function isTableLine(line) {
  return /^\s*\|.+\|\s*$/.test(line);
}

function parseTableLine(line) {
  return line.trim().slice(1, -1).split('|').map(c => c.trim());
}

/**
 * Parsea estructura BDD del texto.
 * @returns {object} { feature, background, escenarios, ejemplos, tablas }
 */
function parseBDD(texto, vocab) {
  const KW = vocab.KEYWORDS;
  const lines = texto.split(/\r?\n/);

  let feature = null;
  let background = null;
  const escenarios = [];
  const ejemplos = [];
  const tablasGlobales = [];

  let currentScenario = null;
  let currentLastList = null; // 'given' | 'when' | 'then' (para And/But)
  let currentTable = null;
  let pendingExamples = false; // siguiente tabla son ejemplos del último outline

  const flushTable = () => {
    if (!currentTable || currentTable.rows.length === 0) {
      currentTable = null;
      return;
    }
    if (pendingExamples && ejemplos.length > 0) {
      ejemplos[ejemplos.length - 1].tabla = currentTable;
      pendingExamples = false;
    } else {
      tablasGlobales.push(currentTable);
    }
    currentTable = null;
  };

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) { flushTable(); continue; }

    // Tabla
    if (isTableLine(line)) {
      const cells = parseTableLine(line);
      if (!currentTable) currentTable = { headers: cells, rows: [] };
      else currentTable.rows.push(cells);
      continue;
    } else if (currentTable) {
      flushTable();
    }

    // Feature / Característica
    let kw = startsWithKeyword(line, KW.feature);
    if (kw) {
      feature = stripKeyword(line, kw);
      continue;
    }

    // Background
    kw = startsWithKeyword(line, KW.background);
    if (kw) {
      background = { given: [], when: [], then: [] };
      currentScenario = background;
      currentLastList = null;
      continue;
    }

    // Scenario Outline (chequear primero porque incluye "scenario")
    kw = startsWithKeyword(line, KW.outline);
    if (kw) {
      const titulo = stripKeyword(line, kw);
      const sc = { titulo, given: [], when: [], then: [], outline: true };
      escenarios.push(sc);
      ejemplos.push({ titulo, given: [], when: [], then: [], tabla: null });
      currentScenario = sc;
      currentLastList = null;
      continue;
    }

    // Scenario / Escenario
    kw = startsWithKeyword(line, KW.scenario);
    if (kw) {
      const titulo = stripKeyword(line, kw);
      const sc = { titulo, given: [], when: [], then: [], outline: false };
      escenarios.push(sc);
      currentScenario = sc;
      currentLastList = null;
      continue;
    }

    // Examples / Ejemplos
    kw = startsWithKeyword(line, KW.examples);
    if (kw) {
      pendingExamples = true;
      continue;
    }

    if (!currentScenario) continue;

    // Given / When / Then / And / But
    kw = startsWithKeyword(line, KW.given);
    if (kw) {
      const text = stripKeyword(line, kw);
      currentScenario.given.push(text);
      currentLastList = 'given';
      continue;
    }
    kw = startsWithKeyword(line, KW.when);
    if (kw) {
      const text = stripKeyword(line, kw);
      currentScenario.when.push(text);
      currentLastList = 'when';
      continue;
    }
    kw = startsWithKeyword(line, KW.then);
    if (kw) {
      const text = stripKeyword(line, kw);
      currentScenario.then.push(text);
      currentLastList = 'then';
      continue;
    }
    kw = startsWithKeyword(line, KW.and) || startsWithKeyword(line, KW.but);
    if (kw && currentLastList) {
      const text = stripKeyword(line, kw);
      currentScenario[currentLastList].push(text);
      continue;
    }
  }
  flushTable();

  // Si el outline tiene ejemplos pendientes, copiar pasos del scenario
  ejemplos.forEach((ex, i) => {
    const matchScenario = escenarios.find(s => s.outline && s.titulo === ex.titulo);
    if (matchScenario) {
      ex.given = matchScenario.given;
      ex.when = matchScenario.when;
      ex.then = matchScenario.then;
    }
  });

  return { feature, background, escenarios, ejemplos, tablas: tablasGlobales };
}

// =============== ENTRY POINT ==================
/**
 * @param {string} texto
 * @param {Array<{termino: string, definicion: string}>} glosario
 * @param {'es'|'en'} lang
 */
function parseStory(texto, glosario = [], lang = 'es') {
  if (!texto || typeof texto !== 'string' || texto.trim() === '') {
    throw new Error('Texto de historia vacio o invalido');
  }
  const vocab = VOCAB[lang] || VOCAB.es;
  const textoNormalizado = normalizar(texto);

  // 1. User story tradicional
  const { actor, accion, objetivo } = extraerEstructuraGherkin(textoNormalizado, vocab);

  // 2. Estructura BDD avanzada (escenarios, tablas, ejemplos)
  const bdd = parseBDD(texto, vocab);

  // 3. Heurísticas globales sobre el texto completo (también incluye los pasos BDD)
  const entidades_detectadas = detectarEntidades(textoNormalizado, vocab);
  const integraciones_detectadas = detectarTerminos(textoNormalizado, vocab.INTEGRACIONES);
  const restricciones_detectadas = detectarRestricciones(textoNormalizado, vocab);
  const roles_detectados = detectarTerminos(textoNormalizado, vocab.ROLES_COMUNES);

  const terminosGlosario = new Set(
    (glosario || []).map(g => normalizar(g?.termino || '')).filter(Boolean)
  );
  const vagosDetectados = detectarTerminos(textoNormalizado, vocab.TERMINOS_VAGOS);
  const terminos_vagos = vagosDetectados.filter(t => !terminosGlosario.has(normalizar(t)));

  const tiene_validaciones = detectarTerminos(textoNormalizado, vocab.SEÑALES_VALIDACION).length > 0;
  const tiene_errores = detectarTerminos(textoNormalizado, vocab.SEÑALES_ERROR).length > 0;

  const tiene_bdd = bdd.escenarios.length > 0;
  const tiene_actor = !!actor || (tiene_bdd && roles_detectados.length > 0);
  const tiene_accion = !!accion || (tiene_bdd && bdd.escenarios.some(s => s.when.length > 0));
  const tiene_objetivo = !!objetivo || (tiene_bdd && bdd.escenarios.some(s => s.then.length > 0));

  const banderas = {
    tiene_actor,
    tiene_accion,
    tiene_objetivo,
    tiene_validaciones,
    tiene_errores,
    tiene_bdd,
    tiene_outline: bdd.escenarios.some(s => s.outline),
    tiene_tablas: bdd.tablas.length > 0
  };

  return {
    actor,
    accion,
    objetivo,
    entidades_detectadas,
    integraciones_detectadas,
    restricciones_detectadas,
    roles_detectados,
    terminos_vagos,
    banderas,
    bdd,
    lang
  };
}

module.exports = { parseStory, normalizar };
