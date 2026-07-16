# SKILL: analyze-ticket

## ⚠️ PROTOCOLO DE ARRANQUE
1. Confirmar que shared-rules.md está cargado ✅
2. Llamar `mem_context` para recuperar historial de sesión.
3. NO responder al usuario hasta completar los pasos 1 y 2.

---

Actúa como QA funcional senior. Jira, GitHub, Confluence y Postman ya están conectados.

### ARGUMENTOS
`<ID_TARJETA> <VALOR_PRODUCTOS> <NOMBRE_REPO>`
- Arg 1 → ID tarjeta Jira
- Arg 2 → valor exacto campo `productos` en Xray
- Arg 3 → nombre repo GitHub (si falta, inferir: `CME` → `cme-cme`)

### OUTPUT ESPERADO
Al finalizar este skill, producir y guardar en contexto:
```
CONTEXTO = {
  objetivo, funcionalidad, criterios, riesgos,
  endpoint, lineaDesarrollo, equipo,
  archivosGithub[], tipoDetectado (BACK/FRONT/BACK+FRONT),
  coleccionPostman, curl,
  confluenceURL, flujos, reglas
}
```

---

## EJECUCIÓN EN PARALELO — HARD RULE

Lanzar los 4 pasos en **una sola ronda de tool calls simultáneos (Wave 1)**. No esperar que un paso termine para iniciar otro.

| Wave | Tool calls a lanzar juntos |
|---|---|
| 🚀 **Wave 1** | `jira_getJiraIssue` + `github_list_commits` + `postman_searchPostmanElements` + `jira_getJiraIssueRemoteIssueLinks` |
| 🔄 **Wave 2** (solo si es necesario) | Llamadas secundarias que dependan de resultados de Wave 1: fallbacks GitHub, `postman_getCollection`, búsqueda Confluence por nombre |

**Reglas:**
- ⚡ Wave 1 se lanza SIEMPRE completa en un solo batch, sin excepciones.
- 🔄 Wave 2 solo se ejecuta si algún paso de Wave 1 lo requiere (fallback, match secundario, etc.).
- 📊 Los bloques de output de cada paso se muestran JUNTOS al finalizar toda la wave, no uno a uno.
- ⚠️ Si un paso falla o no aplica → registrar el aviso y continuar. Ningún fallo detiene el flujo.

---

## PASO 1.1 — TARJETA JIRA

`⏳ Analizando tarjeta {ID_TARJETA}...`

Extraer de `https://imed.atlassian.net/browse/{ID_TARJETA}`:
- Objetivo funcional y de negocio
- Funcionalidad y criterios de aceptación
- Riesgos QA, supuestos, dependencias
- URL/endpoint del producto
- Campo **Linea de Desarrollo** → fallback campo **Equipo** → vacío con aviso
- Campo **Equipo**

⚠️ "Vertical de Desarrollo" es distinto a "Linea de Desarrollo" — nunca usarlo.

Mostrar obligatoriamente:
```
📋 ANÁLISIS DE TARJETA — {ID_TARJETA}
────────────────────────────────────────
🎯 Objetivo:         [valor]
📝 Funcionalidad:    [valor]
✅ Criterios:        [valor]
⚠️  Riesgos QA:      [valor]
🔗 Endpoint/URL:     [valor]
📊 Linea Desarrollo: [valor resuelto]
👥 Equipo:           [valor]
────────────────────────────────────────
```
✅ Si falla el acceso a Jira → registrar `⚠️ No se pudo acceder a la tarjeta {ID_TARJETA}. Continuando con la información disponible.` y continuar.

---

## PASO 1.2 — RAMA GITHUB

Repo privado org `imedcl`. Convención: `Feature/{ID_TARJETA}`.

**Flujo en orden estricto:**
1. `⏳ Verificando acceso a imedcl/{NOMBRE_REPO}...` → `github_get_file_contents` path `README.md`
   - Falla → `⚠️ Sin acceso. Verificar token GitHub.` → continuar sin GitHub
2. `⏳ Buscando rama Feature/{ID_TARJETA}...` → `github_list_commits` sha=`Feature/{ID_TARJETA}` per_page=20
   - Éxito → ir a paso 5
3. Falla → `⏳ Buscando rama feature/{ID_TARJETA}...` → sha=`feature/{ID_TARJETA}`
   - Éxito → ir a paso 5
4. Falla → `⏳ Listando ramas...` → `github_list_branches` per_page=100, paginar, filtrar por `{ID_TARJETA}`
   - Encontrada → ir a paso 5 | No encontrada → ir a paso 6
