# OpencodeIAGeneratorCasosUsosJiraXray

Orquestador de IA con Opencode para generar, revisar y cargar casos de prueba funcionales en Xray/Jira, partiendo de tickets y requisitos.  
El proyecto organiza un flujo guiado por prompts para:

1. Analizar el ticket/requisito.
2. Diseñar casos de prueba candidatos.
3. Revisar cobertura y calidad.
4. Preparar salida compatible con Xray.
5. Cargar/importar los casos en Xray.

---

## Objetivo del proyecto

Este repositorio centraliza un flujo de QA asistido por IA para reducir trabajo manual en la creación de casos de prueba y mejorar consistencia en certificación funcional.

Está pensado para equipos que usan:
- **Jira** para gestión de requerimientos/incidencias.
- **Xray** para gestión de casos de prueba.
- **Opencode** como motor/orquestador de prompts y habilidades.

---

## Estructura del repositorio

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

---

## Explicación archivo por archivo

## 1) Archivos raíz

### `AGENTS.md`
Documento de configuración/instrucciones para agentes o comportamiento de ejecución (convenciones, pautas del asistente, reglas operativas).  
Sirve como referencia de cómo debe comportarse la IA dentro del flujo del repositorio.

### `LICENSE`
Licencia del proyecto (**MIT**).  
Define permisos de uso, copia, modificación y distribución del código.

### `README.md`
Documentación principal del proyecto (este archivo).

### `opencode.json`
Archivo principal de configuración de Opencode.  
Aquí normalmente se define:
- Skills disponibles.
- Flujo o wiring entre prompts/habilidades.
- Parámetros de ejecución/contexto.

Es el núcleo de configuración para que el orquestador sepa cómo ejecutar el proceso de generación de casos.

### `opencode.jsonc`
Variante JSON con comentarios (JSONC), usada como apoyo de configuración/documentación breve del setup de Opencode.

### `package.json`
Metadatos y dependencias del proyecto Node.js (nombre, versión, scripts, etc.).  
Aunque es mínimo, identifica el proyecto como paquete JavaScript/TypeScript.

### `package-lock.json`
Lockfile de npm que fija versiones exactas de dependencias para garantizar instalaciones reproducibles.

### `tui.json`
Configuración asociada a interfaz textual (TUI) o personalización de experiencia en consola para ejecución/interacción del flujo.

---

## 2) Código fuente

### `src/index.ts`
Punto de entrada principal del proyecto en TypeScript.  
Este archivo normalmente concentra la lógica de arranque/orquestación, por ejemplo:
- Inicializar contexto del flujo.
- Ejecutar secuencia de habilidades (análisis → diseño → revisión → carga).
- Gestionar inputs/outputs y control de errores.
- Coordinar configuración cargada desde `opencode.json`.

En resumen, es el “director” técnico que conecta todas las piezas del pipeline.

---

## 3) Skills (prompts/habilidades de QA y Xray)

Ruta: `skills/qa-xray-certification/`

Estas habilidades encapsulan pasos del proceso de certificación:

### `qa-xray-certification.md`
Skill principal del dominio.  
Define la visión integral del flujo de certificación QA para Xray y cómo se encadenan las sub-habilidades.

### `shared-rules.md`
Reglas transversales compartidas por todas las skills:
- Estándares de calidad.
- Convenciones de redacción.
- Restricciones/formato de salida.
- Criterios de consistencia para casos de prueba.

Este archivo evita duplicación de reglas y mantiene uniformidad entre etapas.

### `analyze-ticket.md`
Etapa de análisis de ticket/requisito:
- Interpreta alcance funcional.
- Identifica supuestos, riesgos y dependencias.
- Extrae criterios que luego se convierten en escenarios de prueba.

Es la base semántica para que los casos diseñados sean relevantes.

### `design-cases.md`
Etapa de diseño de casos de prueba:
- Construye casos a partir del análisis previo.
- Define precondiciones, pasos, datos y resultados esperados.
- Apunta a formato útil para trazabilidad y posterior carga en Xray.

### `review-coverage.md`
Etapa de revisión de cobertura:
- Verifica si los casos cubren escenarios positivos/negativos/borde.
- Detecta huecos de validación.
- Propone mejoras antes de cargar a Xray.

Sirve como control de calidad previo a publicación.

### `load-xray.md`
Etapa de preparación/carga hacia Xray:
- Ajusta estructura/formatos requeridos por Xray.
- Estandariza campos para importación.
- Define pautas para que el resultado final sea cargable y trazable en Jira/Xray.

---

## Flujo funcional completo

1. **Input**: ticket o requerimiento (Jira u otra fuente).
2. **Análisis** (`analyze-ticket.md`): comprensión de alcance y criterios.
3. **Diseño** (`design-cases.md`): generación de casos de prueba.
4. **Revisión** (`review-coverage.md` + `shared-rules.md`): validación de cobertura/calidad.
5. **Preparación de carga** (`load-xray.md`): normalización para Xray.
6. **Orquestación técnica** (`src/index.ts` + `opencode.json`): ejecución del pipeline end-to-end.

---

## Cómo mantener este repositorio

- Mantener reglas globales en `shared-rules.md`.
- Mantener cada etapa en su skill específica.
- Evitar lógica duplicada entre skills.
- Versionar cambios de prompts con mensajes claros de commit.
- Probar el flujo completo cuando cambie una skill transversal.

---

## Recomendaciones de mejora (sugeridas)

- Agregar ejemplos de entrada/salida por cada etapa en `skills/`.
- Documentar contrato de datos entre fases (JSON schema).
- Incluir scripts npm para ejecutar validaciones automáticas.
- Añadir sección de troubleshooting (errores comunes de carga en Xray).

---

## Tecnologías y ecosistema

- **TypeScript / Node.js**
- **Opencode** (orquestación de IA y skills por prompts)
- **Jira + Xray** (gestión y ejecución de QA)

---

## Licencia

Este proyecto está bajo licencia **MIT** (ver archivo `LICENSE`).
