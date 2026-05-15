function header(level, text) {
  return `${'#'.repeat(level)} ${text}\n`;
}

function listItems(items, formatter) {
  if (!items || items.length === 0) return '_Sin items._\n';
  return items.map(formatter).join('\n') + '\n';
}

export function analysisToMarkdown(analysis, projectName) {
  if (!analysis) return '';
  const meta = analysis.meta || {};
  const qc = analysis.quality_checks || {};
  const r = analysis.resultado || {};
  const snap = analysis.input_snapshot || {};

  const lines = [];
  const resolvedProject = snap.project_nombre || projectName || '—';

  lines.push(header(1, `Análisis QA — ${snap.titulo || 'Historia sin título'}`));
  lines.push('');
  lines.push(`> Proyecto: **${resolvedProject}**  `);
  if (snap.project_dominio) lines.push(`> Dominio: **${snap.project_dominio}**  `);
  lines.push(`> Versión: **v${analysis.version || '?'}** · Modo: **${meta.analysis_mode || '—'}**  `);
  lines.push(`> Fecha: ${analysis.created_at || ''}`);
  if (snap.fuente) lines.push(`> Fuente: ${snap.fuente}`);
  lines.push('');

  if (snap.descripcion) {
    lines.push(header(2, 'Historia original'));
    if (snap.modulo) lines.push(`**Módulo:** ${snap.modulo}  `);
    if (snap.notas_qa) lines.push(`**Notas QA:** ${snap.notas_qa}  `);
    if (snap.modulo || snap.notas_qa) lines.push('');
    lines.push('```');
    lines.push(snap.descripcion);
    lines.push('```');
    lines.push('');
  }

  if (snap.glosario?.length) {
    lines.push(header(2, `Glosario del proyecto (${snap.glosario.length} términos)`));
    snap.glosario.forEach(g => lines.push(`- **${g.termino}:** ${g.definicion}`));
    lines.push('');
  }

  if (snap.reglas_negocio?.length) {
    lines.push(header(2, `Reglas de negocio (${snap.reglas_negocio.length})`));
    snap.reglas_negocio.forEach(r => lines.push(`- [${r.tipo || 'regla'}] ${r.regla}`));
    lines.push('');
  }

  // Scores
  lines.push(header(2, 'Scores'));
  lines.push(`- **Ambigüedad:** ${meta.score_ambiguedad ?? '—'}/100`);
  lines.push(`- **Cobertura:** ${meta.score_cobertura ?? '—'}/100`);
  lines.push(`- **Complejidad:** ${meta.score_complejidad ?? '—'}/100`);
  lines.push('');

  // Quality checks
  lines.push(header(2, 'Quality Checks'));
  const checks = [
    ['Cobertura mínima', qc.cobertura_minima],
    ['Casos accionables', qc.casos_accionables],
    ['Sin supuestos infundados', qc.sin_supuestos_no_soportados],
    ['Riesgos relevantes', qc.riesgos_relevantes],
    ['Sin redundancia excesiva', qc.sin_redundancia_excesiva],
    ['Preguntas útiles', qc.preguntas_refinamiento_utiles]
  ];
  checks.forEach(([label, val]) => lines.push(`- ${val ? '✓' : '✗'} ${label}`));
  if (qc.requiere_refinamiento_humano) {
    lines.push('');
    lines.push('> ⚠️ **Requiere refinamiento humano** antes de pasar a desarrollo.');
  }
  lines.push('');

  // Estructura
  if (r.estructura_detectada) {
    const e = r.estructura_detectada;
    lines.push(header(2, 'Estructura detectada'));
    lines.push(`- **Actor:** ${e.actor || '—'}`);
    lines.push(`- **Acción:** ${e.accion || '—'}`);
    lines.push(`- **Objetivo:** ${e.objetivo || '—'}`);
    if (e.entidades_detectadas?.length)     lines.push(`- **Entidades:** ${e.entidades_detectadas.join(', ')}`);
    if (e.integraciones_detectadas?.length) lines.push(`- **Integraciones:** ${e.integraciones_detectadas.join(', ')}`);
    if (e.restricciones_detectadas?.length) lines.push(`- **Restricciones:** ${e.restricciones_detectadas.join(', ')}`);
    if (e.roles_detectados?.length)         lines.push(`- **Roles:** ${e.roles_detectados.join(', ')}`);
    lines.push('');
  }

  // Clasificación
  if (r.clasificacion_funcional) {
    const c = r.clasificacion_funcional;
    lines.push(header(2, 'Clasificación funcional'));
    lines.push(`- **Tipo primario:** ${c.tipo_primario || '—'}`);
    lines.push(`- **Confianza:** ${Math.round((c.confianza || 0) * 100)}%`);
    if (c.subtipos?.length) lines.push(`- **Subtipos:** ${c.subtipos.join(', ')}`);
    lines.push('');
  }

  // Ambigüedades
  lines.push(header(2, `Ambigüedades (${(r.ambiguedades || []).length})`));
  lines.push(listItems(r.ambiguedades, (i) => `- **${i.id}** [${i.severidad || '—'}] · ${i.descripcion}`));

  // Preguntas
  lines.push(header(2, `Preguntas de refinamiento (${(r.preguntas_refinamiento || []).length})`));
  lines.push(listItems(r.preguntas_refinamiento, (i) => `- **${i.id}** · ${i.pregunta}`));

  // Criterios
  lines.push(header(2, `Criterios de aceptación (${(r.criterios_aceptacion || []).length})`));
  lines.push(listItems(r.criterios_aceptacion, (i) => `- **${i.id}** · ${i.criterio}`));

  // Test cases
  lines.push(header(2, `Test Cases (${(r.test_cases || []).length})`));
  if (r.test_cases?.length) {
    r.test_cases.forEach(tc => {
      lines.push(`### ${tc.id}: ${tc.titulo}`);
      if (tc.precondiciones) lines.push(`**Precondiciones:** ${tc.precondiciones}`);
      if (tc.pasos?.length) {
        lines.push('**Pasos:**');
        tc.pasos.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
      }
      if (tc.resultado_esperado) lines.push(`**Resultado esperado:** ${tc.resultado_esperado}`);
      lines.push('');
    });
  } else {
    lines.push('_Sin test cases._\n');
  }

  // Edge cases
  lines.push(header(2, `Edge Cases / Negativos (${(r.negativos_edge_cases || []).length})`));
  lines.push(listItems(r.negativos_edge_cases, (i) => `- **${i.id}** · ${i.descripcion}`));

  // Riesgos
  lines.push(header(2, `Riesgos (${(r.riesgos || []).length})`));
  lines.push(listItems(r.riesgos, (i) => `- **${i.id}** [${i.severidad || '—'}] · ${i.descripcion}`));

  return lines.join('\n');
}

