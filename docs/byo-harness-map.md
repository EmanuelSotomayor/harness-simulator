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
| §10 Project structure | Documento de arquitectura y puntos de extensión | Parcial |
| §11 Subagents | Escenario de subagente con context firewall | Cubierto |
| §12 Full TUI | La TUI aparece como concepto; no se simula el estado completo | Parcial |
| §13 What's next | Roadmap del repo | Cubierto como doc |
| §14 MCP | Escenario MCP: JSON-RPC, namespacing y trust boundary | Cubierto |
| §15 AGENTS.md | Aparece en el system prompt y el glosario; falta un lab de carga/recarga | Parcial |
| §16 Token viewer | Tokens, caché, costo, latencia y resumen por llamada | Cubierto |
| §17 Prompt caching | Breakpoint, read/write, TTL y deltas de caché | Cubierto |
| §18 Diff approval | Lab ①: diff exacto, aprobar/denegar y `tool_result` de error | **Agregado** |
| §19 Agent memory | “Memoria vs contexto” y segundo turno; falta memoria persistente | Parcial |
| Ejercicios | No hay ejercicios con criterios de aceptación | Pendiente |

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

## Próximos pasos sugeridos

1. **Memoria entre sesiones**: `AGENTS.md` (humano) + `Preamble` (memoria del agente) + `Recall`/`Save`; mostrar qué se inyecta y qué no.
2. **Lab de `AGENTS.md`**: editar el archivo, recargar y ver el cambio de prefijo/caché.
3. **Mapa de puntos de extensión**: Provider / Tool / Compaction / Memory / Command con el patrón “interfaz + implementación + una línea”.
4. **Desafíos**: 3–5 ejercicios con criterios de aceptación, sin auto-grading.
5. **TUI state machine**: `idle → running → awaiting_approval` en el escenario de permisos.
