// qa-rules-engine.service.js
// Genera la base QA (ambiguedades, preguntas, criterios, test cases,
// negativos/edge cases, riesgos) a partir del parser output + clasificacion.
// Determinístico, plantillas fijas, bilingüe (es/en).

const ORIGEN = 'local';

const T = {
  es: {
    // Globales
    actorMissing: 'Actor no identificado. Definir quien ejecuta la accion.',
    qActorRole: 'Que rol o tipo de usuario ejecuta esta accion?',
    actionMissing: 'Accion principal no clara. Definir verbo y objeto concretos.',
    objectiveMissing: 'Objetivo de la historia no explicito. Definir el "para que".',
    validationsMissing: 'La historia no menciona validaciones de entrada.',
    qValidations: 'Que validaciones debe aplicarse a los datos de entrada?',
    errorsMissing: 'No se describen flujos de error ni mensajes al usuario.',
    qErrors: 'Como debe responder el sistema ante errores o datos invalidos?',
    constraintsMissing: 'No se detectaron restricciones numericas, limites ni timeouts.',
    qConstraints: 'Existen limites, timeouts o restricciones de cantidad aplicables?',
    noBusinessRules: 'El proyecto no tiene reglas de negocio cargadas. No se valido contra ninguna.',
    businessRulePrefix: (rule) => `Debe cumplirse la regla de negocio: ${rule}`,
    vagueTerm: (term) => `Termino vago detectado: "${term}". Definir criterio medible.`,
    qVagueTerm: (term) => `Como se mide objetivamente "${term}" en este contexto?`,
    sensitiveData: 'Se mencionan datos sensibles sin especificar politica de proteccion.',
    rolesMissing: 'No se definen roles ni niveles de permisos.',
    altStatesMissing: 'No se definen estados alternos (cancelacion, timeout, rechazo).',

    // Formulario
    form_ca1: 'Campos obligatorios deben estar marcados visualmente.',
    form_ca2: 'Formulario debe validar formatos (email, fecha, telefono, numerico) antes de enviar.',
    form_ca3: 'Al enviar con datos validos, los datos se persisten correctamente.',
    form_tc1_t: 'Envio exitoso con todos los campos validos',
    form_tc1_pre: 'Usuario en pagina del formulario, sin datos previos',
    form_tc1_p: ['Completar todos los campos obligatorios con datos validos', 'Click en boton Guardar'],
    form_tc1_r: 'El sistema persiste el registro y muestra confirmacion visible al usuario.',
    form_tc2_t: 'Rechazo por campo obligatorio vacio',
    form_tc2_pre: 'Usuario en pagina del formulario',
    form_tc2_p: ['Dejar un campo obligatorio vacio', 'Click en boton Guardar'],
    form_tc2_r: 'El sistema impide el envio y muestra mensaje especifico indicando el campo faltante.',
    form_tc3_t: 'Rechazo por formato invalido',
    form_tc3_pre: 'Usuario en pagina del formulario',
    form_tc3_p: ['Ingresar valor con formato incorrecto en campo con formato definido', 'Click en Guardar'],
    form_tc3_r: 'El sistema muestra mensaje de error indicando el formato esperado y no envia los datos.',
    form_e1: 'Intento de envio con longitud minima/maxima exactamente en el limite.',
    form_e2: 'Cancelacion del formulario con datos parciales: verificar que no se persiste nada.',
    form_r1: 'Duplicidad de registro si no hay validacion de unicidad en servidor.',
    form_r2: 'Perdida de datos si el usuario navega fuera sin guardar.',

    // Autenticacion
    auth_ca1: 'Credenciales validas permiten acceso; invalidas muestran mensaje generico.',
    auth_ca2: 'Sistema bloquea al usuario tras N intentos fallidos.',
    auth_ca3: 'Sesion expira tras periodo de inactividad definido.',
    auth_tc1_t: 'Login exitoso con credenciales validas',
    auth_tc1_pre: 'Usuario registrado y activo',
    auth_tc1_p: ['Ingresar usuario y contrasena validos', 'Click en Iniciar sesion'],
    auth_tc1_r: 'El sistema redirige al dashboard y crea sesion autenticada.',
    auth_tc2_t: 'Login fallido con password incorrecto',
    auth_tc2_pre: 'Usuario registrado y activo',
    auth_tc2_p: ['Ingresar usuario valido y password incorrecto', 'Click en Iniciar sesion'],
    auth_tc2_r: 'El sistema muestra mensaje generico "credenciales invalidas" sin revelar cual campo fallo.',
    auth_tc3_t: 'Bloqueo tras intentos fallidos',
    auth_tc3_pre: 'Usuario registrado y activo',
    auth_tc3_p: ['Intentar login con password incorrecto N veces seguidas'],
    auth_tc3_r: 'El sistema bloquea la cuenta y muestra mensaje de bloqueo con via de recuperacion.',
    auth_e1: 'Sesion concurrente: mismo usuario loguea en 2 dispositivos simultaneos.',
    auth_e2: 'Recuperacion de contrasena para usuario inactivo o inexistente.',
    auth_r1: 'Enumeracion de usuarios si el mensaje de error distingue usuario vs password.',
    auth_r2: 'Ataque por fuerza bruta si no hay rate limiting adicional al bloqueo.',

    // CRUD
    crud_ca1: 'Alta, edicion, eliminacion y consulta disponibles segun permisos del rol.',
    crud_ca2: 'Duplicidad de registros controlada por clave unica de negocio.',
    crud_ca3: 'Eliminacion valida dependencias antes de ejecutarse.',
    crud_tc1_t: 'Alta exitosa de un registro',
    crud_tc1_pre: 'Usuario con permisos de creacion',
    crud_tc1_p: ['Abrir formulario de alta', 'Llenar campos obligatorios con datos validos', 'Confirmar alta'],
    crud_tc1_r: 'El registro se guarda y aparece en el listado con los valores ingresados.',
    crud_tc2_t: 'Edicion de registro existente',
    crud_tc2_pre: 'Existe al menos un registro y usuario con permisos de edicion',
    crud_tc2_p: ['Abrir detalle de un registro', 'Modificar un campo', 'Guardar cambios'],
    crud_tc2_r: 'El registro se actualiza y refleja los nuevos valores en listado y detalle.',
    crud_tc3_t: 'Eliminacion con confirmacion',
    crud_tc3_pre: 'Existe al menos un registro sin dependencias y usuario con permisos de eliminacion',
    crud_tc3_p: ['Seleccionar registro', 'Click en Eliminar', 'Confirmar en dialogo'],
    crud_tc3_r: 'El registro desaparece del listado y no puede consultarse por id.',
    crud_e1: 'Alta con datos duplicados en clave unica: debe rechazarse con mensaje claro.',
    crud_e2: 'Eliminacion de un registro con dependencias: debe bloquearse o manejar cascada explicitamente.',
    crud_r1: 'Perdida de integridad si la eliminacion en cascada no esta controlada.',
    crud_r2: 'Operaciones sin permisos si el control se hace solo en UI y no en backend.',

    // Transaccion
    tx_ca1: 'Transaccion exitosa deja el estado consistente y notifica al usuario.',
    tx_ca2: 'Rechazos (fondos, limites, reglas) muestran causa especifica al usuario.',
    tx_ca3: 'Operacion es idempotente: reintentos no duplican la transaccion.',
    tx_tc1_t: 'Transaccion aprobada y confirmada',
    tx_tc1_pre: 'Usuario autenticado con saldo/limite suficiente',
    tx_tc1_p: ['Iniciar transaccion con monto valido', 'Confirmar operacion'],
    tx_tc1_r: 'El sistema aprueba, actualiza el estado y muestra id de transaccion al usuario.',
    tx_tc2_t: 'Rechazo por fondos o limite insuficiente',
    tx_tc2_pre: 'Usuario autenticado con saldo/limite insuficiente',
    tx_tc2_p: ['Iniciar transaccion con monto superior al disponible', 'Confirmar operacion'],
    tx_tc2_r: 'El sistema rechaza la operacion, no cambia el estado y muestra razon concreta.',
    tx_tc3_t: 'Reintento tras timeout del procesador',
    tx_tc3_pre: 'Procesador externo no responde dentro del timeout',
    tx_tc3_p: ['Iniciar transaccion', 'Esperar timeout', 'Reintentar con misma clave de idempotencia'],
    tx_tc3_r: 'El sistema no genera una segunda transaccion; retorna el resultado final una vez disponible.',
    tx_e1: 'Transaccion duplicada enviada dos veces en paralelo: solo una debe quedar registrada.',
    tx_e2: 'Rollback parcial ante fallo intermedio: verificar consistencia del estado post-error.',
    tx_r1: 'Duplicacion de cargos si la idempotencia no esta garantizada.',
    tx_r2: 'Inconsistencia entre lo mostrado al usuario y lo registrado en backend.',

    // Desconocido
    unk_tc_t: 'Flujo principal segun interpretacion humana',
    unk_tc_pre: 'Historia clasificada como "desconocido", requiere refinamiento',
    unk_tc_p: ['Identificar el flujo manualmente a partir de la descripcion', 'Ejecutar paso principal'],
    unk_tc_r: 'El resultado coincide con lo que el QA interpreta de la historia.',
    unk_e: 'Cualquier flujo alterno no considerado por el QA al refinar manualmente.'
  },
  en: {
    actorMissing: 'Actor not identified. Define who performs the action.',
    qActorRole: 'What role or type of user performs this action?',
    actionMissing: 'Main action is unclear. Define a concrete verb and object.',
    objectiveMissing: 'Story objective is not explicit. Define the "in order to".',
    validationsMissing: 'The story does not mention input validations.',
    qValidations: 'What validations should be applied to the input data?',
    errorsMissing: 'No error flows or user-facing messages are described.',
    qErrors: 'How should the system respond to errors or invalid data?',
    constraintsMissing: 'No numeric constraints, limits or timeouts were detected.',
    qConstraints: 'Are there applicable limits, timeouts or quantity constraints?',
    noBusinessRules: 'The project has no business rules loaded. None were validated.',
    businessRulePrefix: (rule) => `Must comply with the business rule: ${rule}`,
    vagueTerm: (term) => `Vague term detected: "${term}". Define a measurable criterion.`,
    qVagueTerm: (term) => `How is "${term}" measured objectively in this context?`,
    sensitiveData: 'Sensitive data is mentioned without specifying a protection policy.',
    rolesMissing: 'No roles or permission levels are defined.',
    altStatesMissing: 'No alternate states are defined (cancellation, timeout, rejection).',

    form_ca1: 'Required fields must be visually marked.',
    form_ca2: 'Form must validate formats (email, date, phone, numeric) before submission.',
    form_ca3: 'When submitting with valid data, the data is persisted correctly.',
    form_tc1_t: 'Successful submission with all valid fields',
    form_tc1_pre: 'User on the form page, no prior data',
    form_tc1_p: ['Fill in all required fields with valid data', 'Click the Save button'],
    form_tc1_r: 'The system persists the record and shows a visible confirmation to the user.',
    form_tc2_t: 'Rejection due to empty required field',
    form_tc2_pre: 'User on the form page',
    form_tc2_p: ['Leave a required field empty', 'Click the Save button'],
    form_tc2_r: 'The system blocks submission and shows a specific message indicating the missing field.',
    form_tc3_t: 'Rejection due to invalid format',
    form_tc3_pre: 'User on the form page',
    form_tc3_p: ['Enter a value with incorrect format in a field with defined format', 'Click Save'],
    form_tc3_r: 'The system shows an error message indicating the expected format and does not submit the data.',
    form_e1: 'Submission attempt with min/max length exactly at the limit.',
    form_e2: 'Form cancellation with partial data: verify nothing is persisted.',
    form_r1: 'Record duplication if there is no uniqueness validation on the server.',
    form_r2: 'Data loss if the user navigates away without saving.',

    auth_ca1: 'Valid credentials grant access; invalid ones show a generic message.',
    auth_ca2: 'System locks the user after N failed attempts.',
    auth_ca3: 'Session expires after a defined inactivity period.',
    auth_tc1_t: 'Successful login with valid credentials',
    auth_tc1_pre: 'Registered and active user',
    auth_tc1_p: ['Enter valid username and password', 'Click Sign in'],
    auth_tc1_r: 'The system redirects to the dashboard and creates an authenticated session.',
    auth_tc2_t: 'Failed login with incorrect password',
    auth_tc2_pre: 'Registered and active user',
    auth_tc2_p: ['Enter valid username and incorrect password', 'Click Sign in'],
    auth_tc2_r: 'The system shows a generic "invalid credentials" message without revealing which field failed.',
    auth_tc3_t: 'Lockout after failed attempts',
    auth_tc3_pre: 'Registered and active user',
    auth_tc3_p: ['Attempt login with incorrect password N times in a row'],
    auth_tc3_r: 'The system locks the account and shows a lockout message with a recovery path.',
    auth_e1: 'Concurrent session: same user logs in on 2 devices simultaneously.',
    auth_e2: 'Password recovery for inactive or non-existent user.',
    auth_r1: 'User enumeration if the error message distinguishes user vs password.',
    auth_r2: 'Brute-force attack if no rate limiting exists beyond the lockout.',

    crud_ca1: 'Create, edit, delete and query available based on the role permissions.',
    crud_ca2: 'Record duplication controlled by a unique business key.',
    crud_ca3: 'Deletion validates dependencies before execution.',
    crud_tc1_t: 'Successful record creation',
    crud_tc1_pre: 'User with create permissions',
    crud_tc1_p: ['Open the create form', 'Fill in required fields with valid data', 'Confirm creation'],
    crud_tc1_r: 'The record is saved and appears in the listing with the entered values.',
    crud_tc2_t: 'Editing an existing record',
    crud_tc2_pre: 'At least one record exists and user has edit permissions',
    crud_tc2_p: ['Open the detail of a record', 'Modify a field', 'Save changes'],
    crud_tc2_r: 'The record is updated and reflects the new values in listing and detail.',
    crud_tc3_t: 'Deletion with confirmation',
    crud_tc3_pre: 'At least one record without dependencies exists and user has delete permissions',
    crud_tc3_p: ['Select a record', 'Click Delete', 'Confirm in the dialog'],
    crud_tc3_r: 'The record disappears from the listing and cannot be queried by id.',
    crud_e1: 'Creation with duplicated data on a unique key: must be rejected with a clear message.',
    crud_e2: 'Deletion of a record with dependencies: must be blocked or handle cascade explicitly.',
    crud_r1: 'Loss of integrity if cascade deletion is not controlled.',
    crud_r2: 'Operations without permissions if the control is only in UI and not in backend.',

    tx_ca1: 'Successful transaction leaves the state consistent and notifies the user.',
    tx_ca2: 'Rejections (funds, limits, rules) show a specific cause to the user.',
    tx_ca3: 'Operation is idempotent: retries do not duplicate the transaction.',
    tx_tc1_t: 'Approved and confirmed transaction',
    tx_tc1_pre: 'Authenticated user with sufficient balance/limit',
    tx_tc1_p: ['Start transaction with a valid amount', 'Confirm the operation'],
    tx_tc1_r: 'The system approves, updates the state and shows the transaction id to the user.',
    tx_tc2_t: 'Rejection due to insufficient funds or limit',
    tx_tc2_pre: 'Authenticated user with insufficient balance/limit',
    tx_tc2_p: ['Start transaction with an amount higher than available', 'Confirm the operation'],
    tx_tc2_r: 'The system rejects the operation, does not change state and shows a concrete reason.',
    tx_tc3_t: 'Retry after processor timeout',
    tx_tc3_pre: 'External processor does not respond within the timeout',
    tx_tc3_p: ['Start transaction', 'Wait for timeout', 'Retry with the same idempotency key'],
    tx_tc3_r: 'The system does not generate a second transaction; returns the final result once available.',
    tx_e1: 'Duplicated transaction sent twice in parallel: only one must be recorded.',
    tx_e2: 'Partial rollback after intermediate failure: verify state consistency after the error.',
    tx_r1: 'Duplicated charges if idempotency is not guaranteed.',
    tx_r2: 'Inconsistency between what is shown to the user and what is recorded in the backend.',

    unk_tc_t: 'Main flow according to human interpretation',
    unk_tc_pre: 'Story classified as "unknown", requires refinement',
    unk_tc_p: ['Identify the flow manually from the description', 'Execute the main step'],
    unk_tc_r: 'The result matches what the QA interprets from the story.',
    unk_e: 'Any alternate flow not considered by the QA during manual refinement.'
  }
};