// ── CSV export ────────────────────────────────────────────────────────────

function csvCell(value) {
  const str = value == null ? '' : String(value);
  // RFC 4180: wrap in quotes if contains comma, newline or quote; escape inner quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells) {
  return cells.map(csvCell).join(',');
}

export function analysisToCSV(analysis) {
  if (!analysis) return '';
  const r = analysis.resultado || {};
  const snap = analysis.input_snapshot || {};
  const storyTitle = snap.titulo || '';

  const headers = ['ID', 'Tipo', 'Historia', 'Módulo', 'Fuente', 'Título', 'Precondiciones', 'Pasos', 'Resultado esperado', 'Origen', 'Versión'];
  const rows = [csvRow(headers)];

  const version = `v${analysis.version || '?'}`;

  const modulo = snap.modulo || '';
  const fuente = snap.fuente || '';

  (r.test_cases || []).forEach(tc => {
    rows.push(csvRow([
      tc.id,
      'Test Case',
      storyTitle,
      modulo,
      fuente,
      tc.titulo,
      tc.precondiciones || '',
      (tc.pasos || []).join(' | '),
      tc.resultado_esperado || '',
      tc.origen || 'local',
      version
    ]));
  });

  (r.negativos_edge_cases || []).forEach(ec => {
    rows.push(csvRow([
      ec.id,
      'Edge Case',
      storyTitle,
      modulo,
      fuente,
      ec.descripcion || ec.titulo || '',
      ec.precondiciones || '',
      (ec.pasos || []).join(' | '),
      ec.resultado_esperado || '',
      ec.origen || 'local',
      version
    ]));
  });

  // UTF-8 BOM so Excel opens it correctly
  return '﻿' + rows.join('\r\n');
}

export function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text) {
  return (text || 'analisis')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
