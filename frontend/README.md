# QA Assist Frontend - React + Vite

Frontend para **QA Assist MVP**: Story Analyzer con análisis local de historias/requerimientos.

## Quick Start

### 1. Instalar dependencias
```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno
El archivo `.env.local` ya está configurado con:
```
VITE_API_BASE_URL=http://localhost:3001
```

Asegúrate que el backend está corriendo en ese puerto.

### 3. Arrancar frontend
```bash
npm run dev
```

Frontend estará disponible en: **http://localhost:5173**

### 4. Usar la aplicación

1. **Proyectos** (`/projects`): 
   - Crear proyectos
   - Definir glosario (términos + definiciones)
   - Definir reglas de negocio
   - Establecer sensibilidad (restringido = IA bloqueada)

2. **Story Analyzer** (`/projects/:projectId`):
   - Ingresar historia/requerimiento
   - Seleccionar modo: Local Only o Hybrid
   - Analizar
   - Ver 10 tabs de resultados
   - Copiar bloques
   - Proporcionar feedback
   - Ver versiones anteriores

## Stack

- **React 18** - UI framework
- **Vite** - Build tool + dev server (fast HMR)
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Styling
- **Fetch API** - HTTP client

## Arquitectura

### Pages
- `ProjectsPage.jsx` - Listado y gestión de proyectos
- `StoryAnalyzerPage.jsx` - Análisis de historias (2-columna)

### Components
- `ProjectList.jsx`, `ProjectForm.jsx` - CRUD proyectos
- `InlineTable.jsx` - Edición inline de glosario/reglas
- `StoryForm.jsx` - Input de historia
- `AnalysisModeSelector.jsx` - Local vs Hybrid
- `ResultTabs.jsx` - Contenedor de tabs
- `panels/*` - 10 panels para resultados (Estructura, Clasificación, Ambigüedades, Preguntas, Criterios, Test Cases, Edge Cases, Riesgos, Quality Checks, Scores)
- `FeedbackBar.jsx` - Utilidad + comentarios
- `CopyButton.jsx` - Copy to clipboard
- `ItemBadges.jsx` - Badges reutilizables

### Hooks
- `useFetch()` - Async API calls con error handling
- `useProjects()` - Gestión de lista de proyectos
- `useAnalysis()` - Gestión de análisis + versiones
- `useToast()` - Notificaciones toast

### Context
- `ToastContext.jsx` - Toast notifications (global state)

### API
- `api/client.js` - Wrapper fetch para todos los endpoints

## Características

✅ CRUD proyectos (incluyendo glosario y reglas de negocio inline)  
✅ CRUD historias  
✅ Análisis local determinístico  
✅ 10 tabs de resultados organizados  
✅ Versionado (V1, V2, etc)  
✅ Copy to clipboard (bloques individuales o todo)  
✅ Feedback (utilidad + comentarios)  
✅ Toast notifications  
✅ Responsive design (desktop, tablet, mobile)  
✅ Modo Hybrid preparado (IA optional, pendiente fase 3)  

## Build para producción

```bash
npm run build
```

Output en `dist/`. Deploy a cualquier server estático (Vercel, Netlify, S3, etc).

## Notas

- API base URL configurable via `.env.local`
- Sin unit tests en MVP (agregar post-MVP)
- Componentes custom (sin librerías de UI pesadas)
- Accesibilidad básica (semántica HTML, labels, aria)

## Próximos pasos

1. Arrancar backend: `cd ../server && npm run dev`
2. Arrancar frontend: `npm run dev`
3. Crear un proyecto
4. Crear una historia
5. Analizar y ver resultados
6. Dar feedback
7. Re-analizar (nueva versión)