function makeIdFactory() {
  const counters = {};
  return (prefix) => {
    counters[prefix] = (counters[prefix] || 0) + 1;
    return `${prefix}-${String(counters[prefix]).padStart(3, '0')}`;
  };
}

function reglasGlobales(parser, proyecto, nextId, t) {
  const ambiguedades = [];
  const preguntas = [];
  const criterios = [];

  const { banderas, terminos_vagos, restricciones_detectadas, roles_detectados } = parser;

  if (!banderas.tiene_actor) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.actorMissing, severidad: 'alta', origen: ORIGEN });
    preguntas.push({ id: nextId('PRE'), pregunta: t.qActorRole, origen: ORIGEN });
  }
  if (!banderas.tiene_accion) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.actionMissing, severidad: 'alta', origen: ORIGEN });
  }
  if (!banderas.tiene_objetivo) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.objectiveMissing, severidad: 'media', origen: ORIGEN });
  }
  if (!banderas.tiene_validaciones) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.validationsMissing, severidad: 'media', origen: ORIGEN });
    preguntas.push({ id: nextId('PRE'), pregunta: t.qValidations, origen: ORIGEN });
  }
  if (!banderas.tiene_errores) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.errorsMissing, severidad: 'media', origen: ORIGEN });
    preguntas.push({ id: nextId('PRE'), pregunta: t.qErrors, origen: ORIGEN });
  }
  if (restricciones_detectadas.length === 0) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.constraintsMissing, severidad: 'baja', origen: ORIGEN });
    preguntas.push({ id: nextId('PRE'), pregunta: t.qConstraints, origen: ORIGEN });
  }

  const reglasNegocio = (proyecto?.reglas_negocio || []);
  if (reglasNegocio.length === 0) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.noBusinessRules, severidad: 'baja', origen: ORIGEN });
  } else {
    for (const rn of reglasNegocio) {
      criterios.push({ id: nextId('CA'), criterio: t.businessRulePrefix(rn.regla || rn), origen: ORIGEN });
    }
  }

  for (const termino of terminos_vagos) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.vagueTerm(termino), severidad: 'media', origen: ORIGEN });
    preguntas.push({ id: nextId('PRE'), pregunta: t.qVagueTerm(termino), origen: ORIGEN });
  }

  const mencionaDatosSensibles = /\b(correo|email|telefono|phone|dni|curp|rfc|tarjeta|card|ssn|passport)\b/i.test(JSON.stringify(parser));
  const mencionaProteccion = /\b(cifrar|encriptar|encrypt|anonimizar|anonymize|proteger|protect|privacidad|privacy|gdpr|hipaa)\b/i.test(JSON.stringify(parser));
  if (mencionaDatosSensibles && !mencionaProteccion) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.sensitiveData, severidad: 'alta', origen: ORIGEN });
  }

  if (roles_detectados.length === 0) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.rolesMissing, severidad: 'media', origen: ORIGEN });
  }
  if (!banderas.tiene_errores) {
    ambiguedades.push({ id: nextId('AMB'), descripcion: t.altStatesMissing, severidad: 'media', origen: ORIGEN });
  }

  return { ambiguedades, preguntas, criterios };
}

