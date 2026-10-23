# Simulador del Harness

El proyecto está separado en archivos estáticos, sin build ni dependencias:

| Archivo | Rol |
|---|---|
| [`index.html`](index.html) | estructura y contenido de la página |
| [`css/styles.css`](css/styles.css) | estilos, layout y responsive |
| [`js/app.js`](js/app.js) | lógica de escenarios, loop, labs, sandbox y exportación |
| [`favicon.svg`](favicon.svg) | ícono del sitio |

Abrí `index.html` directamente en el navegador, o servilo localmente:

```bash
python3 -m http.server 8080   # http://localhost:8080/
```

## Qué muestra

El recorrido completo de un turno de agente:

```text
usuario → harness (prompt + tools + historial) → proveedor
        → modelo (prefill → decode → tool_use)
        → harness (valida → permisos → ejecuta tool)
        → tool_result al historial → siguiente iteración
        → end_turn
```

La idea central: **el modelo propone, el harness decide y ejecuta**. El modelo es stateless; la sesión, los permisos, el contexto y las tools son del harness.

El entorno que aparece en el system prompt de ejemplo usa placeholders (`<sistema>`, `<raíz-del-proyecto>`, `<rama>`) en vez de datos de la máquina de quien abre el simulador.

## El loop interactivo (5 etapas)

Arriba de la traza hay un diagrama animado con las cinco etapas:

| Etapa | Quién actúa | Qué pasa |
|---|---|---|
| **Perceive** | harness + modelo | entra el input (prompt, respuesta o error); el harness lo normaliza y lo agrega al historial |
| **Reason** | modelo | el LLM procesa el contexto y decide: texto, `tool_use` o respuesta final |
| **Plan** | modelo | si el objetivo es complejo, lo parte en subtareas; en tareas simples se saltea |
| **Act** | harness | valida args, evalúa permisos y ejecuta la tool (o entrega la respuesta) |
| **Observe** | harness → modelo | vuelve el `tool_result`; el agente evalúa si funcionó y ajusta el plan |

Podés reproducir la animación, avanzar etapa por etapa, hacer clic en cada nodo o activar **tarea simple** para saltear `Plan` y ver el ciclo `Reason → Act → Observe`. El texto de la derecha cambia con la etapa: quién actúa, qué artefacto produce y cuál es el error común.

Debajo del diagrama hay un **visor de request / response** para cada etapa, con ejemplos del contrato mínimo:

- **REQUEST**: lo que entra al harness o lo que se envía al proveedor / a la tool.
- **RESPONSE**: lo que vuelve del modelo o de la tool.
- Un toggle **Anthropic / OpenAI** muestra la misma idea en dos formas: `tool_use` con `input` como objeto, o `function calling` con `tool_calls` y `arguments` como string JSON.
- Los badges indican si la etapa usa `tool_use`, `function calling`, `tool_result` o si es solo texto/plan.

En **Act** el par ya no es una llamada al LLM: es `harness → tool` y `tool → harness`. En **Observe** el request siguiente incluye el `tool_result` y el response es la decisión final o un nuevo `tool_use`.

> Para tareas simples, el ciclo real es **Reason → Act → Observe**. `Perceive` ocurre al inicio del turno o cuando llega un input nuevo; `Plan` se colapsa.

## Notas emergentes para términos en inglés

La explicación está en español, pero muchos conceptos técnicos se nombran en inglés. Las palabras y frases reconocidas aparecen con un **subrayado punteado**: al pasar el mouse se despliega una nota breve con su significado. También se puede tocar en pantalla táctil; un clic fuera la cierra.

Cubre, entre otros: `sampling`, `prefill`, `decode`, `TTFT`, `TTFB`, `SSE`, `forward pass`, `embedding lookup`, `wire format`, `KV cache`, `prompt cache`, `tool_use`, `tool_result`, `function calling`, `stop_reason`, `tool_choice`, `tool_call_id`, `arguments`, `parameters`, `JSON Schema`, `structured outputs`, `MCP`, `JSON-RPC`, `HITL`, `TUI`, `stateful/stateless`, `sandbox`, `backoff`, `idempotencia`, `context firewall` y `agentic loop`.

La decoración se aplica también al contenido dinámico (pasos, loop, Pydantic, sandbox y modales), pero no dentro de bloques `<pre>` ni de controles, para no romper el código ni la interacción. La primera aparición de cada término por bloque se subraya para no saturar la lectura.

## 🐍 Pydantic y contratos del loop

Debajo del diagrama hay un taller interactivo con ocho pestañas y ejemplos en Python 3.10+ / Pydantic 2. Antes de las pestañas, un bloque **Contratos, schemas y validación** explica:

