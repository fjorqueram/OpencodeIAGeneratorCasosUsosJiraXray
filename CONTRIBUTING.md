# Contribuir a OpencodeIAGeneratorCasosUsosJiraXray

Gracias por aportar 🙌  
Este proyecto usa OpenCode + MCP para QA funcional con Jira/Xray.

## Flujo recomendado

1. Crear branch desde `main`
2. Usar nombre descriptivo:
   - `feat/...`
   - `fix/...`
   - `docs/...`
3. Realizar cambios pequeños y atómicos
4. Validar localmente:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
5. Abrir Pull Request con contexto claro

## Convención de commits (Conventional Commits)

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

Ejemplos:
- `feat: agregar validación de lineaDesarrollo`
- `docs: ampliar arquitectura de MCP`
- `fix: corregir transición a estado Manual`

## Checklist de PR

- [ ] No expone secretos/tokens
- [ ] Mantiene formato de skills y reglas compartidas
- [ ] Actualiza documentación si cambió comportamiento
- [ ] Incluye pruebas o justifica por qué no aplica
- [ ] Cambios acotados al objetivo del PR

## Reglas importantes del dominio QA/Xray

- No saltar etapas del flujo: analyze → review → design → load
- No mezclar pasos FRONT con cURL/JSON
- Todo caso debe tener `action`, `data`, `result`
- Respetar naming: `DYF_Validar <qué> <condición>`

## Seguridad

- Nunca commitear `.env*`
- Nunca imprimir credenciales o tokens en logs/salidas
- Usar variables de entorno para todas las integraciones
