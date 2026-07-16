# OpencodeIAGeneratorCasosUsosJiraXray

Orquestador de IA con OpenCode para certificar funcionalidades y automatizar el flujo completo de QA funcional con Jira + Xray + GitHub + Postman, desde el análisis de una tarjeta hasta la creación/asociación de casos de prueba.

> ⚠️ **Advertencia importante**
>
> Este repositorio está publicado como **proyecto de ejemplo y referencia técnica**.  
> La estructura de agentes, skills, MCP y flujos está orientada a demostrar una implementación realista de certificación QA asistida por IA.  
> Dependiendo del equipo, permisos, red corporativa, credenciales y entorno local, la instalación puede variar por computador y contexto operativo.

---

## 1) ¿Qué hace este proyecto?

Implementa un flujo QA estructurado en 4 etapas:

1. **analyze-ticket** → analiza tarjeta Jira + rama GitHub + documentación Confluence + colecciones Postman.
2. **review-coverage** → revisa cobertura existente en Xray y detecta brechas.
3. **design-cases** → diseña casos nuevos con formato estricto (BACK / FRONT / BACK+FRONT).
4. **load-xray** → crea casos en Xray, transiciona estado en Jira y los asocia al requerimiento.

Todo esto está gobernado por reglas compartidas (`shared-rules.md`) y por un orquestador principal (`qa-xray-certification.md`).

---

## 2) ¿Cómo está estructurado (archivos importantes)?

- **`opencode.json`**
  - Define agentes, permisos, herramientas habilitadas y MCP conectados.
  - Es la base del runtime.

- **`src/index.ts`**
  - Implementa el servidor MCP custom (`xray-mcp`).
  - Contiene autenticación Xray, integración Jira y exposición de tools.

- **`skills/qa-xray-certification/*.md`**
  - Define la lógica funcional del flujo QA en lenguaje declarativo.
  - Cada skill cumple una etapa específica del pipeline.

- **`AGENTS.md`**
  - Reglas globales de seguridad, estilo de operación y protocolo de trabajo de agentes.

- **`docs/arquitectura.md`**
  - Documento técnico extendido con mapeo MCP ↔ APIs ↔ skills.

---

## 3) Instalación y uso (consideraciones reales)

La instalación depende del entorno de cada organización/computador:

- versión de Node y npm,
- acceso de red a Jira/Xray/Postman/GitHub,
- variables de entorno,
- permisos corporativos,
- configuración local de OpenCode/MCP.

Por esas razones, puede requerir ajustes específicos por equipo.

### Recomendación práctica

1. Instalar dependencias base.
2. Configurar variables de entorno usando `.env.example` como guía.
3. Verificar acceso a integraciones externas (Jira/Xray/GitHub/Postman).
4. Validar scripts locales (`typecheck`, `lint`, `test`).
5. Una vez operativo el entorno, reutilizar y adaptar:
   - los archivos **`.md`** (skills/reglas/proceso),
   - y el archivo **`.ts`** (servidor MCP e integraciones).

En otras palabras: primero se estabiliza entorno e integración; después se explotan los `.md` y `.ts` como base reutilizable para flujos QA propios.

---

## 4) Arquitectura general

- **Orquestador principal**: `gentle-orchestrator` (OpenCode)
- **Subagente funcional**: `qa-xray-certification`
- **Servidor MCP custom**: `src/index.ts` (xray-mcp)
- **Skills declaradas**: `skills/qa-xray-certification/*.md`
- **Configuración runtime**: `opencode.json`, `tui.json`

El orquestador **no ejecuta pasos inline**: delega al subagente QA, que sigue el flujo duro en orden.

---

## 5) Estructura del repositorio y explicación archivo por archivo

```text
.
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── opencode.json
├── opencode.jsonc
├── package.json
├── package-lock.json
├── tsconfig.json
├── tui.json
├── .env.example
├── .eslintrc.json
├── .github/workflows/ci.yml
├── docs/
│   └── arquitectura.md
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
