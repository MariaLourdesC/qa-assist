# QA Assist - MVP Spec Definitivo v2

## Story Analyzer hibrido, versionado y trazable

---

## 1. Objetivo del MVP

Convertir una historia o requerimiento ambiguo en una salida QA util y reutilizable:

- ambiguedades
- preguntas de refinamiento
- criterios de aceptacion
- test cases base
- edge cases / negativos
- riesgos

**Regla principal: local primero, IA opcional y estrictamente limitada.**

---

## 2. Alcance

### Si entra en este MVP

- proyecto y contexto simple por proyecto
- registro de historias o requerimientos
- analisis local deterministico
- clasificacion funcional del flujo
- rules engine especializado
- deduplicacion y compactacion
- quality checks con reglas concretas
- scores calculados por heuristicas definidas
- versionado de analisis con logica de incremento
- feedback de utilidad
- modo hibrido con IA opcional
- sanitizacion antes de IA con tokens indexados
- manejo de errores en cada paso del pipeline

### No entra todavia

- chat
- memoria entre historias
- integracion Jira / Azure DevOps
- exportacion compleja a Excel o Word
- RAG
- edicion libre completa del resultado
- multiusuario
- login complejo
- dashboards
- analytics avanzados
- libreria gigante de prompts
- importacion masiva de historias

---

## 3. Decisiones de base

| Bloque | Decision | Razon |
|---|---|---|
| Motor | Local primero, IA opcional | Reduce costo, dependencia y exposicion de datos |
| Producto | Un flujo principal | Evita dispersion: historia -> analisis QA usable |
| Persistencia | SQLite + JSON estructurado | Simple para MVP y suficiente para versionado |
| UI | Formulario + paneles | Mas estable y accionable que un chat |
| Seguridad | Sensibilidad por proyecto | Permite bloquear IA cuando el contexto lo exige |

---

## 4. Definicion del MVP

**Nombre:** Story Analyzer v1

**Proposito:** Analizar una historia o requerimiento y devolver un resultado QA confiable, con trazabilidad y bajo costo operativo.

### Limite exacto

**No intenta:**

- reemplazar al QA
- generar la especificacion completa del sistema
- producir todos los casos posibles
- decidir por si solo que ticket crear

**Si intenta:**

- darte una primera base solida
- obligarte a detectar huecos del requerimiento
- acelerar tu trabajo real
- dejar registro reutilizable

---

## 5. Flujo del modulo

```
1. Seleccionar proyecto
2. Registrar o pegar historia
3. Normalizar la entrada
4. Ejecutar parser local (usa glosario del proyecto)
5. Clasificar el tipo de flujo funcional (con heuristica definida)
6. Aplicar rules engine especializado (incluye reglas de negocio del proyecto)
7. Deduplicar y compactar salida
8. Calcular scores (ambiguedad, cobertura, complejidad)
9. Ejecutar quality checks
10. Guardar version base
11. Solo si aplica: sanitizar y enriquecer bloques concretos con IA
12. Si hubo IA: fusionar resultado, re-deduplicar, recalcular quality checks
13. Guardar version final con trazabilidad
14. Permitir feedback de utilidad
```

**Manejo de errores en el pipeline:**

| Paso | Si falla | Accion |
|---|---|---|
| Parser | Error critico | No se puede continuar. Mostrar error al usuario |
| Clasificador | Confianza < 0.3 | Tipo = "desconocido", continuar con reglas globales |
| Rules engine | Produce 0 test cases | quality_checks.cobertura_minima = false, continuar |
| Sanitizer | Bloquea envio | No llamar IA, continuar con salida local |
| IA | Timeout / error / rechazo | Usar salida local como final, marcar uso_ia = false |
| Merge | Conflicto | Local gana siempre, IA solo agrega items nuevos |

---

## 6. Arquitectura

### Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Base de datos: SQLite

### Pipeline funcional

```
Historia
  -> normalizacion
  -> parser local (+ glosario del proyecto)
  -> clasificador funcional (con heuristica de señales)
  -> rules engine especializado (+ reglas de negocio del proyecto)
  -> dedupe / compactacion
  -> calculo de scores
  -> quality checks
  -> sanitizacion (si aplica IA)
  -> enriquecimiento IA opcional
  -> merge (local base + IA complementa)
  -> re-dedupe si hubo merge
  -> persistencia
```

---

## 7. Componentes del backend

### 7.1 story-parser.service.js

**Responsabilidad:** Extraer estructura base de la historia.

**Inputs adicionales:** glosario del proyecto (para no marcar como vago un termino definido en el glosario).

**Salida:**

```json
{
  "actor": "",
  "accion": "",
  "objetivo": "",
  "entidades_detectadas": [],
  "integraciones_detectadas": [],
  "restricciones_detectadas": [],
  "roles_detectados": [],
  "terminos_vagos": [],
  "banderas": {
    "tiene_actor": false,
    "tiene_accion": false,
    "tiene_objetivo": false,
    "tiene_validaciones": false,
    "tiene_errores": false
  }
}
```