function tc(nextId, titulo, precondiciones, pasos, resultado_esperado) {
  return { id: nextId('TC'), titulo, precondiciones, pasos, resultado_esperado, origen: ORIGEN };
}
function ec(nextId, descripcion) { return { id: nextId('EDGE'), descripcion, origen: ORIGEN }; }
function rk(nextId, descripcion, severidad = 'media') { return { id: nextId('RISK'), descripcion, severidad, origen: ORIGEN }; }

function reglasFormulario(parser, nextId, t) {
  return {
    criterios: [
      { id: nextId('CA'), criterio: t.form_ca1, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.form_ca2, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.form_ca3, origen: ORIGEN }
    ],
    test_cases: [
      tc(nextId, t.form_tc1_t, t.form_tc1_pre, t.form_tc1_p, t.form_tc1_r),
      tc(nextId, t.form_tc2_t, t.form_tc2_pre, t.form_tc2_p, t.form_tc2_r),
      tc(nextId, t.form_tc3_t, t.form_tc3_pre, t.form_tc3_p, t.form_tc3_r)
    ],
    edges: [ec(nextId, t.form_e1), ec(nextId, t.form_e2)],
    riesgos: [rk(nextId, t.form_r1, 'alta'), rk(nextId, t.form_r2, 'media')]
  };
}

