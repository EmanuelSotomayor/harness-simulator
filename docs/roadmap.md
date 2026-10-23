# Roadmap

## Estado actual

- 13 escenarios interactivos.
- Loop de 5 etapas con request/response y toggle Anthropic / OpenAI.
- Taller de Pydantic y contratos.
- Sandbox de payload, comparador A/B, exportación y glosario.
- Diez labs de harness: diff approval, compactación, tool registry, slash commands, memoria, AGENTS.md, puntos de extensión, desafíos, tool result real y streaming con cancelación.

## Prioridades

### P0 — Hecho

- [x] Repositorio dedicado y deploy estático.
- [x] Diff approval interactivo (§18).
- [x] Estrategias de compactación + SafeSplitPoint (§07).
- [x] Tool registry con definitions/execute y efecto en caché (§09).
- [x] Slash commands con dispatcher (§05).

### P1 — Hecho

- [x] Lab de memoria entre sesiones (`Preamble`, `Save`, `Recall`, `.harness/`).
- [x] Lab de `AGENTS.md`: cargar, editar y ver invalidación de caché.
- [x] Mapa visual de puntos de extensión: Provider / Tool / Compaction / Memory / Command.
- [ ] Página de “cómo extender” con un ejemplo mínimo por costura.

### P2 — Hecho

- [x] 5 desafíos con criterios de aceptación y pistas.
- [x] Lab de tool result real: pegar output, truncar y medir tokens.
- [x] Lab de streaming con cancelación y costo parcial.

### P2 — Deseable

- [ ] Mini state machine de TUI: `idle → running → awaiting_approval`.
- [ ] Badge de “usage real vs estimado” en el resumen.
- [ ] Tests de humo dentro del repo (`tests/`) para escenarios, labs y mobile.

## Reglas de diseño

- Un solo archivo HTML, sin build ni dependencias para el deploy.
- No agregar datos personales a ejemplos: usar `<sistema>`, `<raíz-del-proyecto>`, `<rama>`.
- Cada lab debe tener: contrato, estado visible, acción y resultado.
- No duplicar la corrida: los labs son simulaciones independientes.
- Mantener español rioplatense y explicar los términos en inglés.