- qué es un contrato y por qué tiene dos piezas (schema declarado + datos emitidos);
- para qué sirve validar antes de ejecutar y cómo se devuelven errores accionables;
- qué cambia según el proveedor (`input_schema`/`parameters`, `input`/`arguments`, `strict`, structured outputs) y que no todos aplican el schema con la misma fuerza (decoding restringido vs. guía);
- que podés crear tus propios contratos con Pydantic y exportarlos con `model_json_schema()`;
- la diferencia entre **forma** (lo que valida un schema) y **verdad/seguridad** (lo que validan tests, permisos y sandbox).

La secuencia didáctica es: **declarás → validás → ejecutás**. Un JSON perfecto puede seguir siendo una alucinación o una inyección.

| Pestaña | Qué muestra |
|---|---|
| `tool_use` / function calling | cómo se declara una tool con `model_json_schema()` y cómo se valida la propuesta del modelo antes de ejecutarla |
| `tool_result` | cómo se modela la Observation, el flag `is_error` y su forma en Anthropic y OpenAI |
| `stop_reason` | la señal que decide si el loop continúa (`tool_use`) o termina (`end_turn`), incluyendo el peligro de `max_tokens` |
| `tool_choice` | política de emisión de tools modelada con `Literal` y uniones discriminadas |
| `tool_call_id` | correlación entre llamada y resultado; por qué nunca se empareja por orden |
| `arguments` / `parameters` | diferencia entre el JSON Schema declarado y los datos que emite el modelo |
| parallel tool calling | ejecución concurrente con `asyncio.gather`, preservando ids y resultados |
| structured outputs | salida con `response_format`/`json_schema` o tool anclada, y validación final con Pydantic |

La idea central: **el schema describe, Pydantic valida, el harness decide**. Un `arguments` sintácticamente válido puede seguir siendo inválido para el modelo Pydantic; y un JSON válido puede ser falso. La validación no reemplaza los tests ni los permisos.

## 🧩 Labs de harness

El botón **🧩 Labs** abre diez laboratorios independientes de la corrida. Sirven para ver de cerca decisiones que un harness real toma todo el tiempo:

| Lab | Qué muestra | Concepto que fija |
|---|---|---|
| **① Diff approval** | `tool_use` con `old_string`/`new_string`, diff exacto y botones Aprobar/Denegar | Sin diff solo aprobás una intención; el harness decide y ejecuta |
| **② Compactación** | `NoCompaction`, `SlidingWindow` y `Summarize`, con presupuesto y `SafeSplitPoint` | Compactar es lossy, cambia el prefijo de caché y no puede separar `tool_use` de `tool_result` |
| **③ Tool registry** | Activar/desactivar tools, agregar `web_fetch`, ordenar `Definitions()` y probar una tool ausente | El registry une schema (`definition()`) y ejecución (`execute()`) |
| **④ Slash commands** | Mini REPL con `/help`, `/model`, `/tools`, `/tokens`, `/compact`, `/clear` | Lo que empieza con `/` lo intercepta el harness; no llega al modelo |
| **⑤ Memoria** | Sesión 1 que guarda una preferencia y sesión 2 con `Preamble`, `Recall` o sin memoria | La memoria persiste fuera de la ventana y se paga distinto según cómo se inyecte |
| **⑥ AGENTS.md** | Editar el archivo, recargarlo y ver el system armado, los tokens y la invalidación de caché | `AGENTS.md` es contexto de proyecto escrito por humanos, no memoria del agente |
| **⑦ Puntos de extensión** | Provider / Tool / Compaction / Memory / Command con interfaz, implementación y una línea de composición | El loop no debería conocer las implementaciones concretas |
| **⑧ Desafíos** | Cinco ejercicios con criterio de aceptación, pista y progreso local | Extender el harness sin reescribir el loop |
| **⑨ Tool result real** | Pegar un output, elegir `head`, `tail` o `head+tail` y medir tokens antes/después | Truncar un `tool_result` no es lo mismo que compactar el historial |
| **⑩ Streaming cancel** | Cortar un stream a mitad, ver eventos, costo parcial y qué pasa con un `tool_use` incompleto | Cancelar ahorra decode, pero no devuelve input ni TTFT |

Cada lab tiene contrato, estado visible, acción y resultado. No modifican la simulación principal; el progreso de los desafíos se guarda en `localStorage`.

## Ruta de aprendizaje (13 paradas)