function reglasAutenticacion(parser, nextId, t) {
  return {
    criterios: [
      { id: nextId('CA'), criterio: t.auth_ca1, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.auth_ca2, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.auth_ca3, origen: ORIGEN }
    ],
    test_cases: [
      tc(nextId, t.auth_tc1_t, t.auth_tc1_pre, t.auth_tc1_p, t.auth_tc1_r),
      tc(nextId, t.auth_tc2_t, t.auth_tc2_pre, t.auth_tc2_p, t.auth_tc2_r),
      tc(nextId, t.auth_tc3_t, t.auth_tc3_pre, t.auth_tc3_p, t.auth_tc3_r)
    ],
    edges: [ec(nextId, t.auth_e1), ec(nextId, t.auth_e2)],
    riesgos: [rk(nextId, t.auth_r1, 'alta'), rk(nextId, t.auth_r2, 'alta')]
  };
}

function reglasCrud(parser, nextId, t) {
  return {
    criterios: [
      { id: nextId('CA'), criterio: t.crud_ca1, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.crud_ca2, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.crud_ca3, origen: ORIGEN }
    ],
    test_cases: [
      tc(nextId, t.crud_tc1_t, t.crud_tc1_pre, t.crud_tc1_p, t.crud_tc1_r),
      tc(nextId, t.crud_tc2_t, t.crud_tc2_pre, t.crud_tc2_p, t.crud_tc2_r),
      tc(nextId, t.crud_tc3_t, t.crud_tc3_pre, t.crud_tc3_p, t.crud_tc3_r)
    ],
    edges: [ec(nextId, t.crud_e1), ec(nextId, t.crud_e2)],
    riesgos: [rk(nextId, t.crud_r1, 'alta'), rk(nextId, t.crud_r2, 'alta')]
  };
}

