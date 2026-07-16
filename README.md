# OpencodeIAGeneratorCasosUsosJiraXray

Orquestador de IA con OpenCode para certificar funcionalidades y automatizar el flujo completo de QA funcional con Jira + Xray + GitHub + Postman, desde el análisis de una tarjeta hasta la creación/asociación de casos de prueba.

> Este README está diseñado para que cualquier persona entienda el proyecto sin tener que volver a preguntar.

---

## 1) ¿Qué hace este proyecto?

Implementa un flujo QA estructurado en 4 etapas:

1. **analyze-ticket** → analiza tarjeta Jira + rama GitHub + documentación Confluence + colecciones Postman.
2. **review-coverage** → revisa cobertura existente en Xray y detecta brechas.
3. **design-cases** → diseña casos nuevos con formato estricto (BACK / FRONT / BACK+FRONT).
4. **load-xray** → crea casos en Xray, transiciona estado en Jira y los asocia al requerimiento.

Todo esto está gobernado por reglas compartidas (`shared-rules.md`) y por un orquestador principal (`qa-xray-certification.md`).

---

## 2) Arquitectura general

- **Orquestador principal**: `gentle-orchestrator` (OpenCode)
- **Subagente funcional**: `qa-xray-certification`
- **Servidor MCP custom**: `src/index.ts` (xray-mcp)
- **Skills declaradas**: `skills/qa-xray-certification/*.md`
- **Configuración runtime**: `opencode.json`, `tui.json`

El orquestador **no ejecuta pasos inline**: delega al subagente QA, que sigue el flujo duro en orden.

---

## 3) Estructura del repositorio y explicación archivo por archivo

```text
.
├── AGENTS.md
├── LICENSE
├── README.md
├── opencode.json
├── opencode.jsonc
├── package.json
├── package-lock.json
├── tui.json
├── src/
│   └── index.ts
└── skills/
    └── qa-xray-certification/
        ├── analyze-ticket.md
        ├── design-cases.md
        ├── load-xray.md
        ├── qa-xray-certification.md
        ├── review-coverage.md
        └── shared-rules.md
```

### Archivos raíz

#### `AGENTS.md`
Define reglas globales de comportamiento del agente:
- estilo de trabajo,
- políticas de seguridad,
- manejo de credenciales,
- estándar QA funcional,
- protocolo obligatorio para delegar al skill `qa-xray-certification`.

También declara lineamientos críticos, por ejemplo:
- no exponer tokens/secrets,
- no usar shell/curl para APIs cuando haya cliente nativo,
- suprimir outputs técnicos sensibles al usuario.

#### `LICENSE`
Licencia MIT del proyecto.

#### `README.md`
Documentación principal del repositorio (este archivo).

#### `opencode.json`
Archivo más importante de configuración del runtime OpenCode. Contiene:
- agentes (`gentle-orchestrator`, `qa-xray-certification`, agentes SDD),
- permisos por tarea,
- herramientas habilitadas por agente,
- registro de MCPs (jira, github, postman, xray, context7, engram),
- reglas de permisos de lectura/escritura.

#### `opencode.jsonc`
Versión JSONC mínima de soporte/configuración.

#### `package.json`
Metadatos del paquete Node/TypeScript.

#### `package-lock.json`
Lock de dependencias para reproducibilidad.

#### `tui.json`
Configuración de experiencia TUI/CLI del entorno.

### Código fuente

#### `src/index.ts`
Implementa el **servidor MCP `xray-mcp`** usando `@modelcontextprotocol/sdk`.

Responsabilidades principales:
1. Autenticarse contra Xray (`/authenticate`) y cachear token.
2. Exponer herramientas MCP para buscar/crear/asociar tests y transicionar issues.
3. Integrar Jira REST API para transitions, issueLink y usuario actual.
4. Convertir descripciones a formato ADF de Jira (`toADF`).
5. Resolver `lineaDesarrollo` (mapa nombre→id) antes de persistir custom fields.
6. Ofrecer tools compuestas optimizadas:
   - `analyze_ticket_context` (búsquedas paralelas)
   - `create_and_load_test` (crear + transiciones + asociación)