**Diccionario de terminos vagos (base inicial):**

```javascript
const TERMINOS_VAGOS = [
  // Calidad indefinida
  "adecuado", "adecuadamente", "correcto", "correctamente",
  "apropiado", "apropiadamente", "optimo", "optimamente",
  "robusto", "seguro",
  // Velocidad indefinida
  "rapido", "rapidamente", "en tiempo real", "inmediatamente",
  // Facilidad indefinida
  "facil", "facilmente", "simple", "simplemente",
  "amigable", "intuitivo", "moderno",
  // Eficiencia indefinida
  "eficiente", "eficientemente",
  // Cantidad indefinida
  "varios", "algunos", "muchos", "pocos",
  // Comodines
  "etc", "y demas", "entre otros",
  "cuando sea necesario", "si aplica", "segun corresponda",
  // Calidad general
  "bien", "mejor", "bueno"
];
```

**Regla:** Si un termino esta en el glosario del proyecto con definicion concreta, NO se marca como vago aunque aparezca en esta lista.

---

### 7.2 functional-classifier.service.js

**Responsabilidad:** Clasificar el tipo de flujo para disparar reglas correctas.

**Salida:**

```json
{
  "tipo_primario": "formulario",
  "subtipos": ["alta_datos"],
  "confianza": 0.81
}
```

**Heuristica de clasificacion:**

Cada tipo tiene un conjunto de señales. La confianza se calcula como:

```
confianza = señales_coincidentes / total_señales_del_tipo
```

**Señales por tipo:**

```javascript
const SEÑALES = {
  formulario: [
    "campo", "campos", "formulario", "form", "input",
    "validar", "validacion", "obligatorio", "opcional",
    "guardar", "enviar", "submit", "formato",
    "registro", "registrar", "datos", "llenar", "completar"
  ],
  autenticacion: [
    "login", "logout", "iniciar sesion", "cerrar sesion",
    "credencial", "contraseña", "password", "usuario",
    "autenticar", "autenticacion", "sesion", "token",
    "bloqueo", "intentos", "recuperar", "mfa",
    "verificacion", "codigo"
  ],
  crud: [
    "crear", "editar", "eliminar", "borrar", "modificar",
    "consultar", "buscar", "listar", "filtrar",
    "actualizar", "alta", "baja", "detalle",
    "registro", "catalogo", "tabla", "listado"
  ],
  transaccion: [
    "pago", "pagar", "cobro", "cobrar", "transferir",
    "transaccion", "monto", "saldo", "cargo",
    "confirmar", "aprobar", "rechazar", "revertir",
    "timeout", "compra", "venta", "factura",
    "pasarela", "tarjeta", "cuenta"
  ]
};
```

**Reglas de clasificacion:**

1. Contar señales coincidentes para cada tipo
2. El tipo con mas coincidencias es el `tipo_primario`
3. Si el ganador tiene confianza < 0.3: tipo = "desconocido"
4. Si hay un segundo tipo con confianza >= 0.4: agregarlo como subtipo
5. Desempate: prioridad formulario > crud > transaccion > autenticacion

**Manejo de "desconocido":**

- Se aplican solo reglas globales (ver seccion 9)
- Se marca `requiere_refinamiento_humano = true` automaticamente
- Se muestra advertencia en UI: "No se pudo clasificar esta historia. El analisis sera basico. Considera agregar mas detalle."

---

### 7.3 qa-rules-engine.service.js

**Responsabilidad:** Generar base QA segun clasificacion funcional.

Debe producir:

- ambiguedades
- preguntas de refinamiento
- criterios de aceptacion
- test cases base
- negativos / edge cases
- riesgos base

**(Reglas detalladas en seccion 9)**

---

### 7.4 dedupe-compact.service.js

**Responsabilidad:**

- Eliminar duplicados obvios
- Fusionar elementos demasiado parecidos
- Limitar ruido
- Priorizar antes de inflar

**Algoritmo de similitud (v1 - simple):**

```
1. Tokenizar: quitar articulos, preposiciones, signos
2. Comparar conjuntos de tokens entre dos items
3. similitud = tokens_comunes / tokens_totales_union
4. Si similitud > 0.80: son redundantes, quedarse con el mas completo
5. "Mas completo" = el que tiene mas caracteres (heuristica simple)
```

**Limites maximos por bloque:**

| Bloque | Maximo |
|---|---|
| ambiguedades | 8 |
| preguntas_refinamiento | 8 |
| criterios_aceptacion | 10 |
| test_cases | 12 |
| negativos_edge_cases | 8 |
| riesgos | 6 |

Si se excede, priorizar por relevancia (los que referencian mas entidades/integraciones de la historia van primero).

---

### 7.5 quality-checks.service.js

**Responsabilidad:** Medir si la salida es util o floja.

**(Reglas detalladas en seccion 12)**

---

### 7.6 sanitizer.service.js

**Responsabilidad:** Anonimizar o bloquear antes de enviar algo a IA.

