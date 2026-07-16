# SHARED RULES — QA Xray Certification

## REGLAS DE OUTPUT

**SUPRIMIR siempre — nunca mostrar al usuario:**
- Output crudo de herramientas, JSON, HTML, HTTP headers, status codes
- Tokens, secrets, IDs de sesión, credenciales, accountIds, cloudIds
- Stack traces, errores internos, detalles de implementación
- Bloques internos del modelo: `# Todos`, `Goal`, `Progress`, `Key Decisions`, `Critical Context`, `Next Steps`, `In Progress`, `Blocked`, `Done`, `Constraints`, `Relevant Files`
- Mensajes de compactación: `FIRST ACTION REQUIRED`, `mem_session_summary`, bloques de estado de sesión
- Razonamiento interno, planificación o checkboxes del modelo (`[ ]`, `[x]`, `[•]`)
- Resultados intermedios de herramientas aunque sean legibles

**MOSTRAR siempre — obligatorio en pantalla:**
- Mensajes ⏳ ✅ ❌ ⚠️ definidos en cada skill
- Bloques de resumen de cada paso
- Tablas de casos de prueba completas con todos sus pasos
- Preguntas al usuario

**Regla simple: suprimir datos técnicos y estado interno del modelo — mostrar todo lo que el usuario necesita ver.**

---

## REGLAS DE NOMENCLATURA — SIEMPRE ACTIVAS

**Nombre del caso:**
- Formato: `DYF_Validar <qué> <bajo qué condición>`
- ⛔ NUNCA usar snake_case: `DYF_validar_algo`
- ⛔ NUNCA usar nombres genéricos: `DYF_test1`, `DYF_caso_humo`
- ⛔ NUNCA omitir `DYF_Validar` al inicio

**Linea de Desarrollo (`lineaDesarrollo`):**
- Campo "Linea de Desarrollo" de la tarjeta → si vacío, fallback campo "Equipo" → si vacío, dejar vacío con aviso
- ⛔ NUNCA usar "Vertical de Desarrollo" como valor

**Pasos (Detalles del Test):**
- ⛔ NUNCA poner pasos en `description` ni en General
- SIEMPRE en `steps[]` con los 3 campos obligatorios: `action`, `data`, `result`
- `action`: qué hace el ejecutor
- `data`: valor concreto de entrada — si no aplica, usar `""` explícito. ⛔ NUNCA omitir
- `result`: comportamiento esperado observable
- ⛔ NUNCA enviar un paso con solo 2 campos — los 3 son requeridos por Xray

**Precondición en `description`:**
- ⛔ NUNCA usar una tarjeta `DYF-XXXX`, `CME-XXXX` u otro proyecto como precondición
- Si existe Precondition Xray (`QA-XXXXX`): `- [QA-XXXXX] Nombre: https://imed.atlassian.net/browse/QA-XXXXX`
- Si NO existe Precondition Xray: `- Contar con la colección de Postman o url de la página [URL para ingresar a la precondición]`

---

## CLASIFICACIÓN DE TIPO DE PRUEBA — OBLIGATORIA

| Tipo | Cuándo aplica | Formato de pasos a usar |
|---|---|---|
| **BACK** | Valida un endpoint API directamente. Se ejecuta desde Postman/curl. No involucra UI. | FORMAT DE PASOS BACK |
| **FRONT** | Valida comportamiento en interfaz de usuario: pantallas, formularios, botones, mensajes. | FORMAT DE PASOS FRONT |
| **BACK+FRONT** | Valida una acción en UI que dispara un endpoint y se verifica resultado en pantalla. | FORMAT BACK para endpoint + FORMAT FRONT para flujo visual |

**Señales para clasificar como BACK:**
- Criterios de aceptación mencionan: endpoint, API, request, response, payload, status code, JSON, REST
- GitHub muestra: controladores, servicios, rutas, archivos de configuración de API nuevos o modificados
- Confluence documenta: contrato de API, Swagger, colección Postman, especificación técnica de servicio
- Se encontró curl en Paso 1.3 para ese flujo específico

**Señales para clasificar como FRONT:**
- Criterios de aceptación mencionan: pantalla, botón, formulario, modal, mensaje de error en UI, flujo de usuario, redirección, vista
- GitHub muestra: componentes, vistas, páginas, archivos `.vue`, `.tsx`, `.jsx`, `.html`, `.css`
- No hay endpoint directamente ejecutable desde Postman para ese flujo
- El caso describe navegación, interacción o visualización en una interfaz

**Señales para clasificar como BACK+FRONT:**
- La tarjeta tiene criterios tanto de UI como de API en el mismo flujo
- GitHub muestra cambios en frontend Y en backend para la misma funcionalidad
- El caso requiere verificar que una acción en UI genera el resultado correcto en la API y viceversa

⛔ NUNCA aplicar FORMAT DE PASOS BACK a un caso puramente de UI.
⛔ NUNCA aplicar FORMAT DE PASOS FRONT a un caso que valida directamente un endpoint.
⛔ NUNCA omitir la clasificación — todo caso debe tener tipo explícito antes de diseñar sus pasos.

