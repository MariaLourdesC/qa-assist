# QA Assist MVP

Sistema de análisis de historias de usuario y gestión del ciclo QA completo.

## Qué hace

- **Análisis de historias** — parser BDD, clasificador funcional, generación de test cases, edge cases, criterios de aceptación, ambigüedades y riesgos
- **Enriquecimiento con IA** — modo híbrido vía Claude API (Anthropic)
- **Ejecución de tests** — ciclo completo pass/fail/blocked/skip con bug reports inline
- **Trazabilidad AC → TC** — matriz editable que persiste por análisis
- **Dashboard QA** — métricas por proyecto y por módulo, tendencia de scores
- **Integración Jira** — importar historias, exportar bugs
- **Export** — Markdown, CSV, JSON, PDF (análisis y reporte de ejecución)
- **Multi-tenant** — cada usuario ve solo sus proyectos

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | Node.js 20 + Express + sql.js (SQLite) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT (httpOnly cookies, 15min access + 7d refresh) |
| AI | Anthropic Claude (opcional, modo híbrido) |
| Deploy | Docker Compose + nginx |

---

## Desarrollo local

### Prerequisitos

- Node.js 20+
- npm 9+

### Setup

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/qa-assist-mvp.git
cd qa-assist-mvp

# 2. Backend
cd server
cp .env.example .env       # editar JWT_SECRET y JWT_REFRESH_SECRET
pnpm install
pnpm dev                # arranca en http://localhost:3001

# 3. Frontend (nueva terminal)
cd frontend
pnpm install
pnpm dev                # arranca en http://localhost:5173
```

La app queda disponible en **http://localhost:5173**

> El frontend usa el proxy de Vite para reenviar `/api` y `/auth` al backend — las cookies httpOnly funcionan sin configurar CORS.

### Variables de entorno (desarrollo)

El archivo `server/.env` mínimo para dev:

```env
JWT_SECRET=cualquier-string-largo
JWT_REFRESH_SECRET=otro-string-distinto
LOG_LEVEL=debug
```

El resto de variables son opcionales en dev:
- `ANTHROPIC_API_KEY` — necesaria para el modo híbrido (IA)
- `SMTP_*` — necesarias para que funcione el reset de contraseña por email (sin esto el token aparece en la respuesta en dev)

Ver `server/.env.example` para la lista completa.

---

## Tests

```bash
cd server
pnpm test                   # corre los 156 tests con Vitest
pnpm test:watch         # modo watch
pnpm test:coverage      # con cobertura
```

Los tests cubren el pipeline completo: parser BDD, clasificador, rules engine, dedupe, scoring y quality checks.

---

## Migraciones de base de datos

Si actualizás desde una versión anterior, corré las migraciones pendientes:

```bash
cd server
node scripts/001_migrate_auth.js
node scripts/002_add_password_resets.js
node scripts/003_add_custom_templates.js
node scripts/004_add_user_id_to_cache.js
node scripts/005_add_cascade_delete.js
node scripts/006_add_executions.js
node scripts/007_add_traceability.js
node scripts/008_add_tc_tags.js
node scripts/009_add_bug_status.js
```

> En instalaciones nuevas no es necesario — el schema se crea automáticamente.

---

## Estructura del proyecto

```
qa-assist-mvp/
├── server/                    # Backend Node.js
│   ├── src/
│   │   ├── routes/            # Express routes (auth, projects, stories, analyses, executions, jira, templates)
│   │   ├── services/          # Pipeline: parser, classifier, rules, dedupe, scoring, IA enrichment
│   │   ├── middleware/        # authenticate, adminOnly, requestLogger
│   │   ├── db/                # schema.sql + connection (sql.js)
│   │   └── utils/             # validate, logger, mailer
│   ├── tests/                 # Vitest unit + integration tests
│   ├── scripts/               # Migraciones de DB
│   └── .env.example
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── pages/             # ProjectsPage, StoryAnalyzerPage, LoginPage, ProfilePage
│   │   ├── components/        # Todos los componentes UI
│   │   ├── context/           # AuthContext, ThemeContext, LanguageContext, ToastContext
│   │   ├── hooks/             # useAnalysis, useFetch, useProjects, useHotkey
│   │   ├── api/               # client.js (fetch wrapper con JWT refresh)
│   │   └── i18n/              # es.json + en.json
│   └── nginx.conf             # Config para producción
├── .github/workflows/
│   ├── ci.yml                 # Tests + build en cada push/PR
│   └── cd.yml                 # Deploy a VPS (requiere aprobación manual)
├── docker-compose.yml
├── DEPLOY.md                  # Guía de deploy paso a paso
└── scripts/
    └── setup-vps.sh           # Script de setup del servidor
```

---

## Deploy a producción

Ver [DEPLOY.md](DEPLOY.md) para la guía completa con Docker Compose + nginx + HTTPS.

```bash
# Quick start (asumiendo VPS con Docker)
git clone https://github.com/TU_USUARIO/qa-assist-mvp.git
cd qa-assist-mvp/server && cp .env.example .env && nano .env
cd .. && docker compose build && docker compose up -d
```

---

## CI/CD

- **CI** — corre automáticamente en cada push y PR: tests + build + docker build check
- **CD** — deploy automático a producción al hacer push a `main`, con **aprobación manual requerida** antes de ejecutar

Los secrets necesarios en GitHub Actions: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PATH`

---

## Licencia

MIT