**Tokens de reemplazo (indexados para preservar distincion):**

| Patron detectado | Token de reemplazo |
|---|---|
| correo electronico | `[EMAIL_1]`, `[EMAIL_2]`, ... |
| telefono | `[PHONE_1]`, `[PHONE_2]`, ... |
| URL interna (IP, .local, .internal, intranet) | `[INTERNAL_URL_1]`, ... |
| host/IP interno | `[INTERNAL_HOST_1]`, ... |
| nombre de cliente/persona | `[CLIENT_NAME_1]`, ... |
| endpoint API | `[API_ENDPOINT_1]`, ... |
| ID sensible (DNI, CURP, RFC, etc.) | `[SENSITIVE_ID_1]`, ... |

**Patrones que BLOQUEAN el envio (no reemplazan, cancelan):**

```javascript
const PATRONES_BLOQUEANTES = [
  /bearer\s+[a-zA-Z0-9\-._~+\/]+=*/i,
  /api[_-]?key[\s:="']+[a-zA-Z0-9]{16,}/i,
  /password[\s:="']+.{4,}/i,
  /secret[\s:="']+.{4,}/i,
  /cookie[\s:="']+.{8,}/i,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i
];
```

Si detecta cualquiera de estos: **bloqueo automatico, no se pregunta al usuario, no se envia a IA.**

El sanitizer debe devolver:

```json
{
  "texto_sanitizado": "...",
  "bloqueado": false,
  "razon_bloqueo": null,
  "reemplazos_realizados": [
    { "original_hint": "email en posicion 45", "token": "[EMAIL_1]" }
  ],
  "mapa_reverso": { "[EMAIL_1]": "juan@empresa.com" }
}
```

El `mapa_reverso` se usa internamente para re-hidratar la salida de IA. Nunca se persiste ni se envia.

---

### 7.7 llm-enhancer.service.js

**Responsabilidad:** Enriquecer bloques concretos, no regenerar todo.

**Configuracion:**

```javascript
const LLM_CONFIG = {
  modelo: "claude-haiku-4-5-20251001", // costo bajo para MVP
  max_tokens: 1500,
  timeout_ms: 15000,
  reintentos: 1,
  bloques_permitidos: [
    "preguntas_refinamiento",
    "negativos_edge_cases",
    "riesgos"
  ]
};
```

**Comportamiento:**

1. Recibe texto sanitizado + bloque local existente
2. Pide a la IA que **complemente** (no reemplace) lo existente
3. Si timeout o error: retorna null, el orquestador usa solo la salida local
4. Cada item retornado se marca con `"origen": "ia"`

---

### 7.8 analysis-merger.service.js

**Responsabilidad:** Fusionar salida local con salida de IA.

**Reglas de merge:**

```
1. Base = salida local (nunca se elimina nada del local)
2. Para cada bloque enriquecido por IA:
   a. Tomar items de IA
   b. Comparar con items locales usando algoritmo de similitud (mismo del dedupe)
   c. Si similitud > 0.80 con algun item local: descartar el de IA (redundante)
   d. Si no es redundante: agregar al final del bloque con "origen": "ia"
3. Aplicar limites maximos por bloque (seccion 7.4)
4. Si se excede limite: priorizar locales sobre IA
5. Recalcular quality checks sobre resultado mergeado
```

**En caso de contradiccion:** local gana siempre. La IA solo complementa, nunca reemplaza.

---

### 7.9 analysis-orchestrator.service.js

**Responsabilidad:** Coordinar todo el pipeline.

**Flujo orquestado:**

```javascript
async function analyze(storyId, config) {
  // 1. Cargar historia + proyecto (con glosario y reglas de negocio)
  // 2. Normalizar entrada
  // 3. Ejecutar parser (pasando glosario)
  //    -> Si falla: throw error
  // 4. Ejecutar clasificador
  //    -> Si confianza < 0.3: tipo = "desconocido"
  // 5. Ejecutar rules engine (pasando reglas de negocio del proyecto)
  // 6. Ejecutar dedupe
  // 7. Calcular scores
  // 8. Ejecutar quality checks
  // 9. Determinar version: MAX(version) + 1 para este story_id
  // 10. Si modo == "hybrid" Y proyecto no es restringido:
  //     a. Sanitizar entrada
  //     b. Si no bloqueado: llamar LLM por cada bloque habilitado
  //     c. Si LLM responde: ejecutar merger
  //     d. Re-deduplicar
  //     e. Recalcular quality checks
  // 11. Guardar analysis_run completo
  // 12. Actualizar estado de la historia
  // 13. Retornar resultado final
}
```

---

## 8. Clasificacion funcional inicial

| Tipo primario | Cobertura inicial | v1 |
|---|---|---|
| Formulario | campos, validaciones, errores, persistencia | Si |
| Autenticacion | credenciales, sesion, bloqueo, recuperacion | Si |
| CRUD | alta, edicion, eliminacion, permisos, duplicados | Si |
| Transaccion | exito, rechazo, timeout, duplicacion, consistencia | Si |
| Desconocido | solo reglas globales + advertencia | Si |

