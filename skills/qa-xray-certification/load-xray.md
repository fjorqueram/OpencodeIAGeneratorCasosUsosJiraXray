# SKILL: load-xray

## ⚠️ PROTOCOLO DE ARRANQUE
1. Confirmar que shared-rules.md está cargado ✅
2. Verificar que CASOS (design-cases) están disponibles en sesión.
3. Si no hay CASOS → ejecutar design-cases primero.

---

### ARGUMENTOS
`<ID_TARJETA>`

### MENSAJES DE PROGRESO
```
⏳ Creando caso "DYF_Validar <nombre>" (Complejidad: <valor>)...
⏳ Transicionando Backlog → En curso...
⏳ Transicionando En curso → Manual...
⏳ Asociando caso a {ID_TARJETA}...
✅ Caso creado exitosamente → [QA-XXXXX] | Estado: Manual
❌ No se pudo completar "[acción]" para "[nombre]". Intenta nuevamente.
```

---

## PASO 6 — CARGA EN XRAY

**Pregunta A — Casos existentes:**
> ¿Qué casos existentes deseas agregar a {ID_TARJETA}?
> `todos` / números por coma (ej: `1, 3`) / `no`

Esperar respuesta antes de continuar.

**Pregunta B — Casos nuevos:**
> ¿Qué casos nuevos deseas subir a {ID_TARJETA} en XRAY?
> `todos` / números por coma (ej: `1, 3, 5`) / `no`

Esperar respuesta antes de continuar.

---

**Si confirma casos existentes (Pregunta A):**
1. Mostrar resumen → `¿Confirmas? (sí / no)`
2. Por cada caso:
   ```
   ⏳ Asociando [QA-XXX] a {ID_TARJETA}...
   ✅ Asociado exitosamente → [QA-XXX]
   ```
3. Resumen final: `✅ Casos asociados exitosamente a {ID_TARJETA}: - [QA-XXX] Nombre`

---

**Si confirma casos nuevos (Pregunta B):**

1. Mostrar lista a subir con tipo (🔧 BACK / 🖥️ FRONT / 🔧🖥️ BACK+FRONT)
2. Obtener `assigneeAccountId` via `jira_get_current_user` (silencioso, solo una vez)
3. Preguntar complejidad una sola vez:
   ```
   ¿Complejidad para todos los casos nuevos?
     1. Simple  2. Intermedio  3. Complejo
   Escribe el número.
   ```
4. Esperar respuesta. Por cada caso ejecutar GATE DE CREACIÓN y luego:
   ```
   ⏳ Creando caso "DYF_Validar <nombre>" (Tipo: BACK|FRONT|BACK+FRONT — Complejidad: <valor>)...
   ⏳ Transicionando Backlog → En curso...
   ⏳ Transicionando En curso → Manual...   ← solo si readyForManual: true
   ⏳ Asociando caso a {ID_TARJETA}...
   ✅ Caso creado exitosamente → [QA-XXXXX] | Tipo: BACK|FRONT|BACK+FRONT | Estado: Manual
   ```

**Orden estricto por cada caso (en silencio total):**
1. ⛔ Verificar GATE DE CREACIÓN
2. `xray_create_test` con todos los parámetros
3. Leer `readyForManual` de la respuesta
4. `jira_transition_issue` Backlog → En curso
5. **Solo si `readyForManual: true`** → `jira_transition_issue` En curso → Manual
6. `xray_associate_test` con `testKey: <issueKey>` y `requirementKey: {ID_TARJETA}`

⛔ NUNCA ejecutar pasos en paralelo.
⛔ NUNCA usar Jira API como fallback si `xray_create_test` falla.
⛔ NUNCA transicionar a Manual si `readyForManual: false`.
⛔ NUNCA mezclar curl en pasos FRONT ni pasos UI en casos BACK.

**Advertencias:**
- Falla Backlog→En curso: `⚠️ Caso [QA-XXXXX] quedó en Backlog — requiere intervención manual.`
- Falla En curso→Manual: `⚠️ Caso [QA-XXXXX] quedó en En curso — requiere intervención manual.`
- `readyForManual: false`: `⚠️ Caso [QA-XXXXX] quedó en En curso — faltan campos Linea de Desarrollo o Complejidad.`

5. Resumen final:
```
✅ Proceso completado. Casos creados y asociados a {ID_TARJETA}:
- [QA-XXXXX] DYF_Validar nombre → Tipo: BACK | Estado: Manual (Complejidad: Simple)
- [QA-XXXXX] DYF_Validar nombre → Tipo: FRONT | Estado: Manual (Complejidad: Intermedio)
- [QA-XXXXX] DYF_Validar nombre → Tipo: BACK+FRONT | Estado: En curso — faltan campos obligatorios
```
Fallo en creación: `❌ No se pudo crear "[nombre]". Intenta nuevamente.`

---

## ⛔ GATE DE CREACIÓN — OBLIGATORIO ANTES DE LLAMAR xray_create_test

Por cada caso verificar los 5 puntos. Si alguno falla → corregir antes de crear.

**1. NOMBRE:** `DYF_Validar <qué> <bajo qué condición>` en lenguaje natural
- ✅ `DYF_Validar actualización de cuenta cuando el token está ausente`
- ❌ `DYF_validar_token_ausente` — snake_case prohibido
- ❌ `DYF_test1` — sin descripción funcional

**2. PASOS** en `steps[]` con los 3 campos por paso:
- ⛔ NUNCA en `description` ni en General
- Cada paso: `action`, `data` (valor concreto o `""`), `result`
- ⛔ NUNCA enviar paso con solo 2 campos
- Tipo BACK → FORMAT DE PASOS BACK (shared-rules.md)
- Tipo FRONT → FORMAT DE PASOS FRONT (shared-rules.md)

**3. DESCRIPCIÓN** en `description`:
```
Se debe validar <comportamiento>

Precondiciones:
- [QA-XXXXX] Nombre: https://imed.atlassian.net/browse/QA-XXXXX
```
- ⛔ NUNCA usar tarjeta de otro proyecto como precondición
- ⛔ NUNCA dejar `description` vacío
- ⛔ NUNCA omitir el prefijo `Se debe validar`

**4. CAMPOS OBLIGATORIOS:**
- `productos` → `["<VALOR_PRODUCTOS>"]`
- `complejidad` → `"Simple"` | `"Intermedio"` | `"Complejo"`
- `lineaDesarrollo` → valor resuelto (nunca `"Vertical de Desarrollo"`)
- `assigneeAccountId` → string de `jira_get_current_user`
- `projectKey` → siempre `"QA"`

**5. HERRAMIENTA:**
- ✅ `xray_create_test` para crear
- ✅ `xray_associate_test` con `testKey` + `requirementKey`
- ❌ Cualquier otra herramienta o API
