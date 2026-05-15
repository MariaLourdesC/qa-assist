// language-detector.service.js
// Heurística simple para detectar si un texto está en español o inglés.
// Cuenta stopwords frecuentes de cada idioma. Default: 'es'.

const ES_WORDS = [
  'el','la','los','las','un','una','unos','unas','de','del','que','y','en','con','por','para',
  'como','si','no','mi','tu','su','sus','se','lo','le','les','ya','mas','pero','o','u','al',
  'es','son','ser','estar','esta','este','estos','estas','quiero','necesito','puedo','debe',
  'debo','muy','bien','cada','cuando','donde','quien','sobre','desde','hasta','entre','sin'
];

const EN_WORDS = [
  'the','a','an','of','to','in','for','on','with','as','is','are','be','will','can','should',
  'would','this','that','these','those','i','you','he','she','it','we','they','my','your',
  'his','her','their','want','need','must','have','has','had','do','does','did','from',
  'into','about','at','by','if','then','else','when','where','who','whom','which','while'
];

function normalize(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function countMatches(text, words) {
  let n = 0;
  for (const w of words) {
    const re = new RegExp(`\\b${w}\\b`, 'g');
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}

/**
 * Detecta el idioma del texto.
 * @param {string} text
 * @returns {'es'|'en'}
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'es';
  const t = normalize(text);
  const es = countMatches(t, ES_WORDS);
  const en = countMatches(t, EN_WORDS);
  // Empate o ambos cero → default español (idioma principal del proyecto)
  if (en > es) return 'en';
  return 'es';
}

module.exports = { detectLanguage };