function reglasTransaccion(parser, nextId, t) {
  return {
    criterios: [
      { id: nextId('CA'), criterio: t.tx_ca1, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.tx_ca2, origen: ORIGEN },
      { id: nextId('CA'), criterio: t.tx_ca3, origen: ORIGEN }
    ],
    test_cases: [
      tc(nextId, t.tx_tc1_t, t.tx_tc1_pre, t.tx_tc1_p, t.tx_tc1_r),
      tc(nextId, t.tx_tc2_t, t.tx_tc2_pre, t.tx_tc2_p, t.tx_tc2_r),
      tc(nextId, t.tx_tc3_t, t.tx_tc3_pre, t.tx_tc3_p, t.tx_tc3_r)
    ],
    edges: [ec(nextId, t.tx_e1), ec(nextId, t.tx_e2)],
    riesgos: [rk(nextId, t.tx_r1, 'alta'), rk(nextId, t.tx_r2, 'alta')]
  };
}

// Convierte escenarios BDD detectados en test cases reales y criterios concretos.
// Si la historia llega en formato Gherkin, estos test cases son de mayor calidad
// que los plantillados por tipo (porque salen del texto exacto del PO).
function reglasDesdeBDD(parser, nextId, t) {
  const bdd = parser?.bdd;
  if (!bdd || !bdd.escenarios?.length) return null;

  const criterios = [];
  const test_cases = [];

  // Background como precondición común (si existe)
  const bgGiven = bdd.background?.given || [];

  for (const sc of bdd.escenarios) {
    const titulo = sc.titulo || (t === T.en ? 'Detected scenario' : 'Escenario detectado');

    // Test case por escenario
    const givenAll = [...bgGiven, ...(sc.given || [])];
    const precondiciones = givenAll.length > 0
      ? givenAll.join('. ')
      : (t === T.en ? '(none specified)' : '(no especificadas)');
    const pasos = (sc.when || []).length > 0
      ? sc.when
      : [t === T.en ? 'Execute the main step' : 'Ejecutar paso principal'];
    const resultado = (sc.then || []).length > 0
      ? sc.then.join('. ')
      : (t === T.en ? 'The result matches the expected behavior.' : 'El resultado coincide con el comportamiento esperado.');

    test_cases.push({
      id: nextId('TC'),
      titulo,
      precondiciones,
      pasos,
      resultado_esperado: resultado,
      origen: ORIGEN
    });

    // Cada Then se convierte en un criterio de aceptación
    for (const th of (sc.then || [])) {
      criterios.push({
        id: nextId('CA'),
        criterio: th,
        origen: ORIGEN
      });
    }
  }

  // Si hay Scenario Outline con tabla de ejemplos, generar 1 test case extra por fila
  for (const ex of bdd.ejemplos || []) {
    if (!ex.tabla || !ex.tabla.rows?.length) continue;
    const headers = ex.tabla.headers || [];
    for (const row of ex.tabla.rows) {
      const params = headers.map((h, i) => `${h}=${row[i] || ''}`).join(', ');
      const tituloCaso = `${ex.titulo} [${params}]`;
      const sustituir = (text) => {
        let out = text;
        headers.forEach((h, i) => {
          out = out.replace(new RegExp(`<${h}>`, 'g'), row[i] || '');
        });
        return out;
      };
      test_cases.push({
        id: nextId('TC'),
        titulo: tituloCaso,
        precondiciones: (ex.given || []).map(sustituir).join('. ') || (t === T.en ? '(see scenario)' : '(ver escenario)'),
        pasos: (ex.when || []).map(sustituir),
        resultado_esperado: (ex.then || []).map(sustituir).join('. '),
        origen: ORIGEN
      });
    }
  }

  return { criterios, test_cases };
}

