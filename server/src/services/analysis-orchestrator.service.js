// analysis-orchestrator.service.js
// Coordina el pipeline completo: detect lang -> parser -> classifier ->
// rules -> dedupe -> enrichment IA -> scores -> quality checks.

const crypto = require('crypto');
const { parseStory } = require('./story-parser.service');
const { classifyStory } = require('./functional-classifier.service');
const { generateRules } = require('./qa-rules-engine.service');
const { dedupeCompact } = require('./dedupe-compact.service');
const { calculateScores } = require('./scoring.service');
const { runQualityChecks } = require('./quality-checks.service');
const { enrichWithIA } = require('./ia-enrichment.service');
const { detectLanguage } = require('./language-detector.service');

// ── Cache key — includes userId so results are never shared across users ──
function makeCacheKey(userId, story, project) {
  const content = JSON.stringify({
    u: String(userId),
    d: (story.descripcion || '').trim(),
    g: (project.glosario || [])
      .map(g => `${g.termino}::${g.definicion}`)
      .sort()
      .join('|'),
    r: (project.reglas_negocio || [])
      .map(r => r.regla || '')
      .sort()
      .join('|')
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}

function readCache(db, cacheKey) {
  try {
    const rows = db.exec(
      'SELECT llm_output_json FROM analysis_cache WHERE cache_key = ?',
      [cacheKey]
    );
    if (rows.length && rows[0].values.length) {
      return JSON.parse(rows[0].values[0][0]);
    }
  } catch {}
  return null;
}

function writeCache(db, cacheKey, userId, story, resultado) {
  try {
    db.run(
      `INSERT OR REPLACE INTO analysis_cache
         (cache_key, user_id, sanitized_input_json, llm_output_json, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        cacheKey,
        userId,
        JSON.stringify({ descripcion: story.descripcion }),
        JSON.stringify(resultado)
      ]
    );
  } catch {}
}

/**
 * Ejecuta el pipeline de análisis sobre una historia.
 * @param {object} params
 * @param {object} params.story
 * @param {object} params.project      - { glosario, reglas_negocio, sensibilidad, ... }
 * @param {string} params.analysisMode - "local_only" | "hybrid"
 * @param {number} [params.userId]     - required for cache isolation in hybrid mode
 * @param {object} [params.db]         - sql.js DB instance, required for cache
 * @returns {{ meta, quality_checks, resultado, _internal, _cacheKey }}
 */
async function analyze({ story, project, analysisMode = 'local_only', userId = null, db = null }) {
  if (!story?.descripcion) {
    throw new Error('La historia no tiene descripcion');
  }

  // 0. Detectar idioma de la historia (es/en)
  const lang = detectLanguage(story.descripcion);

  // 1. Parser (con glosario, en idioma detectado)
  const parser = parseStory(story.descripcion, project?.glosario || [], lang);

  // 2. Clasificador
  const classification = classifyStory(story.descripcion, lang);

  // 3. Rules engine (plantillas en idioma detectado)
  const resultadoCrudo = generateRules({ parser, classification, proyecto: project, lang });

  // 4. Dedupe + límites
  let resultado = dedupeCompact(resultadoCrudo, parser);

  // 4.5. Enrichment IA — con cache por usuario
  let llm_meta = { used: false, reason: 'mode_local_only' };
  let cacheKey = null;

  if (analysisMode === 'hybrid') {
    if (project?.sensibilidad === 'restringido') {
      llm_meta = { used: false, reason: 'project_restricted' };
    } else {
      let fromCache = false;

      // Try cache if we have userId + db
      if (userId && db) {
        cacheKey = makeCacheKey(userId, story, project);
        const cached = readCache(db, cacheKey);
        if (cached) {
          resultado = cached;
          llm_meta = { used: true, from_cache: true };
          fromCache = true;
        }
      }

      if (!fromCache) {
        try {
          const enrichment = await enrichWithIA({ story, project, localResult: resultado, lang });
          resultado = enrichment.resultado;
          llm_meta = enrichment.llm_meta;

          // Persist to cache only when IA actually produced results
          if (llm_meta.used && userId && db && cacheKey) {
            writeCache(db, cacheKey, userId, story, resultado);
          }
        } catch (err) {
          llm_meta = { used: false, error: err.message || 'enrichment_failed' };
        }
      }
    }
  }

  // 5. Scores
  const scores = calculateScores({ parser, classification, resultado });

  // 6. Quality checks
  const quality_checks = runQualityChecks({ resultado, parser, classification, scores });

  return {
    meta: {
      analysis_mode: analysisMode,
      prompt_version: null,
      lang,
      uso_ia: !!llm_meta.used,
      from_cache: !!llm_meta.from_cache,
      bloques_generados_por_ia: llm_meta.bloques_generados_por_ia || [],
      score_ambiguedad: scores.score_ambiguedad,
      score_cobertura: scores.score_cobertura,
      score_complejidad: scores.score_complejidad
    },
    quality_checks,
    resultado: {
      estructura_detectada: parser,
      clasificacion_funcional: classification,
      ambiguedades: resultado.ambiguedades,
      preguntas_refinamiento: resultado.preguntas_refinamiento,
      criterios_aceptacion: resultado.criterios_aceptacion,
      test_cases: resultado.test_cases,
      negativos_edge_cases: resultado.negativos_edge_cases,
      riesgos: resultado.riesgos
    },
    _internal: {
      parser_output: { ...parser, lang },
      classification,
      local_output: resultado,
      llm_meta,
      lang
    },
    _cacheKey: cacheKey
  };
}

module.exports = { analyze };
