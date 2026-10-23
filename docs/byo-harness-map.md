# Mapa curricular: BYO Harness → simulador

Fuente: [Build Your Own Coding Agent / BYO Harness](https://www.byoharness.dev/es/#curriculum) (MIT).  
La página propone 20 lecciones, 3 how-tos y 6 ejercicios. Este documento no copia el curso: lo usa como checklist para decidir qué vale la pena llevar al simulador.

## Criterio

El simulador no intenta reemplazar un curso de implementación. Su valor es **ver una decisión del harness en cámara lenta**: qué viaja, quién decide, qué se descarta y qué vuelve al modelo. Por eso las mejoras se concentran en decisiones interactivas, no en agregar lecciones teóricas.

## Cobertura actual

| BYO Harness | Qué hay en el simulador | Estado |
|---|---|---|
| §00 ¿Qué es harness engineering? | Idea central: el modelo propone, el harness decide y ejecuta | Cubierto |
| §01 El agent loop | Loop de 5 etapas + 12 micro-pasos + ReAct | Cubierto |
| §02 Permission gate | allow / ask / hitl / deny; el permiso vive en código | Cubierto |
| §03 Provider interface | Toggle Anthropic / OpenAI / Responses; formas de `tool_use` y `function calling` | Cubierto |
| §04 UI polish | Traza, tarjetas, badges, progreso, responsive | Cubierto |
| §05 Slash commands | Lab ④: mini REPL con dispatcher y comandos que mutan estado | **Agregado** |
| §06 Conversation state | Escenario “Segundo turno”: historial stateless y caché | Cubierto |
| §07 Compaction strategies | Escenario de compactación + Lab ② con NoCompaction / SlidingWindow / Summarize y SafeSplitPoint | **Mejorado** |
| §08 Better input | No aplica al simulador web; sí aplica la idea de TUI | Fuera de alcance |
| §09 Plug-and-play tools | Lab ③: registry, `Definitions()` vs `Execute()`, alta de tool y caché | **Agregado** |
| §10 Project structure | Lab ⑦: Provider / Tool / Compaction / Memory / Command con interfaz y una línea de composición | **Mejorado** |
| §11 Subagents | Escenario de subagente con context firewall | Cubierto |
| §12 Full TUI | La TUI aparece como concepto; no se simula el estado completo | Parcial |
| §13 What's next | Roadmap del repo | Cubierto como doc |
| §14 MCP | Escenario MCP: JSON-RPC, namespacing y trust boundary | Cubierto |
| §15 AGENTS.md | Lab ⑥: editar, recargar, ver el system armado y la invalidación de caché | **Agregado** |
| §16 Token viewer | Tokens, caché, costo, latencia y resumen por llamada | Cubierto |
| §17 Prompt caching | Breakpoint, read/write, TTL y deltas de caché | Cubierto |
| §18 Diff approval | Lab ①: diff exacto, aprobar/denegar y `tool_result` de error | **Agregado** |
| §19 Agent memory | Lab ⑤: sesión 1 guarda, sesión 2 compara `Preamble` / `Recall` / sin memoria | **Agregado** |
| Ejercicios | Lab ⑧: 5 desafíos con criterio, pista y progreso local | **Agregado** |

## Mejoras implementadas

### Lab ① — Diff approval

- El modelo manda `tool_use` con `old_string` / `new_string`.
- El harness calcula el diff y lo muestra antes de escribir.
- Aprobar produce un `tool_result` con el hunk aplicado.
- Denegar produce `is_error: true` y `content: "user denied this tool call"`.
- El modelo nunca ve el diff ni escribe el archivo por su cuenta.

**Concepto que fija:** el `y/n` tiene sentido cuando ves el cambio exacto; sin diff solo aprobás una intención.

### Lab ② — Compaction strategies

- `NoCompaction`: conserva todo; puede romper la ventana.
- `SlidingWindow`: conserva una cola por presupuesto; pierde el principio.
- `Summarize`: reemplaza lo viejo por un resumen; paga una llamada y pierde detalle literal.
- `SafeSplitPoint`: si el corte cae en un `tool_result`, lo mueve hacia atrás para incluir su `tool_use`.
- Sin SafeSplitPoint se muestra el error de request inválido: un `tool_result` huérfano no se puede enviar.

**Concepto que fija:** compactar es una decisión del harness, es lossy y cambia el prefijo de caché.

### Lab ③ — Tool registry

- Un solo registry contiene `definition()` y `execute()`.
- Activar/desactivar tools cambia `Definitions()` y los tokens del schema.
- Agregar `web_fetch` muestra el patrón “una tool nueva = un archivo + una entrada”.
- Ordenar las definiciones estabiliza el prefijo cacheado.
- Probar una tool deshabilitada devuelve `UnknownToolError`; el loop no la ejecuta.

**Concepto que fija:** schema y ejecución son dos mitades de la misma unidad; el modelo solo ve la definición.

### Lab ④ — Slash commands

- `/help`, `/model`, `/tools`, `/tokens`, `/compact`, `/clear`.
- Las líneas que empiezan con `/` se interceptan antes de armar el request.
- Un comando desconocido responde sin gastar tokens.
- Un mensaje normal se marcaría para enviarse al modelo.

**Concepto que fija:** el harness tiene una capa de comandos propia; no todo lo que escribe el usuario es prompt.

### Lab ⑤ — Memoria entre sesiones

- Sesión 1 guarda una preferencia en `.harness/memory.md`.
- Sesión 2 compara tres modos: sin memoria, `Preamble` (inyecta siempre) y `Recall` (tool bajo demanda).
- Muestra el costo en tokens de cada modo y trata la memoria como dato no confiable.

**Concepto que fija:** memoria no es contexto; el harness decide qué se inyecta y cuándo.

### Lab ⑥ — AGENTS.md

- Editor con el contenido del archivo y botones para recargar, quitar y resetear.
- Vista del system armado: base + `AGENTS.md` + skills + memoria.
- Al recargar, el prefijo cambia y la caché se invalida.

**Concepto que fija:** `AGENTS.md` es contexto de proyecto escrito por humanos; el modelo no lo edita.

### Lab ⑦ — Puntos de extensión

- Provider, Tool, Compaction, Memory y Command.
- Cada tarjeta muestra interfaz, archivo, implementación y una línea de composición.
- Separa las costuras aditivas (tools) de las excluyentes (provider, compaction, memory).

**Concepto que fija:** extender el harness es implementar una interfaz, no tocar el loop.

### Lab ⑧ — Desafíos

- Cinco ejercicios: agregar una tool, `SafeSplitPoint`, `AGENTS.md`, memoria y cancelación.
- Cada uno tiene criterio de aceptación y pista; el progreso se guarda en `localStorage`.
- No hay auto-grading: el valor está en probar y decidir.

**Concepto que fija:** las ideas se entienden cuando se implementan y se comparan.

### Labs ⑨ y ⑩ — Tool result real y streaming cancel

- ⑨ permite pegar un output y comparar truncado `head`, `tail` y `head+tail`, con tokens antes/después.
- ⑩ simula un stream, lo cancela a mitad y muestra eventos, costo parcial y riesgo de `tool_use` incompleto.

**Concepto que fija:** truncar no es compactar; cancelar ahorra decode, no input ni TTFT.

## Otras fuentes

La lista completa de documentación, papers y repositorios que informaron el simulador está al final del [`README.md`](../README.md#referencias-y-fuentes-de-inspiración). BYO Harness es una de las referencias, no la única.

## Pendientes

1. **Página de “cómo extender”**: un ejemplo mínimo por costura, fuera del modal.
2. **TUI state machine**: `idle → running → awaiting_approval` en el escenario de permisos.
3. **Tests de humo dentro del repo** para escenarios, labs y mobile.
