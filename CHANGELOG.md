# Changelog

Registro de cambios del simulador. La aplicación no muestra avisos de qué se agregó o corrigió: todo eso vive acá.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto no usa números de versión: cada entrada lleva la fecha en que se publicó.

## 2026-11-12

### Agregado

- **Tres hilos conductores** en la columna central, como pestañas enlazadas: ① *El loop, request por request*, ② *Contratos con Pydantic* y ③ *Escenarios simulados*. La pestaña elegida se recuerda en `localStorage`.
- **Recorrido ① “El loop, request por request”** (`js/loop-walkthrough.js`): sigue un mensaje paso a paso y muestra en cada paso el diagrama del loop, el estado de `messages[]`, el request o la response completos, el contrato de Pydantic que valida esa frontera y la línea de `agent.py` que se ejecuta.
  - Formato Anthropic y OpenAI.
  - Variante con argumentos inválidos: `ValidationError` → `tool_result` con `is_error` → el modelo corrige.
  - Chip de etapa que abre el diagrama de 5 etapas.
  - Desplegable con el diagrama completo, una tabla de equivalencias entre las vistas del simulador (diagrama, código, 5 etapas, ReAct, micro-pasos y contrato) y el pseudocódigo del loop.
- **Paso “agregar la respuesta del assistant a messages”** dentro del recorrido: el diagrama de flujo de referencia pasaba directo de *llamar al modelo* a *¿hay tool_use?*, sin el `append` del mensaje del assistant que el `tool_result` necesita para referenciarse por id.
- **Pseudocódigo del loop visible**: la constante `AGENTIC_LOOP` existía en `app.js` pero no se mostraba en ningún lado.
- **Links cruzados entre hilos**:
  - cada paso de ① enlaza al contrato de ②;
  - cada pestaña de ② indica “Dónde aparece en el loop”;
  - la tarjeta de entrada de cada escenario trae links “Para profundizar” al paso de ①, al contrato de ② y al lab relacionado.
- **README**: link al sitio en vivo y sección de deploy.
- Este `CHANGELOG.md`.
- Hosting en GitHub Pages con dominio propio `harness-simulator.dev` (archivos `CNAME` y `.nojekyll`).

### Cambiado

- Las pestañas de Pydantic siguen el orden del loop y están numeradas: parameters → tool_choice → tool_use → stop_reason → tool_result → tool_call_id → parallel → structured outputs.
- El `<select>` de escenarios usa el mismo orden y numeración que la Ruta de aprendizaje.
- La configuración del panel izquierdo está agrupada (qué simular, reglas del harness, modelo/ventana/caché, cómo leer la traza) e indica a qué escenarios aplica cada opción.
- El diagrama de 5 etapas pasó a ① como “Vista conceptual”.
- La ventana de contexto y los descartes solo se muestran en ③.
- En pantallas angostas la columna central aparece antes que la configuración.
- El teclado (`←` `→`, Espacio, Home/End) actúa sobre la pestaña activa.
- Los términos en inglés ya no se subrayan dentro de botones ni links.
- El README sigue el orden de los tres hilos.
- El sitio se publica en GitHub Pages en lugar de Netlify; el README documenta el DNS y el deploy.
- El recorrido presenta el paso del assistant como contenido, sin marcas de “faltaba” ni comparación con el diagrama original.

### Eliminado

- La integración de Netlify con el repositorio: el sitio quedó desvinculado y ya no se despliega con cada push a `main`.
- El archivo `netlify.toml`, que ya no cumplía ninguna función con GitHub Pages.

### Corregido

- Tarjeta “ITERACIÓN 2 · pasos 8-10” del escenario *Anatomía del loop*: recibía una frase como `badge`, sin color ni estilo válidos.
- Textos rotos en la traza: el paso de sampling del pipeline del modelo, el reintento con self-healing, “según prove” y “segundos 3-4 del mapeo ReAct”.
- Referencias a números de escenario que no coincidían con la Ruta (“escenario 5”, “escenario 6”).
- Afirmaciones sobre el orden de los `tool_result` en parallel tool calling: la API los empareja por id; lo que rechaza es un id faltante, duplicado o huérfano. Se ajustaron el texto de la traza, el concepto clave y el quiz.
- Títulos y etiquetas que se partían en contenedores flex cuando un término subrayado quedaba como ítem aparte.
- README: la vuelta a la visión general (primera opción del selector o Home, no “paso 0”) y “emparejamiento por `tool_use_id`” en el escenario 5.

## 2026-10-23

### Agregado

- Seis labs de harness y fuentes de referencia.
- Referencia a la licencia GPLv3.
- Configuración de Netlify.

### Cambiado

- HTML, CSS y JS separados en archivos estáticos.
- README simplificado.

### Corregido

- La simulación arranca desde el primer paso.
- El botón Reiniciar está conectado y limpia el estado.
- El botón Resumen muestra el resumen y desplaza hasta él.
- El título de la app es “Simulador del Harness”.

## 2026-10-22

### Agregado

- Simulador didáctico del harness con labs basados en BYO Harness.
- Enlace al currículum de BYO Harness desde los labs.