function generateRules({ parser, classification, proyecto = {}, lang = 'es' }) {
  const t = T[lang] || T.es;
  const nextId = makeIdFactory();
  const globales = reglasGlobales(parser, proyecto, nextId, t);

  const ambiguedades = [...globales.ambiguedades];
  const preguntas_refinamiento = [...globales.preguntas];
  const criterios_aceptacion = [...globales.criterios];
  let test_cases = [];
  let negativos_edge_cases = [];
  let riesgos = [];

  // 1. Si hay BDD detectado, generar test cases y criterios desde los escenarios
  const desdeBDD = reglasDesdeBDD(parser, nextId, t);
  if (desdeBDD) {
    criterios_aceptacion.push(...desdeBDD.criterios);
    test_cases.push(...desdeBDD.test_cases);
  }

  // 2. Reglas por tipo (siempre, complementan los BDD)
  const tipo = classification?.tipo_primario || 'desconocido';
  let porTipo = null;
  switch (tipo) {
    case 'formulario':    porTipo = reglasFormulario(parser, nextId, t); break;
    case 'autenticacion': porTipo = reglasAutenticacion(parser, nextId, t); break;
    case 'crud':          porTipo = reglasCrud(parser, nextId, t); break;
    case 'transaccion':   porTipo = reglasTransaccion(parser, nextId, t); break;
    default: porTipo = null;
  }

  if (porTipo) {
    criterios_aceptacion.push(...porTipo.criterios);
    // Si ya hay TC desde BDD, no agregamos los plantillados (evita ruido)
    if (test_cases.length === 0) test_cases.push(...porTipo.test_cases);
    negativos_edge_cases.push(...porTipo.edges);
    riesgos.push(...porTipo.riesgos);
  } else if (test_cases.length === 0) {
    test_cases.push(tc(nextId, t.unk_tc_t, t.unk_tc_pre, t.unk_tc_p, t.unk_tc_r));
    negativos_edge_cases.push(ec(nextId, t.unk_e));
  }

  return {
    ambiguedades,
    preguntas_refinamiento,
    criterios_aceptacion,
    test_cases,
    negativos_edge_cases,
    riesgos
  };
}

module.exports = { generateRules };
