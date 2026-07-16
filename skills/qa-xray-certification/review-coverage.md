# SKILL: review-coverage

## ⚠️ PROTOCOLO DE ARRANQUE
1. Confirmar que shared-rules.md está cargado ✅
2. Verificar que CONTEXTO de analyze-ticket está disponible en sesión.
3. Si no hay CONTEXTO → ejecutar analyze-ticket primero.

---

### ARGUMENTOS
`<ID_TARJETA> <VALOR_PRODUCTOS>`
- Arg 1 → ID tarjeta Jira
- Arg 2 → valor exacto campo `productos` en Xray

### OUTPUT ESPERADO
```
COBERTURA = {
  casosExistentes[],
  preconditionXray,   ← QA-XXXXX o null
  brechas[]
}
```

---

## EJECUCIÓN EN PARALELO — HARD RULE

Lanzar los 2 searches en **una sola ronda de tool calls simultáneos (Wave 1)**. No esperar que uno termine para iniciar el otro.

| Wave | Tool calls a lanzar juntos |
|---|---|
| 🚀 **Wave 1** | `xray_xray_search_tests` + `xray_xray_search_preconditions` |

**Reglas:**
- ⚡ Wave 1 se lanza SIEMPRE completa en un solo batch, sin excepciones.
- 📊 El bloque de output se muestra al finalizar Wave 1, no antes.
- ⚠️ Si un search falla → registrar el aviso y continuar. Ningún fallo detiene el flujo.

---

## PASO 3 — COBERTURA XRAY

`⏳ Revisando cobertura existente en Xray...`

**Wave 1 — lanzar ambos simultáneamente:**

**Búsqueda de Tests:**
- JQL: `project = QA AND issuetype = Test AND "productos" = "<VALOR_PRODUCTOS>" AND assignee = currentUser()`
- Las 4 condiciones son simultáneas y obligatorias
- Identificar: casos existentes, reutilizables, brechas (funcional, negativa, borde, humo)
- Agregar brechas adicionales detectadas desde GitHub (endpoints nuevos, validaciones, componentes UI)

**Búsqueda de Preconditions — OBLIGATORIA y NO salteable:**
- ⛔ NUNCA omitir aunque ya exista una tarjeta Jira relacionada
- ⛔ Una tarjeta Jira (`DYF-XXXX`, `CME-XXXX`) NO es una Precondition Xray
- JQL: `project = QA AND issuetype = Precondition AND "productos" = "<VALOR_PRODUCTOS>"`
- Si existe Precondition Xray reutilizable (`QA-XXXXX`) → guardar key y URL
- Si NO existe → usar: `- Contar con la colección de Postman o url de la página [URL para ingresar a la precondición]`
- ⛔ NUNCA usar la tarjeta {ID_TARJETA} ni tarjeta de otro proyecto como precondición

Mostrar obligatoriamente al finalizar Wave 1:
```
✅ Revisión de cobertura completada
────────────────────────────────────────
🔎 Casos existentes encontrados:  N
🔎 Precondition Xray encontrada:  [QA-XXXXX Nombre] o [Ninguna — se usará URL de endpoint]
⚠️  Brechas detectadas:           N
────────────────────────────────────────
```
⛔ No continuar hasta mostrar este bloque.

---

## FIN DEL SKILL

COBERTURA lista.
Indicar al usuario:
```
✅ Cobertura revisada para {ID_TARJETA}
Listo para → /design-cases o /qa-xray-certification
```
