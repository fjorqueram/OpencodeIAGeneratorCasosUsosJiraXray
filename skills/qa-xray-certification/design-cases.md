# SKILL: design-cases

## ⚠️ PROTOCOLO DE ARRANQUE
1. Confirmar que shared-rules.md está cargado ✅
2. Verificar que CONTEXTO (analyze-ticket) y COBERTURA (review-coverage) están disponibles.
3. Si falta alguno → ejecutar el skill correspondiente primero.

---

### ARGUMENTOS
`<ID_TARJETA>`

### OUTPUT ESPERADO
```
CASOS = {
  casosNuevos[] {
    nombre, tipo (BACK/FRONT/BACK+FRONT),
    description, steps[],
    complejidad, lineaDesarrollo, productos
  }
}
```

---

## PASO 4 — DISEÑO DE CASOS

`⏳ Diseñando casos de prueba para las brechas detectadas...`

Diseñar solo para cubrir brechas detectadas en COBERTURA.

⛔ Aplicar CLASIFICACIÓN DE TIPO DE PRUEBA (en shared-rules.md) antes de diseñar cada caso.
⛔ Aplicar FORMAT DE PASOS BACK o FORMAT DE PASOS FRONT según el tipo resuelto.

**Checklist por caso — verificar antes de pasar a Paso 5:**
- [ ] Tipo clasificado: BACK | FRONT | BACK+FRONT
- [ ] Nombre: `DYF_Validar <qué> <bajo qué condición>` en lenguaje natural
- [ ] `description` comienza con `Se debe validar` + sección Precondiciones correcta
- [ ] `description` NO contiene keys de otros proyectos como precondición
- [ ] Si existe Precondition Xray → `- [QA-XXXXX] Nombre: URL`
- [ ] Si NO existe → `- Contar con la colección de Postman o url de la página [URL]`
- [ ] Pasos con FORMAT correcto según tipo
- [ ] Cada step tiene los 3 campos: `action`, `data` (valor concreto o `""`), `result`
- [ ] ⛔ NUNCA curl en pasos FRONT — ⛔ NUNCA pasos UI en casos BACK
- [ ] Último paso es verificación explícita del resultado final
- [ ] `complejidad` y `lineaDesarrollo` tienen valor resuelto
- [ ] `productos` tiene el valor exacto del arg 2 como array
- [ ] Pasos opcionales (BD, endpoint secundario) solo si están justificados

---

## PASO 5 — ENTREGA DE RESULTADOS

⚠️ Mostrar completo y obligatoriamente. No resumir ni omitir ningún caso ni paso.

**Listado 1 — Casos existentes Xray:**
`#` | `ID` | `Nombre` | `Tipo` | `Reutilizar / Requiere rediseño` | `Justificación`

**Listado 2 — Casos nuevos:**

Para casos BACK:
```
─────────────────────────────────────────
CASO NUEVO #N — 🔧 BACK
─────────────────────────────────────────
Nombre:           DYF_Validar <escenario>
Tipo de caso:     BACK
Origen:           Jira | GitHub | Confluence | Combinado

DETALLES CLAVE (campo description)
  Comportamiento: Se debe validar [qué y bajo qué condición]
                  Precondiciones:
                  - [QA-XXXXX] Nombre: URL  (o Contar con colección...)

Tipo de prueba:   Manual
Estado:           Manual (Backlog → En curso → Manual)
Complejidad:      <Simple | Intermedio | Complejo>
Linea Desarrollo: <valor resuelto>

DETALLES DEL TEST (campo steps[])
┌─────────────────────────┬───────────────────────┬──────────────────────────────┐
│ Acción                  │ Datos                 │ Resultado Esperado           │
├─────────────────────────┼───────────────────────┼──────────────────────────────┤
│ Ingresar al endpoint... │ { "curl": "...", ... } │ Se debe visualizar el request│
├─────────────────────────┼───────────────────────┼──────────────────────────────┤
│ Presionar botón Send    │ ""                    │ Se debe visualizar response...│
└─────────────────────────┴───────────────────────┴──────────────────────────────┘
─────────────────────────────────────────
```

Para casos FRONT:
```
─────────────────────────────────────────
CASO NUEVO #N — 🖥️ FRONT
─────────────────────────────────────────
Nombre:           DYF_Validar <escenario>
Tipo de caso:     FRONT
Origen:           Jira | GitHub | Confluence | Combinado

DETALLES CLAVE (campo description)
  Comportamiento: Se debe validar [qué y bajo qué condición]
                  Precondiciones:
                  - [QA-XXXXX] Nombre: URL  (o Contar con colección...)

Tipo de prueba:   Manual
Estado:           Manual (Backlog → En curso → Manual)
Complejidad:      <Simple | Intermedio | Complejo>
Linea Desarrollo: <valor resuelto>

DETALLES DEL TEST (campo steps[])
┌─────────────────────────┬───────────────────────┬──────────────────────────────┐
│ Acción                  │ Datos                 │ Resultado Esperado           │
├─────────────────────────┼───────────────────────┼──────────────────────────────┤
│ Ingresar a [sección]... │ "<URL o ''>"          │ Se debe visualizar [pantalla]│
├─────────────────────────┼───────────────────────┼──────────────────────────────┤
│ [Interacción UI]        │ "<valor o ''>"        │ Se debe visualizar [resultado]│
├─────────────────────────┼───────────────────────┼──────────────────────────────┤
│ Verificar resultado...  │ ""                    │ Se debe visualizar [final]   │
└─────────────────────────┴───────────────────────┴──────────────────────────────┘
⛔ NUNCA usar curl ni JSON en campo Datos de pasos FRONT.
─────────────────────────────────────────
```

Para casos BACK+FRONT: aplicar ambos formatos en orden dentro de la misma tabla.

⛔ No continuar a load-xray hasta mostrar todos los casos con tablas completas.

---

## FIN DEL SKILL

CASOS listos.
Indicar al usuario:
```
✅ Casos diseñados para {ID_TARJETA}
Listo para → /load-xray o /qa-xray-certification
```