### Skills QA

#### `skills/qa-xray-certification/qa-xray-certification.md`
Skill orquestador del flujo completo.
- Define **hard gate**: `analyze-ticket → review-coverage → design-cases → load-xray`.
- Prohíbe saltar pasos y ejecutar en paralelo.
- Define comandos operativos (`/qa-xray-certification`, `/analyze-ticket`, etc.).

#### `skills/qa-xray-certification/shared-rules.md`
Reglas transversales obligatorias:
- formato de naming de casos (`DYF_Validar ...`),
- estructura de `steps[]` (action/data/result),
- reglas de precondiciones,
- clasificación de tipo de caso (BACK/FRONT/BACK+FRONT),
- formato exacto de pasos por tipo,
- tabla de herramientas MCP permitidas/prohibidas.

#### `skills/qa-xray-certification/analyze-ticket.md`
Etapa de análisis contextual con ejecución por olas (waves):
- **Wave 1 simultánea**: Jira issue + GitHub commits + Postman search + remote links.
- **Wave 2 condicional**: fallbacks y lecturas secundarias.

Produce `CONTEXTO` estructurado con:
- objetivo, criterios, riesgos,
- endpoint,
- lineaDesarrollo/equipo,
- archivos y tipo detectado,
- colección/curl,
- evidencias de Confluence.

#### `skills/qa-xray-certification/review-coverage.md`
Etapa de evaluación de cobertura existente en Xray.
- Busca casos reutilizables.
- Detecta brechas contra el contexto funcional.
- Decide qué casos rediseñar y cuáles crear nuevos.

#### `skills/qa-xray-certification/design-cases.md`
Etapa de diseño detallado de casos.
- Diseña únicamente para brechas detectadas.
- Aplica clasificación de tipo antes de construir pasos.
- Exige checklists estrictos de consistencia.
- Entrega tablas completas (sin resumen parcial).

#### `skills/qa-xray-certification/load-xray.md`
Etapa de carga/publicación en Xray.
- Confirma con usuario qué existentes y cuáles nuevos subir.
- Obtiene `assigneeAccountId`.
- Ejecuta gate de creación obligatorio.
- Crea test, transiciona estados y asocia a requirement.
- Entrega resumen final por caso con estado.

---

## 4) MCPs usados en el proyecto (completo)

Los MCP están definidos en `opencode.json`:

## 4.1 `jira` MCP
- **Tipo**: remote
- **URL**: `https://mcp.atlassian.com/v1/mcp`
- **Uso**:
  - leer tarjeta Jira,
  - obtener transiciones,
  - transicionar issue,
  - leer usuario actual,
  - leer remote links/comentarios (confluence).

## 4.2 `github` MCP
- **Tipo**: local (`/usr/local/bin/github-mcp-server stdio`)
- **Auth**: `GITHUB_PERSONAL_ACCESS_TOKEN`
- **Uso**:
  - verificar acceso repo,
  - leer archivos,
  - listar commits/ramas,
  - comparar ramas,
  - buscar código.

## 4.3 `postman` MCP
- **Tipo**: local (`npx @postman/postman-mcp-server@latest --full`)
- **Auth**: `POSTMAN_API_KEY`
- **Uso**:
  - buscar colecciones,
  - obtener colección completa,
  - localizar request por endpoint/path,
  - extraer method/headers/body para casos BACK.

## 4.4 `xray` MCP (custom de este repo)
- **Tipo**: local (`node .../mcp-xray/dist/index.js`)
- **Auth/env**:
  - `XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`
  - `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- **Uso**:
  - buscar tests/preconditions,
  - crear tests manuales,
  - asociar test ↔ requerimiento,
  - transicionar estados Jira,
  - operación compuesta create+load.

## 4.5 `engram` MCP
- **Tipo**: local (`engram mcp --tools=agent`)
- **Uso**: soporte de contexto/memoria de agente.

## 4.6 `context7` MCP
- **Tipo**: remote
- **URL**: `https://mcp.context7.com/mcp`
- **Uso**: capacidades auxiliares de contexto/documentación.