| # | Escenario | Qué enseña |
|---|---|---|
| 1 | Pregunta simple | system, roles, tools, `max_tokens`, una sola llamada |
| 2 | Edición de archivo | `tool_use` → permiso → ejecución → `tool_result` → respuesta |
| 3 | Anatomía del loop | los 12 micro-pasos de una iteración, ReAct al detalle |
| 4 | Tool use / function calling | schema, validación, `strict`, self-healing, JSON mode |
| 5 | Parallel tool calling | dependencias, latencia, orden por `tool_use_id` |
| 6 | Streaming SSE | `message_start`, deltas, `input_json_delta`, TTFB y usage parcial |
| 7 | Errores y reintentos | 429, excepción del tool, JSON inválido: quién maneja qué |
| 8 | Contexto lleno | ventana, truncado, compactación y caché invalidada |
| 9 | Subagente | sesión hija, contexto fresco, context firewall |
| 10 | Guard | `max_iterations`, señales de no convergencia, costo |
| 11 | MCP | JSON-RPC, descubrimiento, namespacing y confianza |
| 12 | Prompt injection | dato vs instrucción, permisos, sandbox, defensa en capas |
| 13 | Segundo turno | reenvío stateless, caché, sesión y "memoria" |

El panel **Ruta de aprendizaje** abre cada escenario con un clic y marca con ✓ los que ya recorriste (se guarda en `localStorage`). Al cambiar de parada, la simulación se reinicia y **abre directo la tarjeta de entrada del escenario** (`🎯 Escenario: …`), no la visión general compartida. Esa tarjeta separa explícitamente el contexto común (visión general, sesión y armado del prompt) del contenido propio, y debajo ya aparece el primer paso real del escenario. La página baja hasta la tarjeta de entrada y muestra un toast con el nombre de la ruta; no hay diálogo de confirmación que pueda dejar la navegación a medias.

El botón **▶ Iniciar simulación** y el botón del estado vacío usan el mismo arranque por escenario, sin confirmación nativa de por medio: si había una corrida anterior, se reinicia y se abre la entrada nueva. Si querés volver a la visión general, subí o elegí el paso 0 en el selector de pasos.

## Herramientas de laboratorio

### 🧪 Sandbox de payload

Abre el JSON real de la última llamada y permite editarlo. La columna derecha calcula en vivo:

- tokens estimados del payload: system, tools, mensajes y total;
- porcentaje de la ventana y si entra con la salida reservada;
- validez estructural: `model`, `max_tokens`, roles, ids de `tool_use`/`tool_result`;
- validación de argumentos contra el JSON Schema de cada tool;
- tools desconocidas, `strict`, breakpoints de `cache_control` y sus límites.

Los botones de fallas (**falta un required**, **tool desconocida**, **quitar `cache_control`**, **inyectar en `tool_result`**) sirven para ver qué atrapa el harness y qué no. Cada uno modifica el payload actual y muestra una explicación de la acción en el panel de resultados. Si falta el artefacto necesario (`tool_use` o `tool_result`), el botón se deshabilita y aparece **“+ tool_use de ejemplo”** para insertar un par válido y poder seguir experimentando. El sandbox no altera la corrida.

La inyección es el caso interesante: el JSON sigue siendo estructuralmente válido, pero el contenido del `tool_result` intenta convertirse en instrucción. Ese riesgo es semántico, no de schema; por eso el harness debe tratar el output como dato no confiable y aplicar permisos antes de ejecutar cualquier acción.

### ⚖️ Comparador de configuraciones

Compara dos configuraciones (A/B) sobre las llamadas ya reveladas:

- caché on/off;
- `strict` on/off (incluye la llamada de reparación estimada cuando hay fallos de schema);
- extended thinking on/off;
- modelo y precios.

Muestra input, cache read/write, output, costo, latencia y reparaciones, con el delta entre A y B.

### 📤 Exportar

Disponible en cualquier momento, no solo al final:

- **Markdown**: configuración, tabla de llamadas, conceptos vistos, pasos y preguntas para clase;
- **Markdown completo**: agrega el payload de cada paso;
- **JSON**: configuración, totales, llamadas, descartes, pasos, conceptos, quizzes y payloads;
- **CSV**: una fila por llamada, para planilla;
- **cURL**: el request de la última llamada.

## Cómo leer una tarjeta

- **Badge**: quién actúa — `harness`, `model`, `tool`, `perm`, `ctx`, `user`, `mcp`, `sec`.
- **💡 Concepto clave**: definición, por qué importa y error común.
- **🤔 Quiz**: se activa con *predecí el paso*; pregunta antes de revelar el payload.
- **📦 Payload**: el JSON que cruza la red, con system, mensajes, tools, `tool_choice` y caché.
- **⧉**: copia la tarjeta como texto.
- **Panel derecho**: composición de la ventana, bloques descartados y estado de la caché.
- **Navegación**: `←` `→`, Espacio, Home/End, selector de paso y barra de progreso.
- **Resumen final**: tabla de llamadas, tokens, caché, costo, latencia y exportación.

