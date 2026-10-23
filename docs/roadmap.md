# Roadmap

## Estado actual

- 13 escenarios interactivos.
- Loop de 5 etapas con request/response y toggle Anthropic / OpenAI.
- Taller de Pydantic y contratos.
- Sandbox de payload, comparador A/B, exportación y glosario.
- Cuatro labs BYO Harness: diff approval, compactación, tool registry y slash commands.

## Prioridades

### P0 — Hecho

- [x] Repositorio dedicado y deploy estático.
- [x] Diff approval interactivo (§18).
- [x] Estrategias de compactación + SafeSplitPoint (§07).
- [x] Tool registry con definitions/execute y efecto en caché (§09).
- [x] Slash commands con dispatcher (§05).

### P1 — Próximo

- [ ] Escenario o lab de memoria entre sesiones (`Preamble`, `Save`, `Recall`, `.harness/`).
- [ ] Lab de `AGENTS.md`: cargar, editar y ver invalidación de caché.
- [ ] Mapa visual de puntos de extensión: Provider / Tool / Compaction / Memory / Command.
- [ ] Página de “cómo extender” con un ejemplo mínimo por costura.

### P2 — Deseable

- [ ] 3–5 desafíos con criterios de aceptación.
- [ ] Mini state machine de TUI: `idle → running → awaiting_approval`.
- [ ] Badge de “usage real vs estimado” en el resumen.
- [ ] Tests de humo dentro del repo (`tests/`) para escenarios, labs y mobile.

## Reglas de diseño

- Un solo archivo HTML, sin build ni dependencias para el deploy.
- No agregar datos personales a ejemplos: usar `<sistema>`, `<raíz-del-proyecto>`, `<rama>`.
- Cada lab debe tener: contrato, estado visible, acción y resultado.
- No duplicar la corrida: los labs son simulaciones independientes.
- Mantener español rioplatense y explicar los términos en inglés.