---

## 5) APIs y operaciones incluidas (MCP + endpoints)

## 5.1 API Xray (Cloud)
Base: `https://xray.cloud.getxray.app/api/v2`

### Autenticación
- `POST /authenticate`
- Body: `{ client_id, client_secret }`
- Respuesta: Bearer token (string)
- Implementación: `getXrayToken()` con caché temporal.

### GraphQL
- `POST /graphql`
- Uso principal: `createTest(testType: Manual, steps, jira)`
- Implementación: `xrayGraphQL()`

### REST de búsqueda
- `GET /tests?jql=...&limit=...&page=...`
- `GET /preconditions?jql=...&limit=...`
- Implementación: `xrayGet()`

## 5.2 API Jira REST
Base: `JIRA_URL` (default `https://imed.atlassian.net`)
Auth: Basic (`JIRA_EMAIL:JIRA_API_TOKEN`)

Operaciones usadas por el MCP custom:
- `GET /rest/api/3/myself`
- `GET /rest/api/3/issue/{issueKey}/transitions`
- `POST /rest/api/3/issue/{issueKey}/transitions`
- `PUT /rest/api/3/issue/{issueKey}` (edición de fields/description)
- `POST /rest/api/3/issueLink` (asociación test-requirement)

## 5.3 APIs a través de MCP de GitHub/Postman/Jira Atlassian
Además de lo que implementa `src/index.ts`, los skills invocan tools expuestas por esos MCP (ejemplo):
- GitHub: `github_get_file_contents`, `github_list_commits`, `github_list_branches`, `github_compare_branches`, `github_search_code`.
- Postman: `postman_searchPostmanElements`, `postman_getCollection`, `postman_find_request`.
- Jira/Confluence: `jira_getJiraIssue`, `jira_getJiraIssueRemoteIssueLinks` y búsquedas asociadas.

---

## 6) Herramientas del MCP custom (`src/index.ts`) y qué hace cada una

1. `xray_search_tests`
   - Busca Tests en Xray con JQL.
2. `xray_search_preconditions`
   - Busca Preconditions con JQL.
3. `xray_create_test`
   - Crea un test Manual con `summary`, `steps`, `description`, `productos`, `complejidad`, `lineaDesarrollo`, `assigneeAccountId`.
4. `xray_associate_test`
   - Crea vínculo Jira tipo `Test` entre requirement y test.
5. `jira_get_transitions`
   - Lista transiciones del issue.
6. `jira_transition_issue`
   - Ejecuta transición puntual por `transitionId`.
7. `jira_get_current_user`
   - Devuelve usuario Jira autenticado (accountId).
8. `analyze_ticket_context` (tool compuesta)
   - Ejecuta en paralelo búsqueda de tests/preconditions + usuario actual.
9. `create_and_load_test` (tool compuesta)
   - Flujo optimizado: crear test → transición a En curso → (si ready) Manual → asociar a tarjeta.

---

## 7) Explicación completa de cada skill (sin ambigüedades)

## 7.1 Skill `qa-xray-certification` (orquestador)
**Objetivo**: gobernar el pipeline completo sin saltar etapas.

**Entradas**:
- `ID_TARJETA`
- `VALOR_PRODUCTOS`
- `NOMBRE_REPO` (opcional, con inferencia en casos definidos)

**Proceso**:
1. valida carga de `shared-rules`.
2. recupera contexto de memoria (`mem_context`).
3. ejecuta secuencia hard gate completa.
4. espera señal de completion de cada skill antes de seguir.

**Salida**:
- progreso visible por etapa,
- resultados consolidados al finalizar carga en Xray.

## 7.2 Skill `analyze-ticket`
**Objetivo**: crear el contexto funcional/técnico base para QA.

**Entradas**: `ID_TARJETA`, `VALOR_PRODUCTOS`, `NOMBRE_REPO`.