5. Rama encontrada → obtener commits + `github_compare_branches` base=`master`, clasificar archivos por tipo (frontend/backend), identificar endpoints nuevos/modificados, validaciones, modelos, componentes UI, tests unitarios existentes
6. No encontrada → `⚠️ No se encontró rama. Análisis basado en Jira y Confluence.`

Mostrar obligatoriamente:
```
✅ Información obtenida desde GitHub correctamente
────────────────────────────────────────
📦 Rama:                 {nombre}
🔗 URL:                  https://github.com/imedcl/{REPO}/tree/{nombre}
📝 Commits analizados:   N
📁 Archivos modificados: N
🔍 Hallazgos clave QA:
  - [hallazgo 1 — BACK o FRONT]
  - [hallazgo 2 — BACK o FRONT]
────────────────────────────────────────
```
✅ Si falla GitHub o no se encuentra la rama → registrar el `⚠️` correspondiente y continuar.

---

## PASO 1.3 — COLECCIÓN POSTMAN

`⏳ Buscando colección Postman para el endpoint detectado...`

⚠️ Este paso aplica solo a casos BACK. Si la tarjeta es puramente FRONT → registrar:
`⚠️ Tarjeta de tipo FRONT — sin búsqueda de colección Postman.` y no ejecutar Wave 2 para este paso.

**Fuente del endpoint (en orden de prioridad, disponible en Wave 2):**
1. URL/endpoint extraído en Paso 1.1
2. Endpoint detectado en Paso 1.2
3. URL encontrada en Paso 2

**Wave 1 — lanzar junto con 1.1, 1.2 y 2:**
- `postman_searchPostmanElements` con `q = "{VALOR_PRODUCTOS}"` entityType = `collections`
  - Sin coincidencia → `⚠️ No se encontró colección Postman. Curl generado manualmente.` → no ejecutar Wave 2 para este paso.

**Wave 2 — ejecutar SOLO si Wave 1 encontró colección y el tipo es BACK:**
- `postman_getCollection` sobre la colección encontrada
  - Sin coincidencia de endpoint → `⚠️ Endpoint no encontrado en colección. Curl se generará manualmente.`
  - Encontrado → extraer y guardar internamente:
    - Method, URL base + path, headers, body schema, variables de entorno
    - Nombre exacto colección y endpoint (para usar en `action` del test)

Mostrar obligatoriamente:
```
✅ Colección Postman encontrada
────────────────────────────────────────
📦 Colección:    [nombre exacto]
🔗 Endpoint:     [METHOD] [path completo]
📋 Headers:      [lista de headers]
📥 Body schema:  [campos con tipos o ejemplos]
🔧 Variables:    [lista de {{variables}}]
────────────────────────────────────────
```
✅ Cualquiera de los tres casos (encontrado / FRONT / no encontrado) es resultado válido.

---

## PASO 2 — CONFLUENCE

`⏳ Buscando documentación en Confluence...`

**Wave 1 — lanzar junto con 1.1, 1.2 y 1.3:**
- `jira_getJiraIssueRemoteIssueLinks({ID_TARJETA})` → buscar URLs Confluence en remote links
  - Encontrada → leer la página (Wave 2) e ir a MOSTRAR

**Wave 2 — ejecutar si Wave 1 no encontró links útiles — detenerse en el primer resultado útil:**
1. `⏳ Buscando en comentarios de {ID_TARJETA}...`
   → Revisar comentarios en busca de URLs Confluence
   → Si encuentra → leer y ir a MOSTRAR

2. `⏳ Buscando en Confluence por nombre de tarjeta...`
   → Buscar usando el título/summary de la tarjeta (disponible desde resultado 1.1)
   → Si encuentra → leer y ir a MOSTRAR

3. Sin resultado → `⚠️ Sin documentación Confluence. Casos diseñados en base a tarjeta y GitHub.`

Mostrar obligatoriamente:
```
✅ Documentación Confluence analizada
────────────────────────────────────────
📄 Fuente:      [URL o nombre — origen: link directo / comentario / búsqueda]
🔄 Flujos:      [flujos relevantes]
📏 Reglas:      [reglas de negocio]
💡 Origen:      Confluence / Tarjeta / GitHub
────────────────────────────────────────
```
✅ Si no se encuentra documentación → registrar `⚠️ Sin documentación Confluence.` y avanzar al FIN DEL SKILL.

---

## FIN DEL SKILL

Al completar los 4 pasos, el CONTEXTO está listo.
Indicar al usuario:
```
✅ Análisis completo de {ID_TARJETA}
Contexto listo para → /review-coverage o /qa-xray-certification
```