---

## 9. Rules engine

### 9.1 Reglas globales (siempre se aplican)

- actor faltante
- accion faltante
- objetivo faltante
- validaciones faltantes
- errores faltantes
- restricciones faltantes
- reglas de negocio faltantes
- terminos vagos detectados
- datos sensibles mencionados sin politica
- roles/permisos no definidos
- estados alternos no definidos

**Ademas:** si el proyecto tiene `reglas_negocio_json`, inyectar como criterios de aceptacion o restricciones adicionales.

### 9.2 Reglas por clasificacion funcional

**formulario:**

- campos obligatorios vs opcionales
- formatos invalidos (email, fecha, telefono, numerico)
- longitudes minima y maxima
- duplicidad de registro
- persistencia (se guarda correctamente)
- cancelacion del formulario
- edicion posterior de datos guardados
- mensajes de error por campo
- estado del boton submit (habilitado/deshabilitado)
- navegacion con campos incompletos

**autenticacion:**

- credenciales validas
- credenciales invalidas (usuario malo, password mala, ambos)
- bloqueo por intentos fallidos (cuantos?)
- sesion expirada
- usuario inactivo
- recuperacion de contraseña
- logout
- MFA si aplica
- sesion concurrente (que pasa si se loguea en 2 lugares)
- cambio de contraseña

**crud:**

- alta exitosa
- alta con datos duplicados
- edicion exitosa
- edicion de registro inexistente
- eliminacion exitosa
- eliminacion con dependencias
- consulta con resultados
- consulta sin resultados
- permisos por operacion
- paginacion si aplica
- estados intermedios (draft, activo, inactivo)

**transaccion:**

- exito completo
- rechazo (fondos, limites, reglas)
- timeout del procesador
- reintento (es seguro reintentar?)
- duplicacion de transaccion
- idempotencia
- consistencia del estado post-transaccion
- mensajes al usuario por cada caso
- conciliacion basica (lo que muestra vs lo que quedo)
- rollback parcial si aplica

### 9.3 Regla minima de salida

Cada tipo primario (excepto "desconocido") debe producir **al menos:**

- 3 test cases
- 2 negativos / edge cases
- 2 riesgos si score_complejidad >= 30

Si no llega, el quality check `cobertura_minima` falla.

Para "desconocido": al menos 1 test case, 1 negativo, y `requiere_refinamiento_humano = true`.

---

## 10. Scores - Heuristicas de calculo

### 10.1 Score de Ambiguedad (0-100, donde 100 = muy ambiguo)

Mide la historia de entrada. Se calcula con lo que detecta el parser.

| Senal detectada | Puntos |
|---|---|
| No tiene actor definido | +15 |
| No tiene accion clara | +15 |
| No tiene objetivo explicito | +10 |
| Cada termino vago encontrado | +5 c/u (max +25) |
| No menciona validaciones | +10 |
| No menciona errores / flujo alterno | +10 |
| No menciona roles o permisos | +8 |
| No menciona restricciones | +7 |

Se suma y se topa a 100.

**Ejemplo:**
> "El usuario puede hacer pagos"
>
> Actor: "usuario" (+0) | Accion: vaga (+15) | Objetivo: no explicito (+10) |
> Vagos: 0 (+0) | Validaciones: no (+10) | Errores: no (+10) |
> Roles: no (+8) | Restricciones: no (+7)
>
> **Score = 60** - historia bastante incompleta

### 10.2 Score de Cobertura (0-100, donde 100 = analisis muy completo)

Mide la salida generada, no la entrada.

| Bloque generado | Puntos |
|---|---|
| Al menos 1 ambiguedad detectada (si score_ambiguedad >= 20) | +10 |
| Al menos 2 preguntas de refinamiento | +10 |
| Al menos 3 criterios de aceptacion | +15 |
| Al menos 3 test cases | +20 |
| Al menos 2 edge cases / negativos | +15 |
| Al menos 1 riesgo | +10 |
| Todos los test cases tienen precondicion + pasos + resultado esperado | +10 |
| Clasificacion funcional con confianza >= 0.7 | +10 |

Se suma y se topa a 100.

**Interpretacion:** Score < 40 = "analisis flojo, necesitas refinar la historia o el rules engine no tiene reglas suficientes para este flujo."

### 10.3 Score de Complejidad (0-100, donde 100 = historia muy compleja)

Mide la historia de entrada.

| Senal | Puntos |
|---|---|
| Cada integracion detectada | +12 c/u (max +36) |
| Cada entidad (a partir de la 3ra) | +5 c/u (max +25) |
| Cada rol (a partir del 2do) | +8 c/u (max +24) |
| Flujo tipo transaccion | +15 |
| Autenticacion involucrada | +10 |
| Menciona concurrencia o estados | +12 |
| Cada restriccion de negocio | +5 c/u (max +20) |

Se topa a 100.