## Conceptos cubiertos

Agente, turno, sesión, rol, stateless/stateful, system prompt, jerarquía de instrucciones, AGENTS.md, tools fuera del prompt, JSON Schema, Pydantic, validación de argumentos, `tool_use`/`tool_result`, `tool_choice`, `tool_call_id`, `stop_reason`, ReAct (Thought/Action/Observation), permisos en código, HITL, allow/ask/deny, truncado, compactación, estrategias de compactación, SafeSplitPoint, context rot, caché de prompt (read/write/TTL/breakpoint), prefill/decode/TTFT, streaming SSE, `message_start`/`message_delta`, `input_json_delta`, usage parcial, extended thinking, JSON mode, structured outputs, máscara de logits, MCP, JSON-RPC, namespacing, trust boundary, prompt injection, tool poisoning, sandbox, least privilege, subagentes, context firewall, parallel tool calling, tool registry, slash commands, diff approval, backoff/jitter, idempotencia, guard, evals, memoria vs contexto.

El **glosario** del panel izquierdo tiene 58 términos con buscador.

## Qué es simulado y qué es fiel

- Los **tokens** son estimaciones (~4 caracteres/token) para que los números sean estables y comparables.
- Los **precios, latencias y caché** son modelos simplificados, no una factura real.
- La **forma del payload** sigue las APIs reales: Anthropic Messages (`system`, `content[]`, `tool_use`/`tool_result`, `input_schema`) y estilo Responses (`instructions`, `input`, `previous_response_id`, tools planas).
- Las tools MCP se declaran con su nombre namespaced (`mcp__github__create_issue`) y su schema, como en un payload real.
- El **streaming** muestra los eventos SSE con la forma de Anthropic (`message_start`, `content_block_delta`, `input_json_delta`, `message_delta`, `message_stop`); OpenAI usa `data: {"choices":[{"delta":…}]}` y `[DONE]`.
- Los **nombres de modelo** y endpoints son ilustrativos.
- El comportamiento del harness (permisos, truncado, compactación, subagentes, MCP) refleja decisiones de diseño visibles en OpenCode, Claude Code, Aider y BYO Harness, no una ejecución real.

## Licencia

GPLv3. Ver [`LICENSE`](LICENSE).

## Referencias y fuentes de inspiración

Estas fuentes informaron el diseño del simulador. No implican endorsement ni copia de contenido: el código es una reconstrucción didáctica y simplificada. BYO Harness es una referencia entre varias.

### Cursos y proyectos de harness

- [BYO Harness — currículum](https://www.byoharness.dev/es/#curriculum) y [repositorio `betta-tech/byo-coding-agent`](https://github.com/betta-tech/byo-coding-agent) (MIT): una de las inspiraciones principales para los labs y el mapa curricular.
- [OpenCode — documentación](https://opencode.ai/docs/) y [repositorio](https://github.com/anomalyco/opencode): loop, tools, permisos, agentes, comandos y configuración.
- [Claude Code — documentación](https://docs.anthropic.com/en/docs/claude-code/overview): permisos, `AGENTS.md`, skills, subagentes y flujo de trabajo.
- [Aider](https://github.com/Aider-AI/aider): edición de código, diffs y aprobación de cambios.
- [Anthropic Academy — Building with the Claude API](https://anthropic.skilljar.com/claude-with-the-anthropic-api): curso de tool use, streaming y prompt caching.

### APIs, protocolos y contratos

- [Anthropic — Messages API](https://docs.anthropic.com/en/api/messages)
- [Anthropic — Tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)
- [Anthropic — Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Anthropic — Streaming messages](https://docs.anthropic.com/en/docs/build-with-claude/streaming)
- [OpenAI — Function calling](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI — Responses vs. Chat Completions](https://platform.openai.com/docs/guides/responses-vs-chat-completions)
- [OpenAI — Structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Model Context Protocol — Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [JSON Schema — Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
- [MDN — Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

### Ingeniería de agentes y contexto

- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic — Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic — Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [12-Factor Agents](https://github.com/humanlayer/12-factor-agents)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)
- [LangGraph](https://github.com/langchain-ai/langgraph)
- [Pydantic AI](https://ai.pydantic.dev/)

### Papers y estudios

- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot)

### Validación y modelos de datos

- [Pydantic — Models](https://docs.pydantic.dev/latest/concepts/models/)
- [Pydantic — JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/)