**Proceso**:
- Wave 1 paralela obligatoria: Jira + GitHub + Postman + Confluence links.
- Wave 2 condicional: fallbacks/búsquedas secundarias.
- tolerancia a fallos parciales (continúa con avisos).

**Salida estructurada (`CONTEXTO`)**:
- objetivo, funcionalidad, criterios, riesgos,
- endpoint,
- lineaDesarrollo/equipo,
- archivos detectados y tipo BACK/FRONT/BACK+FRONT,
- colección/curl,
- flujos/reglas documentadas.

## 7.3 Skill `review-coverage`
**Objetivo**: medir qué tan cubierta está la funcionalidad en Xray.

**Entradas**: `CONTEXTO`.

**Proceso**:
- consulta tests/preconditions existentes,
- compara contra criterios/riesgos/flujos,
- clasifica:
  - reutilizable,
  - requiere rediseño,
  - brecha nueva.

**Salida (`COBERTURA`)**:
- listado de existentes,
- brechas concretas que alimentan diseño.

## 7.4 Skill `design-cases`
**Objetivo**: generar casos nuevos estrictamente para cerrar brechas.

**Entradas**: `CONTEXTO + COBERTURA`.

**Proceso**:
- clasificación obligatoria por tipo de prueba,
- diseño con formato de pasos correcto según tipo,
- checklist de consistencia por caso (nombre, description, precondiciones, steps, campos obligatorios).

**Salida (`CASOS`)**:
- `casosNuevos[]` con:
  - `nombre`, `tipo`, `description`, `steps[]`, `complejidad`, `lineaDesarrollo`, `productos`.
- tablas completas visibles y sin omisiones.

## 7.5 Skill `load-xray`
**Objetivo**: publicar y asociar casos en Xray/Jira de forma controlada.

**Entradas**: `CASOS` + confirmaciones del usuario.

**Proceso**:
1. pregunta qué casos existentes asociar.
2. pregunta qué casos nuevos crear/subir.
3. obtiene accountId usuario.
4. aplica gate de creación por caso.
5. ejecuta orden estricto de herramientas (secuencial por caso).
6. reporta estados finales y advertencias.

**Salida**:
- resumen de casos asociados/creados,
- estado final por caso (`Backlog`, `En curso`, `Manual`),
- advertencias de campos faltantes o transiciones fallidas.

## 7.6 Skill `shared-rules`
**Objetivo**: imponer consistencia operacional y de salida en toda la certificación.

**Incluye**:
- reglas de supresión de salida técnica,
- convenciones de naming y precondiciones,
- clasificación de tipo de caso,
- plantillas de pasos BACK y FRONT,
- inventario de herramientas MCP permitidas.

---

## 8) Flujo end-to-end (trazabilidad completa)

1. Usuario ejecuta `/qa-xray-certification ID PRODUCTOS REPO`.
2. Orquestador delega al subagente QA.
3. `analyze-ticket` construye `CONTEXTO` con evidencia Jira/GitHub/Confluence/Postman.
4. `review-coverage` define brechas reales.
5. `design-cases` genera casos accionables y compatibles con Xray.
6. `load-xray` crea/asocia casos y ejecuta transiciones Jira.
7. Se entrega resumen final por caso con estado y advertencias.

---

## 9) Variables de entorno necesarias

- `XRAY_CLIENT_ID`
- `XRAY_CLIENT_SECRET`
- `JIRA_URL` (si no se define, usa `https://imed.atlassian.net`)
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `POSTMAN_API_KEY`

---

## 10) Buenas prácticas operativas del repo

- No exponer respuestas crudas de APIs ni credenciales.
- No saltar etapas del hard gate.
- No mezclar pasos FRONT con cURL/JSON.
- No crear casos BACK sin cURL/request válido.
- Confirmar campos obligatorios antes de crear en Xray (`productos`, `complejidad`, `lineaDesarrollo`, `assignee`).

---

## 11) Referencia complementaria

Se incluye documentación técnica extendida en:

- `docs/arquitectura.md`

con detalle MCP por MCP, APIs y mapping skill ↔ tools ↔ endpoints.

---

## Licencia

MIT (`LICENSE`).
