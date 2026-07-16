# Arquitectura técnica — OpencodeIAGeneratorCasosUsosJiraXray

Este documento complementa el `README.md` con nivel técnico profundo: arquitectura de agentes, inventario MCP, APIs usadas, y mapeo detallado entre skills, herramientas y endpoints.

---

## 1) Componentes principales

## 1.1 Runtime OpenCode
Configurado en `opencode.json`.

Incluye:
- **Agente primario**: `gentle-orchestrator`.
- **Subagente QA**: `qa-xray-certification`.
- Subagentes SDD auxiliares (`sdd-*`).

El primario coordina y delega; el subagente QA ejecuta la lógica de certificación.

## 1.2 Servidor MCP custom (`xray-mcp`)
Implementado en `src/index.ts` con `@modelcontextprotocol/sdk`.

Responsable de:
- autenticación Xray,
- consultas Xray REST,
- mutaciones Xray GraphQL,
- operaciones Jira REST para transición/asociación,
- herramientas compuestas para rendimiento y atomicidad funcional.

## 1.3 Skills QA
Ubicadas en `skills/qa-xray-certification/`:
- `qa-xray-certification.md` (orquestador)
- `analyze-ticket.md`
- `review-coverage.md`
- `design-cases.md`
- `load-xray.md`
- `shared-rules.md`

---

## 2) Inventario MCP completo

Definidos en `opencode.json` > `mcp`.

## 2.1 MCP `jira`
- Tipo: `remote`
- URL: `https://mcp.atlassian.com/v1/mcp`
- Timeout: `12000`
- Función: lectura de issue, transiciones, links, datos de usuario, soporte Confluence vía enlaces Jira.

## 2.2 MCP `github`
- Tipo: `local`
- Comando: `/usr/local/bin/github-mcp-server stdio`
- Auth: `GITHUB_PERSONAL_ACCESS_TOKEN`
- Función: acceso repo, ramas, commits, comparación y búsqueda de código.

## 2.3 MCP `postman`
- Tipo: `local`
- Comando: `npx -y @postman/postman-mcp-server@latest --full`
- Auth: `POSTMAN_API_KEY`
- Función: descubrimiento de colecciones y requests para construir pasos BACK trazables.

## 2.4 MCP `xray` (custom)
- Tipo: `local`
- Comando: `node /home/fjorquera/.config/opencode/mcp-xray/dist/index.js`
- Env:
  - `XRAY_CLIENT_ID`
  - `XRAY_CLIENT_SECRET`
  - `JIRA_URL`
  - `JIRA_EMAIL`
  - `JIRA_API_TOKEN`
- Función: ciclo completo de tests XRAY + integración Jira.

## 2.5 MCP `engram`
- Tipo: `local`
- Comando: `engram mcp --tools=agent`
- Función: memoria/contexto de agente entre turnos/sesiones.

## 2.6 MCP `context7`
- Tipo: `remote`
- URL: `https://mcp.context7.com/mcp`
- Función: soporte contextual/documental adicional.

---

## 3) APIs externas y contratos operativos

## 3.1 Xray Cloud API
Base: `https://xray.cloud.getxray.app/api/v2`

### 3.1.1 Autenticación
- Endpoint: `POST /authenticate`
- Body:
  - `client_id`
  - `client_secret`
- Respuesta: token Bearer (texto)
- Implementación: `getXrayToken()` con caché en memoria (`cachedToken`, `tokenExpiry`).

### 3.1.2 GraphQL
- Endpoint: `POST /graphql`
- Headers:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Uso principal: mutación `createTest` tipo Manual con `steps`.
- Implementación: `xrayGraphQL(query, variables)`.

### 3.1.3 REST de búsqueda
- `GET /tests?jql=...&limit=...&page=...`
- `GET /preconditions?jql=...&limit=...`
- Implementación: `xrayGet(path)`.