**Uso combinado:**
- Complejidad alta + Ambiguedad alta = "Historia compleja y ambigua. Alto riesgo de malentendidos. Refina antes de desarrollar."
- Complejidad alta + Ambiguedad baja = "Historia compleja pero bien definida."
- Complejidad baja + Ambiguedad alta = "Historia simple pero le falta detalle."

---

## 11. Politica de IA

### Reglas

1. **Siempre** se genera primero una base local completa
2. Si el proyecto es `restringido`: IA queda **bloqueada**
3. Si el modo es `local_only`: no se llama IA
4. En `hybrid`, solo se permite enriquecer:
   - preguntas_refinamiento
   - negativos_edge_cases
   - riesgos
5. Si la cobertura local es alta (score >= 80) y la ambiguedad es baja (score < 30): sugerir no usar IA
6. Toda salida debe marcar origen por item: `"local"`, `"ia"`, o `"mixto"`
7. Si la IA falla, la salida local **siempre** queda disponible

### Limite deliberado

La IA no genera todo desde cero. Si lo hiciera, QA Assist volveria a depender del proveedor con mayor costo, inconsistencia y riesgo.

---

## 12. Quality Checks - Reglas concretas

Cada check es un **booleano**. True = pasa. False = no pasa. Sin grises.

### 12.1 cobertura_minima

```
TRUE si:
  - test_cases.length >= 3
  - criterios_aceptacion.length >= 2
  - (ambiguedades.length >= 1 OR score_ambiguedad < 20)

FALSE si cualquiera falla
```

### 12.2 casos_accionables

```
TRUE si TODOS los test cases cumplen:
  - tiene campo "precondiciones" no vacio
  - tiene campo "pasos" con al menos 1 paso
  - tiene campo "resultado_esperado" no vacio
  - resultado_esperado NO contiene palabras:
    ["correctamente", "adecuadamente", "bien",
     "como se espera", "sin errores", "funciona",
     "debe funcionar"]

FALSE si cualquier test case falla alguna condicion
```

### 12.3 sin_supuestos_no_soportados

```
TRUE si:
  - ningun test case referencia entidades que NO estan
    en estructura_detectada.entidades_detectadas
  - ningun criterio asume integraciones que NO estan
    en estructura_detectada.integraciones_detectadas

FALSE si el analisis invento algo que la historia no dice
```

### 12.4 riesgos_relevantes

```
TRUE si:
  - score_complejidad >= 30 -> riesgos.length >= 1
  - score_complejidad >= 60 -> riesgos.length >= 2
  - score_complejidad < 30 -> siempre TRUE

FALSE si la complejidad es alta pero no se generaron riesgos
```

### 12.5 sin_redundancia_excesiva

```
TRUE si:
  - no hay 2 test cases con mismo resultado_esperado
  - no hay 2 ambiguedades con similitud > 80%
  - no hay 2 criterios con similitud > 80%

FALSE si hay duplicados obvios que el dedupe debio atrapar
```

### 12.6 preguntas_refinamiento_utiles

```
TRUE si:
  - cada pregunta termina en "?"
  - ninguna pregunta es generica ("hay algo mas?", "algo adicional?")
  - cada pregunta referencia al menos 1 entidad o concepto de la historia
  - preguntas_refinamiento.length >= 1

FALSE si las preguntas son vagas o no conectan con la historia
```

### 12.7 requiere_refinamiento_humano

```
TRUE si CUALQUIERA de estas:
  - score_ambiguedad >= 70
  - cobertura_minima == false
  - score_cobertura < 40
  - casos_accionables == false
  - clasificacion tipo "desconocido"

FALSE si la salida es razonablemente usable tal cual
```

Este es el check mas importante. Le dice al usuario: **"no uses esto tal cual, necesita trabajo humano."**

---

## 13. Politica de seguridad

### Sensibilidad por proyecto

Valores: `publico`, `interno`, `sensible`, `restringido`

| Sensibilidad | Politica |
|---|---|
| publico | IA permitida con sanitizacion basica |
| interno | IA permitida con sanitizacion obligatoria |
| sensible | IA solo con anonimizacion fuerte y confirmacion explicita |
| restringido | IA externa bloqueada |

### Reglas del sanitizador

**(Detalle completo en seccion 7.6)**

---

## 14. Modelo de datos

### Tabla projects

```sql
CREATE TABLE projects (
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
```

**glosario_json estructura:**

```json
[
  { "termino": "POS", "definicion": "Point of Sale - terminal de cobro fisico" },
  { "termino": "rollback", "definicion": "Revertir transaccion al estado anterior" }
]
```

**reglas_negocio_json estructura:**

```json
[
  { "regla": "Monto maximo por transaccion: $10,000", "tipo": "restriccion" },
  { "regla": "Usuario bloqueado tras 3 intentos fallidos", "tipo": "seguridad" }
]
```

**Donde se usan:**

- `glosario_json`: el parser lo consulta para no marcar como vago un termino definido
- `reglas_negocio_json`: el rules engine las inyecta como criterios/restricciones adicionales

### Tabla stories

