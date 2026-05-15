-- QA Assist MVP - Schema v1

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  dominio TEXT,
  contexto_general TEXT,
  glosario_json TEXT DEFAULT '[]',
  reglas_negocio_json TEXT DEFAULT '[]',
  sensibilidad TEXT NOT NULL DEFAULT 'interno',
  config_analisis_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL,
  titulo      TEXT    NOT NULL,
  modulo      TEXT,
  descripcion TEXT    NOT NULL,
  fuente      TEXT,
  notas_qa    TEXT,
  estado      TEXT    NOT NULL DEFAULT 'draft',
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id     INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  analysis_mode TEXT NOT NULL,
  prompt_version TEXT,
  input_snapshot_json TEXT NOT NULL,
  parser_output_json TEXT NOT NULL,
  classification_json TEXT NOT NULL,
  local_output_json TEXT NOT NULL,
  llm_output_json TEXT,
  final_output_json TEXT NOT NULL,
  quality_checks_json TEXT NOT NULL,
  score_ambiguedad INTEGER,
  score_cobertura INTEGER,
  score_complejidad INTEGER,
  cache_key         TEXT,
  traceability_json TEXT,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_story_id ON analysis_runs(story_id);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_cache_key ON analysis_runs(cache_key);

CREATE TABLE IF NOT EXISTS analysis_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_run_id INTEGER NOT NULL,
  utilidad TEXT NOT NULL,
  comentario TEXT,
  copied_blocks_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  prompt_version TEXT,
  sanitized_input_json TEXT NOT NULL,
  llm_output_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_user ON analysis_cache(user_id);

CREATE TABLE IF NOT EXISTS test_executions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_run_id INTEGER NOT NULL,
  environment     TEXT,
  notes           TEXT,
  completed_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_executions_run ON test_executions(analysis_run_id);

CREATE TABLE IF NOT EXISTS test_execution_results (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id       INTEGER NOT NULL,
  tc_id              TEXT    NOT NULL,
  tc_titulo          TEXT    NOT NULL,
  status             TEXT    NOT NULL DEFAULT 'pending',
  bug_titulo         TEXT,
  bug_pasos_reales   TEXT,
  bug_severidad      TEXT    DEFAULT 'media',
  bug_ambiente       TEXT,
  bug_screenshot_url TEXT,
  bug_jira_key       TEXT,
  updated_at         TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES test_executions(id) ON DELETE CASCADE
);