## 3.2 Jira REST API
Base: `JIRA_URL` (default `https://imed.atlassian.net`)
Auth: Basic (`JIRA_EMAIL:JIRA_API_TOKEN`)

Operaciones usadas:
- `GET /rest/api/3/myself`
- `GET /rest/api/3/issue/{issueKey}/transitions`
- `POST /rest/api/3/issue/{issueKey}/transitions`
- `PUT /rest/api/3/issue/{issueKey}`
- `POST /rest/api/3/issueLink`

Implementación:
- `jiraGet(path)`
- `jiraPost(path, body)`
- `jiraPut(path, body)`

## 3.3 APIs vía herramientas MCP de terceros
- GitHub MCP: lectura repo/ramas/commits/código.
- Postman MCP: búsqueda y parsing de colecciones/requests.
- Jira MCP remoto: extracción de datos de tarjeta/remotelinks/comentarios.

---

## 4) Herramientas del MCP custom y comportamiento exacto

## 4.1 `xray_search_tests`
- Input: `jql`, opcional `limit`, `page`.
- Acción: consulta Xray `/tests`.
- Salida: JSON de resultados de tests.

## 4.2 `xray_search_preconditions`
- Input: `jql`, opcional `limit`.
- Acción: consulta Xray `/preconditions`.
- Salida: JSON de preconditions.

## 4.3 `xray_create_test`
- Input:
  - `summary`, `description`, `projectKey`, `steps[]`,
  - `productos[]`, `complejidad`, `lineaDesarrollo`, `assigneeAccountId`.
- Acción:
  1. crea test manual vía GraphQL,
  2. edita issue Jira para description ADF + Linea Desarrollo,
  3. calcula bandera `readyForManual`.
- Salida:
  - payload creación,
  - `editWarnings`,
  - `readyForManual`.

## 4.4 `xray_associate_test`
- Input: `testKey`, `requirementKey`.
- Acción: `POST /issueLink` tipo `Test`.
- Salida: resultado Jira de asociación.

## 4.5 `jira_get_transitions`
- Input: `issueKey`.
- Acción: lee transiciones disponibles.
- Salida: lista de transiciones.

## 4.6 `jira_transition_issue`
- Input: `issueKey`, `transitionId`, opcional `fields`.
- Acción: ejecuta transición.
- Salida: ack/204.

## 4.7 `jira_get_current_user`
- Input: vacío.
- Acción: consulta `/myself`.
- Salida: usuario autenticado, incluido `accountId`.

## 4.8 `analyze_ticket_context` (compuesta)
- Input: `productos`.
- Acción paralela:
  - tests por JQL,
  - preconditions por JQL,
  - usuario actual Jira.
- Salida: resultados + summary (`testsFound`, `preconditionsFound`, `assigneeAccountId`).

## 4.9 `create_and_load_test` (compuesta)
- Input: datos completos del caso + `requirementKey`.
- Secuencia:
  1. crear test,
  2. obtener transiciones,
  3. transición Backlog→En curso,
  4. asociación a requirement,
  5. transición a Manual si `readyForManual`.
- Salida:
  - `issueKey`,
  - `finalState`,
  - `readyForManual`,
  - `warnings`,
  - `xrayWarnings`,
  - `summary`.

---

## 5) Mapeo skill ↔ herramientas MCP ↔ APIs

## 5.1 `analyze-ticket`

### Objetivo
Construir contexto funcional/técnico con evidencia de múltiples fuentes.

### Tools típicas
- Jira MCP: `jira_getJiraIssue`, `jira_getJiraIssueRemoteIssueLinks`.
- GitHub MCP: `github_get_file_contents`, `github_list_commits`, `github_list_branches`, `github_compare_branches`.
- Postman MCP: `postman_searchPostmanElements`, `postman_getCollection`.

### APIs subyacentes
- Jira REST (issue, links, comentarios según herramienta)
- GitHub API (branches/commits/contents)
- Postman API (collections/items)

### Output
`CONTEXTO` listo para cobertura.

## 5.2 `review-coverage`