```sql
CREATE TABLE stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  modulo TEXT,
  descripcion TEXT NOT NULL,
  fuente TEXT,
  notas_qa TEXT,
  estado TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

**Estados validos y transiciones:**

```
draft     -> analyzed   (cuando se ejecuta primer analisis)
analyzed  -> refined    (cuando se edita la descripcion despues de analizar)
refined   -> analyzed   (cuando se re-analiza)
```

### Tabla analysis_runs

```sql
CREATE TABLE analysis_runs (
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
  cache_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id)
);

CREATE INDEX idx_analysis_runs_story_id ON analysis_runs(story_id);
CREATE INDEX idx_analysis_runs_cache_key ON analysis_runs(cache_key);
```

**Logica de versionado:**

```sql
-- Al crear un nuevo analysis_run:
version = (SELECT COALESCE(MAX(version), 0) + 1
           FROM analysis_runs
           WHERE story_id = ?)
```

Cada ejecucion de `/analyze` crea una nueva version. No hay rollback en v1, solo consulta de versiones anteriores.

### Tabla analysis_feedback

```sql
CREATE TABLE analysis_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_run_id INTEGER NOT NULL,
  utilidad TEXT NOT NULL,
  comentario TEXT,
  copied_blocks_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
);
```

**Valores de utilidad:** `"muy_util"`, `"util"`, `"poco_util"`, `"inutil"`

### Tabla analysis_cache

```sql
CREATE TABLE analysis_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  prompt_version TEXT,
  sanitized_input_json TEXT NOT NULL,
  llm_output_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Calculo del cache_key:**

```javascript
const crypto = require('crypto');

function buildCacheKey({ sanitizedInput, analysisMode, promptVersion, blocksToEnrich }) {
  const payload = JSON.stringify({
    input: sanitizedInput,
    mode: analysisMode,
    prompt: promptVersion,
    blocks: blocksToEnrich.sort()
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}
```

El cache solo aplica si la entrada sanitizada, el modo, la version del prompt y los bloques a enriquecer son identicos.

---

## 15. Estructura del resultado final

```json
{
  "meta": {
    "analysis_mode": "local_only",
    "prompt_version": null,
    "uso_ia": false,
    "bloques_generados_por_ia": [],
    "score_ambiguedad": 68,
    "score_cobertura": 74,
    "score_complejidad": 42
  },
  "quality_checks": {
    "cobertura_minima": true,
    "casos_accionables": true,
    "sin_supuestos_no_soportados": true,
    "riesgos_relevantes": true,
    "sin_redundancia_excesiva": true,
    "preguntas_refinamiento_utiles": true,
    "requiere_refinamiento_humano": true
  },
  "resultado": {
    "estructura_detectada": {
      "actor": "usuario",
      "accion": "pagar con tarjeta",
      "objetivo": "completar compra",
      "entidades_detectadas": ["tarjeta", "compra"],
      "integraciones_detectadas": ["pasarela_pago"]
    },
    "clasificacion_funcional": {
      "tipo_primario": "transaccion",
      "subtipos": ["pago"],
      "confianza": 0.86
    },
    "ambiguedades": [
      {
        "id": "AMB-001",
        "descripcion": "No se especifica que tipos de tarjeta se aceptan",
        "origen": "local"
      }
    ],
    "preguntas_refinamiento": [
      {
        "id": "PRE-001",
        "pregunta": "Que metodos de pago se soportan ademas de tarjeta?",
        "origen": "local"
      }
    ],
    "criterios_aceptacion": [
      {
        "id": "CA-001",
        "criterio": "El sistema debe procesar el pago y mostrar confirmacion con numero de transaccion",
        "origen": "local"
      }
    ],
    "test_cases": [
      {
        "id": "TC-001",
        "titulo": "Pago exitoso con tarjeta valida",
        "precondiciones": "Usuario logueado con tarjeta Visa vigente registrada",
        "pasos": [
          "Seleccionar producto de $50",
          "Click en Pagar",
          "Confirmar con tarjeta registrada"
        ],
        "resultado_esperado": "Se muestra pantalla de confirmacion con numero de transaccion y monto $50",
        "tipo": "positivo",
        "origen": "local"
      }
    ],
    "negativos_edge_cases": [
      {
        "id": "NEG-001",
        "titulo": "Pago con tarjeta vencida",
        "precondiciones": "Usuario con tarjeta vencida",
        "pasos": ["Intentar pagar con tarjeta vencida"],
        "resultado_esperado": "Se muestra mensaje de error indicando que la tarjeta esta vencida",
        "tipo": "negativo",
        "origen": "local"
      }
    ],
    "riesgos": [
      {
        "id": "RSK-001",
        "descripcion": "Doble cobro si el usuario hace click multiples veces en Pagar",
        "severidad": "alta",
        "origen": "local"
      }
    ]
  }
}
```

---

## 16. API completa

### Proyectos