---

## FORMAT DE PASOS BACK — OBLIGATORIO PARA CASOS TIPO BACK

⛔ NUNCA generar pasos adicionales innecesarios — usar SOLO esta estructura de 2 pasos base + opcionales justificados.

**PASO 1 — Ejecución del request:**
```
action: "Ingresar al endpoint [MÉTODO] [NOMBRE DEL ENDPOINT] de [NOMBRE DE LA COLECCIÓN]"
data:   { "curl": "...", "method": "...", "headers": {...}, "body": {...} }
result: "Se debe visualizar el request o parámetros a enviar para la consulta"
```

**PASO 2 — Envío y validación de respuesta:**
```
action: "Presionar botón Send"
data:   ""
result: → Flujo exitoso:  "Se debe visualizar un response con [datos esperados / status 200]"
        → Caso negativo: "Se debe visualizar un response con mensaje de error [HTTP 4XX]"
```

**PASOS OPCIONALES:**
```
Validación BD (solo si requiere verificar persistencia):
action: "Revisar base de datos de [Nombre BD]"
data:   "<query o ''>"
result: "Se debe visualizar [dato esperado en BD]"

Endpoint secundario (solo si requiere llamar otro endpoint para confirmar):
action: "Ingresar al endpoint [MÉTODO] [NOMBRE] de [COLECCIÓN]"
data:   { "curl": "...", "method": "...", "headers": {...}, "body": {...} }
result: "Se debe visualizar [respuesta esperada]"
```

⛔ NUNCA agregar pasos de BD ni endpoint secundario si no están justificados.
⛔ NUNCA crear pasos como "Copiar token", "Abrir Postman", "Verificar URL".
⛔ El campo `data` del Paso 2 (Send) siempre es `""`.
⛔ Si no se encontró colección Postman → generar curl manualmente. Nunca omitir el curl en casos BACK.

---

## FORMAT DE PASOS FRONT — OBLIGATORIO PARA CASOS TIPO FRONT

⛔ NUNCA usar curl ni JSON en el campo `data` de pasos front.
⛔ NUNCA incluir pasos como "Abrir navegador", "Conectarse a VPN".

**PASO 1 — Navegación:**
```
action: "Ingresar a [sección/módulo/pantalla] en [nombre del sistema/ambiente]"
data:   "<URL del ambiente o ''>"
result: "Se debe visualizar [pantalla esperada con sus elementos principales]"
```

**PASOS INTERMEDIOS — Interacción UI:**
```
action: "Completar campo / Seleccionar / Hacer clic en [nombre del elemento]"
data:   "<valor a ingresar o ''>"
result: "Se debe visualizar [comportamiento esperado]"
```

**ÚLTIMO PASO — Verificación final:**
```
action: "Verificar resultado final en pantalla"
data:   ""
result: → Flujo exitoso:  "Se debe visualizar [mensaje de éxito / dato actualizado]"
        → Caso negativo: "Se debe visualizar [mensaje de error o validación en UI]"
```

**PASO OPCIONAL — BD (solo si requiere confirmar persistencia):**
```
action: "Revisar base de datos de [Nombre BD]"
data:   "<query o ''>"
result: "Se debe visualizar [dato persistido en BD]"
```

⛔ Mínimo 2 pasos: navegación + verificación final.
⛔ El campo `data` siempre presente — valor concreto o `""`. NUNCA omitir.
⛔ NUNCA agregar paso de BD si no está justificado.

---

## HERRAMIENTAS MCP DISPONIBLES

| Herramienta MCP | Parámetros clave | Uso |
|---|---|---|
| `xray_create_test` | `summary`, `projectKey`, `steps[]`, `description`, `productos`, `complejidad`, `lineaDesarrollo`, `assigneeAccountId` | Crear caso de prueba Manual con pasos |
| `xray_associate_test` | `testKey`, `requirementKey` | Vincular test a tarjeta Jira |
| `xray_search_tests` | `jql` | Buscar tests existentes |
| `xray_search_preconditions` | `jql` | Buscar preconditions existentes |
| `jira_get_transitions` | `issueKey` | Obtener transiciones disponibles |
| `jira_transition_issue` | `issueKey`, `transitionId` | Ejecutar transición de estado |
| `jira_get_current_user` | — | Obtener accountId del usuario conectado |
| `postman_get_collections` | — | Listar colecciones disponibles |
| `postman_get_collection` | `collectionId` | Obtener colección completa |
| `postman_find_request` | `collectionId`, `urlPath` | Buscar request por path |
| `github_get_file_contents` | — | Verificar repo y leer archivos |
| `github_list_commits` | `sha` | Commits por rama |
| `github_list_branches` | — | Listar ramas |
| `github_compare_branches` | — | Comparar ramas |
| `github_search_code` | — | Buscar código |

⛔ NUNCA usar: `github_search_repositories`, `get_repository`, `get_branch`.
⛔ `xray_associate_test` SIEMPRE con `testKey` + `requirementKey`. NUNCA con `issueKey` ni `testKeys[]`.