### Objetivo
Determinar cobertura actual y brechas.

### Tools típicas
- `xray_search_tests`
- `xray_search_preconditions`
- opcional: `analyze_ticket_context` para optimizar latencia.

### APIs
- Xray REST `/tests`, `/preconditions`
- Jira `/myself` si se requiere assignee

### Output
`COBERTURA` (reutilizables, rediseño, brechas).

## 5.3 `design-cases`

### Objetivo
Diseñar casos concretos para brechas.

### Dependencias
- `shared-rules` obligatorio.
- `CONTEXTO + COBERTURA` completos.

### Herramientas
- No requiere llamadas API directas obligatorias para redactar.

### Output
`CASOS.casosNuevos[]` con formato Xray-ready.

## 5.4 `load-xray`

### Objetivo
Materializar casos en Xray/Jira.

### Tools
- `jira_get_current_user`
- `xray_create_test` o `create_and_load_test`
- `jira_transition_issue`
- `xray_associate_test`

### APIs
- Xray GraphQL + REST
- Jira REST transitions + issueLink

### Output
Resumen final operativo por caso.

## 5.5 `qa-xray-certification` (orquestador)

### Objetivo
Asegurar flujo estricto y ordenado.

### Tools
Delegación/subskills en secuencia hard-gate.

### Output
Ejecución end-to-end sin saltos de etapa.

---

## 6) Reglas críticas de calidad y consistencia

Tomadas de `shared-rules.md`:

1. Todo caso debe estar clasificado: `BACK`, `FRONT` o `BACK+FRONT`.
2. `steps[]` siempre con `action`, `data`, `result`.
3. Nombre: `DYF_Validar <qué> <bajo qué condición>`.
4. Precondiciones válidas en `description`.
5. No mezclar formato FRONT con cURL/JSON.
6. No omitir `productos`, `complejidad`, `lineaDesarrollo`, `assignee` al crear.

---

## 7) Campos y mapeos Jira/Xray relevantes

En `src/index.ts`:
- `customfield_10428` → `productos`
- `customfield_10646` → `complejidad`
- `customfield_10136` → `lineaDesarrollo` (ID resuelto)

Mapa explícito actual (`LINEA_DESARROLLO_MAP`):
- `Equipo Documentos y Firma` → `10253`
- `DYF` → `10253`

Si falta un valor de línea, debe agregarse al mapa para evitar `editWarnings`.

---

## 8) Flujo técnico de creación y carga (secuencia)

1. Resolver token Xray (cacheado).
2. Crear test manual vía GraphQL.
3. Editar issue con description ADF y línea de desarrollo.
4. Determinar `readyForManual`.
5. Transición a `En curso`.
6. Asociación requirement↔test.
7. Si `readyForManual`, transición a `Manual`.
8. Reportar warnings/resultados.

---

## 9) Observabilidad y manejo de errores

- Errores HTTP se convierten en mensajes explícitos (`XRAY GET ...`, `Jira POST ...`).
- Tools MCP devuelven `isError: true` con texto de error.
- En skills, la política es continuar con `⚠️` cuando el paso no es bloqueante.

---

## 10) Seguridad operacional

- No hardcodear secretos.
- Todas las credenciales vienen de variables de entorno.
- No exponer tokens en salida al usuario.
- Validar permisos de acceso (repo privado, Jira/Xray).

---

## 11) Ubicación de archivos clave

- Configuración general: `opencode.json`
- Reglas globales: `AGENTS.md`
- Servidor MCP custom: `src/index.ts`
- Skill orquestadora: `skills/qa-xray-certification/qa-xray-certification.md`
- Reglas transversales: `skills/qa-xray-certification/shared-rules.md`
- Etapas del flujo:
  - `skills/qa-xray-certification/analyze-ticket.md`
  - `skills/qa-xray-certification/review-coverage.md`
  - `skills/qa-xray-certification/design-cases.md`
  - `skills/qa-xray-certification/load-xray.md`