```
POST   /api/projects              Crear proyecto
GET    /api/projects              Listar proyectos
GET    /api/projects/:id          Obtener proyecto
PUT    /api/projects/:id          Editar proyecto (sensibilidad, glosario, reglas)
GET    /api/projects/:id/stories  Listar historias del proyecto
GET    /api/projects/:id/feedback-summary  Resumen de feedback del proyecto
```

### Historias

```
POST   /api/stories               Crear historia
GET    /api/stories/:id           Obtener historia
PUT    /api/stories/:id           Editar historia (cambia estado a "refined" si estaba "analyzed")
DELETE /api/stories/:id           Eliminar historia y sus analisis
```

### Analisis

```
POST   /api/stories/:id/analyze            Ejecutar analisis (crea nueva version)
GET    /api/stories/:id/analyses           Listar versiones de analisis
GET    /api/analyses/:analysisRunId        Obtener analisis especifico
```

### Feedback

```
POST   /api/analyses/:analysisRunId/feedback   Guardar feedback
```

---

## 17. UX minima

### Pantalla 1: Proyectos

- Listar proyectos existentes
- Crear proyecto nuevo:
  - nombre (obligatorio)
  - descripcion
  - dominio
  - sensibilidad (selector: publico, interno, sensible, restringido)
  - contexto general (textarea)
  - glosario (tabla editable: termino + definicion)
  - reglas de negocio (tabla editable: regla + tipo)
- Editar proyecto existente
- Click en proyecto -> ir a historias

### Pantalla 2: Story Analyzer

**Bloque izquierdo - Entrada:**

- Selector de historia existente o crear nueva
- titulo (obligatorio)
- modulo
- descripcion (obligatorio, textarea grande)
- notas QA
- Configuracion de analisis:
  - Modo: Local / Hibrido
  - Si hibrido, checkboxes:
    - Enriquecer preguntas
    - Enriquecer edge cases
    - Enriquecer riesgos
- Boton: Analizar

**Bloque derecho - Resultado (paneles/tabs):**

- Estructura detectada
- Clasificacion funcional (con indicador de confianza)
- Ambiguedades
- Preguntas de refinamiento
- Criterios de aceptacion
- Test cases
- Edge cases / negativos
- Riesgos
- Quality checks (semaforo visual: verde/rojo por check)
- Scores (barras o indicadores visuales)
- Advertencia si `requiere_refinamiento_humano = true`

**Bloque inferior - Acciones:**

- Guardar (si no se ha guardado)
- Re-analizar
- Copiar bloque individual
- Copiar todo
- Selector de version (dropdown con historial)
- Marcar utilidad (muy util / util / poco util / inutil) + comentario opcional

---

## 18. Estructura de carpetas

### Backend

```
server/
  src/
    routes/
      projects.routes.js
      stories.routes.js
      analyses.routes.js
      feedback.routes.js

    controllers/
      projects.controller.js
      stories.controller.js
      analyses.controller.js
      feedback.controller.js

    services/
      analysis/
        story-parser.service.js
        functional-classifier.service.js
        qa-rules-engine.service.js
        dedupe-compact.service.js
        quality-checks.service.js
        score-calculator.service.js
        sanitizer.service.js
        llm-enhancer.service.js
        analysis-merger.service.js
        analysis-orchestrator.service.js

      project.service.js
      story.service.js
      feedback.service.js

    validators/
      analysis.validator.js
      project.validator.js
      story.validator.js

    prompts/
      enrich-questions.prompt.js
      enrich-risks.prompt.js
      enrich-edge-cases.prompt.js

    config/
      vague-terms.config.js
      classifier-signals.config.js
      llm.config.js
      sanitizer-patterns.config.js

    db/
      connection.js
      schema.sql
      seeds.sql

    utils/
      similarity.js
      hash.js

  package.json
```

### Frontend

```
client/
  src/
    pages/
      ProjectsPage.jsx
      StoryAnalyzerPage.jsx

    components/
      projects/
        ProjectForm.jsx
        ProjectList.jsx
        GlossaryEditor.jsx
        BusinessRulesEditor.jsx

      stories/
        StoryForm.jsx
        StoryList.jsx

      analysis/
        AnalysisModeSelector.jsx
        StructurePanel.jsx
        ClassificationPanel.jsx
        AmbiguitiesPanel.jsx
        QuestionsPanel.jsx
        AcceptanceCriteriaPanel.jsx
        TestCasesPanel.jsx
        EdgeCasesPanel.jsx
        RisksPanel.jsx
        QualityChecksPanel.jsx
        ScoresDisplay.jsx
        VersionSelector.jsx

      feedback/
        FeedbackBar.jsx

    api/
      http.js
      projects.js
      stories.js
      analyses.js
      feedback.js

  package.json
```

---

## 19. Criterios de aceptacion del MVP

