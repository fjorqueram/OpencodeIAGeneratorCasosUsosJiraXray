# 🤖 OpenCode IA Generator — Casos de Uso Jira/Xray

> Orquestador de IA que automatiza el flujo completo de generación, diseño y carga de casos de prueba desde Jira hasta Xray Cloud, con pasos incluidos, a través de prompts en lenguaje natural.

---

## 📋 ¿Qué hace este proyecto?

Este proyecto expone un **servidor MCP (Model Context Protocol)** escrito en TypeScript que actúa como puente entre un agente de IA (OpenCode) y las APIs de **Jira** y **Xray Cloud**.

El flujo completo que orquesta es:

```
Prompt del usuario
      │
      ▼
 Analizar tarjeta Jira
      │
      ▼
 Obtener datos del ticket (historia de usuario, criterios de aceptación)
      │
      ▼
 Buscar tests y precondiciones existentes en Xray
      │
      ▼
 Diseñar nuevos casos de prueba (happy path, edge cases, error flows)
      │
      ▼
 Crear tests en Xray con pasos nativos via GraphQL
      │
      ▼
 Ejecutar transiciones de estado (Backlog → En curso → Manual)
      │
      ▼
 Asociar el test a la tarjeta Jira de origen
```

---

## 🏗️ Arquitectura

```
OpencodeIAGeneratorCasosUsosJiraXray/
├── src/
│   └── index.ts              # Servidor MCP con todas las herramientas expuestas
├── skills/
│   └── qa-xray-certification/
│       ├── qa-xray-certification.md  # Punto de entrada del skill (subagente)
│       ├── analyze-ticket.md         # Paso 1: Análisis del ticket Jira
│       ├── review-coverage.md        # Paso 2: Revisión de cobertura existente en Xray
│       ├── design-cases.md           # Paso 3: Diseño de casos de prueba
│       ├── load-xray.md              # Paso 4: Carga de tests a Xray
│       └── shared-rules.md           # Reglas compartidas entre pasos
├── opencode.json             # Configuración de agentes y MCPs
├── AGENTS.md                 # Reglas globales del orquestador
└── package.json
```

### Agentes definidos en `opencode.json`

| Agente | Rol | Modo |
|---|---|---|
| `gentle-orchestrator` | Coordinador principal — delega, nunca ejecuta inline | Primary |
| `qa-xray-certification` | QA senior: analiza Jira, busca en Xray y diseña casos de prueba | Subagente |
| `sdd-explore` | Investiga el codebase y genera ideas | Subagente |
| `sdd-design` | Crea diseño técnico a partir de propuestas | Subagente |
| `sdd-spec` | Escribe especificaciones detalladas | Subagente |
| `sdd-apply` | Implementa cambios de código | Subagente |
| `sdd-verify` | Valida implementación contra specs | Subagente |
| `sdd-tasks` | Descompone specs en tareas de implementación | Subagente |

---

## 🛠️ Herramientas MCP expuestas

### Herramientas individuales

| Herramienta | Descripción |
|---|---|
| `xray_search_tests` | Busca casos de prueba en Xray usando JQL |
| `xray_search_preconditions` | Busca Preconditions en Xray usando JQL |
| `xray_create_test` | Crea un test Manual en Xray con pasos via GraphQL |
| `xray_associate_test` | Vincula un test de Xray a una tarjeta Jira |
| `jira_get_transitions` | Obtiene las transiciones disponibles de un issue |
| `jira_transition_issue` | Ejecuta una transición de estado en un issue |
| `jira_get_current_user` | Retorna el `accountId` del usuario autenticado |

### Herramientas orquestadas (optimizadas)

| Herramienta | Descripción |
|---|---|
| `analyze_ticket_context` | Obtiene tests existentes, preconditions y usuario actual en paralelo (~3x más rápido que llamadas individuales) |
| `create_and_load_test` | Crea el test, ejecuta transiciones Backlog→En curso→Manual y asocia a la tarjeta Jira en una sola llamada |

---

## ⚙️ Requisitos previos

- [Node.js](https://nodejs.org/) v18+
- Cuenta en **Jira Cloud** (Atlassian)
- Cuenta en **Xray Cloud** con Client ID y Client Secret
- [OpenCode](https://opencode.ai/) instalado y configurado

---

## 🚀 Instalación y configuración

### 1. Clona el repositorio

```bash
git clone https://github.com/fjorqueram/OpencodeIAGeneratorCasosUsosJiraXray.git
cd OpencodeIAGeneratorCasosUsosJiraXray
npm install
```

### 2. Configura las variables de entorno

Agrega las siguientes variables en tu `~/.zshrc` (o `~/.bashrc`):

```bash
export XRAY_CLIENT_ID="tu_client_id"
export XRAY_CLIENT_SECRET="tu_client_secret"
export JIRA_EMAIL="tu@email.com"
export JIRA_API_TOKEN="tu_jira_api_token"
export JIRA_URL="https://tu-empresa.atlassian.net"
export GITHUB_PERSONAL_ACCESS_TOKEN="tu_github_pat"
export POSTMAN_API_KEY="tu_postman_key"   # opcional
```

> ⚠️ **Nunca hardcodees credenciales** en el código ni en archivos trackeados por git.

### 3. Compila el proyecto

```bash
npm run build
```

### 4. Configura OpenCode

Copia o enlaza el `opencode.json` a tu directorio de configuración de OpenCode y asegúrate de que el path al binario compilado (`dist/index.js`) sea correcto en la sección `mcp.xray`.

---

## 🧠 Uso con OpenCode

Una vez configurado, inicia OpenCode en el directorio del proyecto:

```bash
opencode
```

Luego usa el skill de certificación QA:

```
/qa-xray-certification DYF-1234 DYF dyf-dyf
```

Esto activa el subagente `qa-xray-certification` que ejecutará automáticamente el flujo completo:

1. **Analiza** la tarjeta Jira `DYF-1234`
2. **Revisa** la cobertura existente en Xray
3. **Diseña** casos de prueba (happy path + edge cases + error flows)
4. **Carga** los tests a Xray con pasos, y los asocia a la tarjeta

---

## 📐 Formato de casos de prueba generados

Los casos de prueba siguen el estándar Xray-compatible:

```
Test Summary:    Given <contexto>, when <acción>, then <resultado esperado>
Preconditions:   <estado del sistema requerido>
Steps:
  | # | Acción                        | Resultado Esperado              |
  |---|-------------------------------|---------------------------------|
  | 1 | <ejecutar acción>             | <qué debe ocurrir>              |
Priority:        critical | high | medium | low
Test Type:       functional | regression | smoke | e2e
Labels:          <módulo>, <feature>
```

---

## 🔒 Seguridad

- Las credenciales se leen **exclusivamente** de variables de entorno.
- El token de Xray se cachea por sesión (~1 hora) y nunca se imprime en logs.
- El orquestador suprime toda salida cruda de APIs (tokens, JSON responses, headers).
- Los archivos `.env` y de credenciales están bloqueados en la configuración de permisos de lectura.

---

## 🧩 MCPs integrados

| MCP | Propósito |
|---|---|
| `jira` | Acceso a Jira Cloud via Atlassian MCP |
| `xray` | Acceso a Xray Cloud (servidor MCP local — este proyecto) |
| `github` | Acceso a GitHub via GitHub MCP Server |
| `context7` | Documentación contextual de librerías |
| `engram` | Memoria persistente entre sesiones |
| `postman` | Acceso a colecciones Postman |

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](./LICENSE).

---

> Desarrollado con [OpenCode](https://opencode.ai/) + Claude Sonnet + Xray Cloud + Jira API
