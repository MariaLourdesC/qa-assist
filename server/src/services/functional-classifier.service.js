// functional-classifier.service.js
// Clasifica el tipo de flujo funcional. Bilingüe (es/en).

const { normalizar } = require('./story-parser.service');

const SIGNALS = {
  es: {
    formulario: [
      'campo','campos','formulario','form','input',
      'validar','validacion','obligatorio','opcional',
      'guardar','enviar','submit','formato',
      'registro','registrar','datos','llenar','completar'
    ],
    autenticacion: [
      'login','logout','iniciar sesion','cerrar sesion',
      'credencial','contrasena','password','usuario',
      'autenticar','autenticacion','sesion','token',
      'bloqueo','intentos','recuperar','mfa',
      'verificacion','codigo'
    ],
    crud: [
      'crear','editar','eliminar','borrar','modificar',
      'consultar','buscar','listar','filtrar',
      'actualizar','alta','baja','detalle',
      'registro','catalogo','tabla','listado'
    ],
    transaccion: [
      'pago','pagar','cobro','cobrar','transferir',
      'transaccion','monto','saldo','cargo',
      'confirmar','aprobar','rechazar','revertir',
      'timeout','compra','venta','factura',
      'pasarela','tarjeta','cuenta'
    ]
  },
  en: {
    formulario: [
      'field','fields','form','input','inputs',
      'validate','validation','required','optional',
      'save','submit','send','format',
      'register','registration','data','fill','complete'
    ],
    autenticacion: [
      'login','log in','logout','log out','sign in','sign out',
      'credential','credentials','password','user','username',
      'authenticate','authentication','session','token',
      'lockout','attempts','recover','mfa',
      'verification','code','two-factor','2fa'
    ],
    crud: [
      'create','edit','delete','remove','modify',
      'query','search','list','filter',
      'update','add','detail','details',
      'record','catalog','table','listing'
    ],
    transaccion: [
      'payment','pay','charge','transfer',
      'transaction','amount','balance',
      'confirm','approve','reject','reverse','refund',
      'timeout','purchase','buy','sell','sale','invoice',
      'gateway','card','account'
    ]
  }
};

const PRIORIDAD = ['formulario', 'crud', 'transaccion', 'autenticacion'];
const UMBRAL_PRIMARIO = 0.3;
const UMBRAL_SUBTIPO = 0.4;

function contarCoincidencias(texto, lista) {
  let n = 0;
  for (const termino of lista) {
    const regex = new RegExp(`\\b${termino.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(texto)) n++;
  }
  return n;
}

/**
 * Clasifica el tipo de flujo funcional.
 * @param {string} texto
 * @param {'es'|'en'} lang
 */
function classifyStory(texto, lang = 'es') {
  if (!texto || typeof texto !== 'string') {
    return {
      tipo_primario: 'desconocido',
      subtipos: [],
      confianza: 0,
      requiere_refinamiento_humano: true,
      detalle: {}
    };
  }

  const señales = SIGNALS[lang] || SIGNALS.es;
  const textoNormalizado = normalizar(texto);

  const confianzas = {};
  for (const [tipo, signs] of Object.entries(señales)) {
    const coincidentes = contarCoincidencias(textoNormalizado, signs);
    confianzas[tipo] = {
      coincidentes,
      total: signs.length,
      confianza: signs.length > 0 ? coincidentes / signs.length : 0
    };
  }

  const ranking = Object.entries(confianzas)
    .map(([tipo, data]) => ({ tipo, ...data }))
    .sort((a, b) => {
      if (b.confianza !== a.confianza) return b.confianza - a.confianza;
      return PRIORIDAD.indexOf(a.tipo) - PRIORIDAD.indexOf(b.tipo);
    });

  const ganador = ranking[0];

  if (!ganador || ganador.confianza < UMBRAL_PRIMARIO) {
    return {
      tipo_primario: 'desconocido',
      subtipos: [],
      confianza: Number((ganador?.confianza || 0).toFixed(2)),
      requiere_refinamiento_humano: true,
      detalle: confianzas
    };
  }

  const subtipos = ranking
    .slice(1)
    .filter(r => r.confianza >= UMBRAL_SUBTIPO)
    .map(r => r.tipo);

  return {
    tipo_primario: ganador.tipo,
    subtipos,
    confianza: Number(ganador.confianza.toFixed(2)),
    requiere_refinamiento_humano: false,
    detalle: confianzas
  };
}

module.exports = { classifyStory };