1. El sistema puede analizar historias en modo local sin usar IA
2. El parser usa el glosario del proyecto para contextualizar terminos
3. El clasificador asigna tipo funcional con confianza calculada por heuristica de señales
4. El tipo "desconocido" produce analisis basico con advertencia
5. El rules engine genera salida coherente con la clasificacion, usando reglas de negocio del proyecto
6. El sistema deduplica y compacta respetando limites maximos
7. Los 3 scores se calculan con heuristicas definidas (no arbitrarios)
8. Los 7 quality checks se ejecutan con reglas booleanas concretas
9. En modo hibrido, solo enriquece bloques permitidos
10. Si el proyecto es restringido, la IA queda bloqueada
11. El sanitizador reemplaza con tokens indexados y bloquea si detecta secretos
12. Si la IA falla, la salida local sigue disponible
13. Cada analisis se guarda versionado con version auto-incremental por historia
14. El merge IA respeta: local como base, IA solo complementa, re-dedupe post-merge
15. El usuario puede calificar utilidad y ver resumen de feedback por proyecto
16. Cada item del resultado tiene campo "origen" (local/ia/mixto)
17. El pipeline no se rompe por fallas intermedias (excepto parser)

---

## 20. Orden de implementacion

### Fase 1 - Base solida

```
1. Setup proyecto (React + Vite + Express + SQLite)
2. Schema de base de datos + seeds basicos
3. CRUD de proyectos (con glosario y reglas de negocio)
4. CRUD de historias
5. story-parser.service.js (con diccionario de vagos + glosario)
6. functional-classifier.service.js (con heuristica de señales)
7. qa-rules-engine.service.js (4 tipos + global)
8. dedupe-compact.service.js
9. score-calculator.service.js (3 scores)
10. quality-checks.service.js (7 checks)
11. analysis-orchestrator.service.js (modo local_only)
12. Persistencia de analysis_runs con versionado
13. UI: ProjectsPage + ProjectForm
14. UI: StoryAnalyzerPage + paneles de resultado
15. UI: quality checks como semaforo
16. UI: scores como indicadores
17. feedback.service.js + FeedbackBar
18. Versionado en UI (selector de version)
```

### Fase 1.1 - Hibrido controlado

```
19. sanitizer.service.js (tokens + bloqueo)
20. llm-enhancer.service.js (config + timeout + retry)
21. analysis-merger.service.js (merge + re-dedupe)
22. Prompts versionados
23. Cache por hash
24. Orquestador modo hybrid
25. UI: AnalysisModeSelector con checkboxes
26. Marcado de origen (local/ia) en UI
```

### Fase 2 - Utilidad extendida

```
27. Export markdown
28. Edicion parcial controlada del resultado
29. Mejora de taxonomias del clasificador
30. Feedback summary por proyecto
```

### Fase 3 - Despues

```
31. Tickets desde resultado
32. Integracion Jira / Azure DevOps
33. Importadores
34. Mas tipos funcionales
```

---

## 21. Definicion final

**QA Assist v1 es un analizador QA hibrido, versionado y trazable, con motor local especializado por tipo de flujo, scores calculados por heuristicas concretas, quality checks booleanos, y uso de IA estrictamente limitado a enriquecimiento puntual de bloques especificos.**

---

## Changelog vs version anterior

| # | Problema detectado | Correccion aplicada |
|---|---|---|
| 1 | Clasificador sin heuristica | Definidas señales por tipo y formula de confianza (seccion 7.2) |
| 2 | Tipo "desconocido" sin manejo | Reglas globales + advertencia + refinamiento obligatorio (seccion 7.2, 9) |
| 3 | Glosario/reglas de negocio no conectados al pipeline | Parser usa glosario, rules engine inyecta reglas (seccion 7.1, 9.1, 14) |
| 4 | API incompleta | Agregados GET/PUT/DELETE faltantes (seccion 16) |
| 5 | Versionado sin logica | Auto-incremento por story_id definido (seccion 14) |
| 6 | Merge local+IA sin spec | Reglas de merge definidas: local base, IA complementa, re-dedupe (seccion 7.8) |
| 7 | Estados de story indefinidos | 3 estados + transiciones definidas (seccion 14) |
| 8 | Cache key sin definicion | Hash SHA-256 de input+modo+prompt+bloques (seccion 14) |
| 9 | Feedback sin consumo | Endpoint de resumen por proyecto (seccion 16) |
| 10 | Sanitizer sin tokens de reemplazo | Tokens indexados + patrones bloqueantes (seccion 7.6) |
| 11 | Diccionario de terminos vagos inexistente | Lista base de ~30 terminos (seccion 7.1) |
| 12 | Sin manejo de error en pipeline | Tabla de fallas y acciones por paso (seccion 5) |
| 13 | Scores sin formula de calculo | Heuristicas concretas con puntos por senal (seccion 10) |
| 14 | Quality checks sin reglas concretas | 7 checks con pseudocodigo booleano (seccion 12) |
| 15 | Nuevo: score-calculator como servicio separado | Agregado en estructura de carpetas (seccion 18) |
| 16 | Nuevo: archivos de config separados | vague-terms, classifier-signals, llm, sanitizer-patterns (seccion 18) |
| 17 | Nuevo: estructura de items con ID y origen | Cada item tiene id, origen, y campos accionables (seccion 15) |
