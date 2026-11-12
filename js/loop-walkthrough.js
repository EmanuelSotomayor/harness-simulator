/* Recorrido "El loop, request por request"
   Sigue el array messages a través del agentic loop: qué se agrega en cada
   paso, qué viaja en cada request, qué vuelve en cada response y qué contrato
   de Pydantic valida cada frontera. Depende de app.js ($, esc, est, scheduleDecorate,
   PYD_TABS, pydSelect, showMainTab, loopRenderStage, AGENTIC_LOOP). */

const WT_SYSTEM = 'Sos un agente de código. Usá las tools para leer y editar.';
const WT_USER = 'Buscá el bug en parser.py y arreglalo';
const WT_USER2 = '¿Por qué fallaba con dict anidado?';
const WT_OUTPUT = "92 | def parse(j):\n93 |   return eval(j['x'])   ← bug: asume dict plano";
const WT_FINAL = 'El bug está en parser.py:93: eval asume un dict plano y explota con JSON anidado.';
// salida real de ReadArgs.model_json_schema() con Pydantic 2
const WT_READ_SCHEMA = {
  properties:{ path:{ description:'Ruta relativa del archivo', title:'Path', type:'string' } },
  required:['path'], title:'ReadArgs', type:'object'
};
const WT_STAGE_NAMES = ['Perceive','Reason','Plan','Act','Observe'];

/* Nodos del diagrama. "asst" es el paso que suele faltar en el diagrama clásico. */
const WT_NODES = {
  input:   {label:'tu entrada', sub:'input("> ")'},
  user:    {label:'agregar a messages', sub:'role: "user"'},
  call:    {label:'llamar al modelo', sub:'request → response'},
  asst:    {label:'agregar la respuesta', sub:'role: "assistant"', added:true},
  check:   {label:'¿hay tool_use?', sub:'stop_reason'},
  exec:    {label:'validar y ejecutar cada herramienta', sub:'Pydantic → permisos → tool'},
  results: {label:'agregar tool_results', sub:'role: "user" · role: "tool"'},
  print:   {label:'imprimir texto, volver al REPL', sub:'break'}
};

/* agent.py mínimo. Cada línea lleva una clave: el paso activo resalta las suyas. */
const WT_CODE = {
  anthropic: [
    [null,'from typing import Literal'],
    [null,'from anthropic import Anthropic'],
    [null,'from pydantic import BaseModel, Field, ValidationError'],
    [null,''],
    [null,'client = Anthropic()'],
    [null,'SYSTEM = "Sos un agente de código. Usá las tools para leer y editar."'],
    [null,''],
    ['schema','class ReadArgs(BaseModel):                     # contrato de los argumentos'],
    ['schema','    path: str = Field(description="Ruta relativa del archivo")'],
    [null,''],
    ['result','class ToolResult(BaseModel):                   # contrato de la Observation'],
    ['result','    type: Literal["tool_result"] = "tool_result"'],
    ['result','    tool_use_id: str'],
    ['result','    content: str'],
    ['result','    is_error: bool = False'],
    [null,''],
    ['schema','TOOLS = [{"name": "read", "description": "Lee un archivo del proyecto.",'],
    ['schema','          "input_schema": ReadArgs.model_json_schema()}]'],
    ['exec','RUNNERS = {"read": lambda a: open(a.path).read()}'],
    ['validate','ARGS = {"read": ReadArgs}'],
    [null,''],
    ['init','messages = []                                   # el historial vive en el harness'],
    [null,''],
    ['repl','while True:                                     # REPL: un turno por entrada'],
    ['input','    user_text = input("> ")                      # [tu entrada]'],
    ['appendUser','    messages.append({"role": "user", "content": user_text})'],
    [null,''],
    ['loop','    while True:                                 # agentic loop'],
    ['call','        resp = client.messages.create(          # [llamar al modelo]'],
    ['call','            model="claude-sonnet-4-5", max_tokens=1024,'],
    ['call','            system=SYSTEM, tools=TOOLS, messages=messages)'],
    ['appendAsst','        messages.append({"role": "assistant", "content": resp.content})'],
    [null,''],
    ['check','        if resp.stop_reason != "tool_use":      # [¿hay tool_use?]'],
    ['print','            print("".join(b.text for b in resp.content if b.type == "text"))'],
    ['print','            break                               # → volver al REPL'],
    [null,''],
    ['results','        results = []'],
    ['exec','        for block in resp.content:              # [ejecutar cada herramienta]'],
    ['exec','            if block.type != "tool_use":'],
    ['exec','                continue'],
    ['validate','            try:'],
    ['validate','                args = ARGS[block.name].model_validate(block.input)'],
    ['perm','                check_permission(block.name, args)   # allow / ask / deny'],
    ['exec','                output, is_error = RUNNERS[block.name](args), False'],
    ['invalid','            except ValidationError as exc:'],
    ['invalid','                output, is_error = exc.json(include_url=False), True'],
    ['perm','            except PermissionError as exc:'],
    ['perm','                output, is_error = f"DENIED: {exc}", True'],
    ['result','            results.append(ToolResult(tool_use_id=block.id, content=output,'],
    ['result','                                      is_error=is_error).model_dump())'],
    ['appendResults','        messages.append({"role": "user", "content": results})   # [agregar tool_results]'],
    ['back','        # ↩ vuelve a [llamar al modelo] con TODO messages']
  ],
  openai: [
    [null,'from typing import Literal'],
    [null,'from openai import OpenAI'],
    [null,'from pydantic import BaseModel, Field, ValidationError'],
    [null,''],
    [null,'client = OpenAI()          # o una API compatible: OpenAI(base_url=...)'],
    [null,'SYSTEM = "Sos un agente de código. Usá las tools para leer y editar."'],
    [null,''],
    ['schema','class ReadArgs(BaseModel):                     # contrato de los argumentos'],
    ['schema','    path: str = Field(description="Ruta relativa del archivo")'],
    [null,''],
    ['result','class ToolMessage(BaseModel):                  # contrato de la Observation'],
    ['result','    role: Literal["tool"] = "tool"'],
    ['result','    tool_call_id: str'],
    ['result','    content: str                               # no hay is_error: el error va en el texto'],
    [null,''],
    ['schema','TOOLS = [{"type": "function", "function": {'],
    ['schema','    "name": "read", "description": "Lee un archivo del proyecto.",'],
    ['schema','    "parameters": ReadArgs.model_json_schema()}}]'],
    ['exec','RUNNERS = {"read": lambda a: open(a.path).read()}'],
    ['validate','ARGS = {"read": ReadArgs}'],
    [null,''],
    ['init','messages = [{"role": "system", "content": SYSTEM}]   # en OpenAI el system va DENTRO'],
    [null,''],
    ['repl','while True:                                     # REPL: un turno por entrada'],
    ['input','    user_text = input("> ")                      # [tu entrada]'],
    ['appendUser','    messages.append({"role": "user", "content": user_text})'],
    [null,''],
    ['loop','    while True:                                 # agentic loop'],
    ['call','        resp = client.chat.completions.create(  # [llamar al modelo]'],
    ['call','            model="gpt-4.1", tools=TOOLS, messages=messages)'],
    ['call','        msg = resp.choices[0].message            # ChatCompletionMessage (Pydantic)'],
    ['appendAsst','        messages.append(msg.model_dump(exclude_none=True))'],
    [null,''],
    ['check','        if resp.choices[0].finish_reason != "tool_calls":   # [¿hay tool_use?]'],
    ['print','            print(msg.content)'],
    ['print','            break                               # → volver al REPL'],
    [null,''],
    ['exec','        for call in msg.tool_calls:             # [ejecutar cada herramienta]'],
    ['validate','            try:'],
    ['validate','                args = ARGS[call.function.name].model_validate_json('],
    ['validate','                    call.function.arguments)     # arguments es un STRING JSON'],
    ['perm','                check_permission(call.function.name, args)'],
    ['exec','                output = RUNNERS[call.function.name](args)'],
    ['invalid','            except ValidationError as exc:'],
    ['invalid','                output = exc.json(include_url=False)'],
    ['perm','            except PermissionError as exc:'],
    ['perm','                output = f"DENIED: {exc}"'],
    ['result','            tool_msg = ToolMessage(tool_call_id=call.id, content=output)'],
    ['appendResults','            messages.append(tool_msg.model_dump())   # [agregar tool_results]'],
    ['back','        # ↩ vuelve a [llamar al modelo] con TODO messages']
  ]
};

/* ---------- contratos (snippets cortos de Pydantic por paso) ---------- */
const WT_CONTRACTS = {
  input: {title:'Validar la entrada antes de agregarla', pyd:null, code:
`from typing import Literal
from pydantic import BaseModel, Field

class UserMessage(BaseModel):
    role: Literal["user"] = "user"
    content: str = Field(min_length=1)   # una línea vacía no se manda

UserMessage(content="")   # ValidationError: el harness no gasta un request`},
  user: {title:'El mensaje del usuario como modelo', pyd:null, code:
`msg = UserMessage(content=user_text)
messages.append(msg.model_dump())
# {"role": "user", "content": "Buscá el bug en parser.py y arreglalo"}

# messages es una list de Python que vive en el HARNESS.
# client.messages es otra cosa: el endpoint de la Messages API.`},
  request: {title:'El schema de la tool sale de Pydantic', pyd:'parameters', also:['tool_choice'], code:
`ReadArgs.model_json_schema()
# {
#   "properties": {"path": {"description": "Ruta relativa del archivo",
#                           "title": "Path", "type": "string"}},
#   "required": ["path"], "title": "ReadArgs", "type": "object"
# }
# Anthropic lo manda como input_schema; OpenAI como parameters.
# Sin tool_choice explícito, la política es "auto".`},
  response: {title:'La response ya llega como modelos Pydantic', pyd:'tool_use', code:
`# Los SDK de Anthropic y OpenAI modelan la response con Pydantic:
resp = client.messages.create(...)     # anthropic.types.Message
type(resp.content[1])                  # ToolUseBlock

# Forma equivalente, escrita a mano:
class TextBlock(BaseModel):
    type: Literal["text"]
    text: str

class ToolUseBlock(BaseModel):
    type: Literal["tool_use"]
    id: str
    name: str
    input: dict          # el modelo PROPONE; todavía no se validó

Block = Annotated[TextBlock | ToolUseBlock, Field(discriminator="type")]`},
  asst: {title:'Integridad referencial: el tool_use tiene que estar antes', pyd:'tool_call_id', code:
`# Regla de la API: cada tool_result referencia un tool_use
# del mensaje assistant INMEDIATAMENTE anterior.
ids_pedidos = {b.id for b in resp.content if b.type == "tool_use"}
# {"call_01"}

# Si no agregás resp.content a messages, el próximo request
# lleva un tool_result huérfano → 400 invalid_request_error.`},
  check: {title:'stop_reason es un enum cerrado', pyd:'stop_reason', code:
`StopReason = Literal["end_turn", "tool_use", "max_tokens",
                     "stop_sequence", "pause_turn", "refusal"]

class Response(BaseModel):
    stop_reason: StopReason
    content: list[Block]

# OpenAI: finish_reason ∈ {"stop", "tool_calls", "length", "content_filter"}
# max_tokens / length: la salida se cortó → no ejecutes un tool_use a medias.`},
  validate: {title:'Validar los argumentos que propuso el modelo', pyd:'tool_use', also:['parameters'], code:
`# Anthropic: input llega como OBJETO
args = ReadArgs.model_validate(block.input)

# OpenAI: arguments llega como STRING JSON
args = ReadArgs.model_validate_json(call.function.arguments)

args.path   # 'parser.py' — tipado, listo para la tool`},
  invalid: {title:'ValidationError → error accionable, no excepción', pyd:'tool_result', also:['tool_use'], code:
`try:
    ReadArgs.model_validate({"file": "parser.py"})
except ValidationError as exc:
    exc.json(include_url=False)
# [{"type":"missing","loc":["path"],"msg":"Field required",
#   "input":{"file":"parser.py"}}]

# Ese texto vuelve al modelo como tool_result con is_error=True.
# El loop NO se cae: el modelo lee el error y corrige.`},
  exec: {title:'La tool recibe un objeto tipado, no un dict', pyd:'parallel', code:
`def read(args: ReadArgs) -> str:
    return open(args.path).read()

# Si la response trae VARIOS tool_use, este for los recorre todos
# (o los lanza en paralelo con asyncio.gather): pestaña parallel.
# Ejecutar NO es llamar al LLM: corre en tu máquina, con tus permisos.`},
  result: {title:'El resultado se envuelve en un tool_result', pyd:'tool_result', code:
`result = ToolResult(tool_use_id=block.id, content=output)
result.model_dump()
# {"type": "tool_result", "tool_use_id": "call_01",
#  "content": "92 | def parse(j): ...", "is_error": False}

# OpenAI: ToolMessage(tool_call_id=call.id, content=output)
# {"role": "tool", "tool_call_id": "call_01", "content": "..."}`},
  appendResults: {title:'Un mensaje que agrupa todos los resultados', pyd:'tool_call_id', code:
`class ToolResultMessage(BaseModel):
    role: Literal["user"] = "user"
    content: list[ToolResult]        # uno por cada tool_use pedido

# Chequeo útil antes del próximo request:
assert {r.tool_use_id for r in results} == ids_pedidos`},
  resend: {title:'El request no tiene memoria: se valida entero otra vez', pyd:'tool_call_id', code:
`class Request(BaseModel):
    model: str
    max_tokens: int
    system: str
    tools: list[dict]
    messages: list[dict]   # TODO el historial, en cada llamada

# Lo único nuevo respecto del request anterior son los últimos
# mensajes; el resto es prefijo reenviado (y cacheable).`},
  final: {title:'La respuesta final: texto o structured output', pyd:'structured', code:
`texto = "".join(b.text for b in resp.content if b.type == "text")

# Si necesitás una salida con forma fija (para otro programa),
# pedila con structured outputs y validala igual:
class FixReport(BaseModel):
    file: str
    line: int
    cause: str

report = FixReport.model_validate_json(raw_output)`},
  repl: {title:'Mismo messages, turno nuevo', pyd:null, code:
`# messages NO se vacía entre turnos: sigue creciendo.
len(messages)   # 5 → el próximo request lleva todo el turno 1

# Persistirlo (archivo/DB) es lo que hace que una sesión "recuerde".
# Si el proceso termina sin guardarlo, el modelo no sabe nada.`}
};

/* ---------- construcción de los pasos ---------- */
function wtClone(o){ return JSON.parse(JSON.stringify(o)); }

function wtBuild(invalid){
  const steps = [];
  const msgs = [];
  let iter = 1, nCall = 0;
  const step = o => steps.push(Object.assign({iter, msgs:wtClone(msgs)}, o));

  step({node:'input', stage:0, contract:'input', code:['repl','input'],
    title:'Escribís tu mensaje',
    desc:fmt => `El REPL lee una línea con <code>input()</code>. Todavía no se llamó al modelo y <code>messages</code> está ${fmt==='openai'?'casi vacío: solo tiene el <code>system</code>, porque en OpenAI va dentro de messages':'vacío'}. ${fmt==='openai'?'':'En Anthropic el <code>system</code> y las <code>tools</code> <b>no</b> viven en messages: viajan como parámetros aparte del request.'}`});

  msgs.push({role:'user', text:WT_USER});
  step({node:'user', stage:0, contract:'user', code:['appendUser'], added:[0],
    title:'Se agrega a messages con role "user"',
    q:'¿El mensaje del usuario se agrega a messages?',
    a:'Sí. Es un <code>append</code> a una lista de Python: <code>{"role":"user","content":"…"}</code>. Esa lista vive en el <b>harness</b>, no en el modelo; por eso hay que mandarla completa en cada request.',
    desc:'El harness normaliza la entrada y la agrega al historial. Este es el único momento del turno en que <b>vos</b> escribís en messages: todo lo que sigue lo agrega el harness.'});

  function callModel(response, extra){
    nCall++;
    const k = nCall;
    const first = k === 1;
    step(Object.assign({node:'call', stage:1, contract: first ? 'request' : 'resend', code:['call'],
      req:{k}, title:`REQUEST #${k} — el harness llama al modelo`,
      q: first ? '¿Qué viaja exactamente en el request?' : '¿Qué cambia respecto del request anterior?',
      a: first
        ? 'Tres cosas, siempre: el <code>system</code>, el array <code>tools</code> (con el JSON Schema que generó Pydantic) y <b>todo</b> messages. Sin <code>tool_choice</code> explícito la política es <code>auto</code>: el modelo decide si responde texto o pide una tool.'
        : `Solo se agregaron los últimos mensajes. El <code>system</code>, las <code>tools</code> y el historial anterior viajan <b>otra vez</b>: el modelo es stateless. Este request lleva ${msgs.length} mensaje(s).`,
      desc: first
        ? 'Acá recién cruza algo por la red. El modelo no ve tu disco, ni el código de las tools, ni los permisos: ve este JSON.'
        : 'El harness vuelve a serializar todo messages. Lo que el modelo "sabe" de la iteración anterior es exactamente lo que está en este payload (la caché de prompt abarata el prefijo repetido, pero no evita reenviarlo).'
    }, extra && extra.req));
    step(Object.assign({node:'call', stage:1, contract: response.stop==='tool_use' ? 'response' : 'final', code:['call'],
      res:{k, blocks:response.blocks, stop:response.stop}, title:`RESPONSE #${k} — ${response.stop==='tool_use'?'el modelo propone un tool_use':'el modelo responde en texto'}`,
      desc: response.stop==='tool_use'
        ? fmt => `El modelo <b>no ejecutó nada</b>: devolvió una propuesta estructurada. ${fmt==='openai'?'En OpenAI llega en <code>message.tool_calls</code> con <code>arguments</code> como <b>string</b> JSON y <code>finish_reason:"tool_calls"</code>.':'En Anthropic llega como un bloque <code>tool_use</code> dentro de <code>content</code>, con <code>input</code> como <b>objeto</b> y <code>stop_reason:"tool_use"</code>.'} El <code>id</code> lo generó el proveedor y hay que devolverlo tal cual.`
        : 'Sin bloques <code>tool_use</code>: es la respuesta final de este turno. Si necesitaras una salida con forma fija (para otro programa), este es el lugar de <b>structured outputs</b>.'
    }, extra && extra.res));
    msgs.push({role:'assistant', blocks:response.blocks});
    step({node:'asst', stage:3, contract:'asst', code:['appendAsst'], added:[msgs.length-1],
      title:'Se agrega la respuesta del assistant a messages',
      q: k===1 ? '¿Y la respuesta del modelo? En el diagrama clásico no aparece.' : null,
      a: k===1 ? 'Es el paso que falta. La respuesta completa (texto <b>y</b> <code>tool_use</code>) se agrega a messages <b>antes</b> de ejecutar las tools. El <code>tool_result</code> que viene después referencia ese <code>tool_use</code> por id; si no está en el historial, el próximo request es inválido (400).' : null,
      desc: response.stop==='tool_use'
        ? 'El historial es append-only: primero entra lo que el modelo pidió, después entra lo que pasó. Así el próximo request cuenta la historia en orden.'
        : 'También la respuesta final entra a messages: si el usuario escribe otra cosa, el modelo tiene que ver lo que ya contestó.'});
  }

  function toolRound(callId, input, ok){
    step({node:'check', stage:3, contract:'check', code:['check'],
      title:'¿hay tool_use? → sí',
      q: iter===1 ? '¿Cómo se fija el harness si hay tool_use / function calling?' : null,
      a: iter===1 ? 'Lee un campo, no interpreta el texto: <code>stop_reason == "tool_use"</code> en Anthropic o <code>finish_reason == "tool_calls"</code> en OpenAI. También puede recorrer <code>content</code> buscando bloques <code>tool_use</code>.' : null,
      desc:'Hay acciones pendientes: el loop no termina. Si el motivo fuera <code>max_tokens</code>/<code>length</code>, la salida vino cortada y no conviene ejecutar argumentos a medias.'});
    if(ok){
      step({node:'exec', stage:3, contract:'validate', code:['exec','validate'], tool:{kind:'validate', callId, input},
        title:'Validar los argumentos con Pydantic ✓',
        desc:fmt => `Antes de tocar el disco, el harness valida la propuesta contra el contrato: <code>${fmt==='openai'?'model_validate_json(call.function.arguments)':'model_validate(block.input)'}</code>. Si pasa, la tool recibe un objeto tipado (<code>args.path</code>), no un dict libre.`});
      step({node:'exec', stage:3, contract:'exec', code:['perm','exec'], tool:{kind:'exec', callId, input},
        title:'Permisos y ejecución (no es una llamada al LLM)',
        desc:'El harness evalúa la regla de permisos (<code>read</code> es libre; <code>edit</code> o <code>shell</code> podrían pedir aprobación o estar denegadas) y ejecuta la función local. El modelo no participa de este paso.'});
      step({node:'exec', stage:4, contract:'result', code:['result'], tool:{kind:'result', callId, content:WT_OUTPUT, isError:false},
        title:'El resultado se envuelve en un tool_result',
        q:'¿Ese resultado se agrega a tool_result?',
        a:'Casi: el output se <b>envuelve</b> en un bloque <code>tool_result</code> que lleva el mismo id de la llamada (<code>tool_use_id</code>). No existe una lista aparte de tool_results: ese bloque va dentro de un mensaje nuevo que se agrega a <b>messages</b>.',
        desc:'El id es la costura entre la propuesta y su resultado. Copialo del <code>tool_use</code>: no lo generes vos ni empareje por orden.'});
    } else {
      step({node:'exec', stage:3, contract:'invalid', code:['exec','validate','invalid'], tool:{kind:'invalid', callId, input},
        title:'Validar los argumentos con Pydantic ✗ ValidationError',
        desc:'El modelo mandó <code>file</code> en vez de <code>path</code>. El JSON es válido, pero <b>no cumple el contrato</b>. El harness no ejecuta la tool: convierte el error en una Observation para que el modelo lo corrija.'});
      step({node:'exec', stage:4, contract:'result', code:['invalid','result'], tool:{kind:'result', callId, content:'[{"type":"missing","loc":["path"],"msg":"Field required","input":{"file":"parser.py"}}]', isError:true},
        title:'El error también se envuelve en un tool_result (is_error)',
        q:'Si la validación falla, ¿qué vuelve al modelo?',
        a:'Un <code>tool_result</code> con el mismo id, <code>is_error: true</code> y el detalle de Pydantic como contenido. En OpenAI no hay <code>is_error</code>: el error va en el texto del mensaje <code>role:"tool"</code>.',
        desc:'Un error accionable es mejor que un "ok" vacío o que tirar el loop abajo. El modelo va a ver exactamente qué campo faltó.'});
    }
    msgs.push({role:'results', results:[ok
      ? {id:callId, name:'read', content:WT_OUTPUT, is_error:false}
      : {id:callId, name:'read', content:'[{"type":"missing","loc":["path"],"msg":"Field required","input":{"file":"parser.py"}}]', is_error:true}]});
    step({node:'results', stage:4, contract:'appendResults', code:['appendResults','back'], added:[msgs.length-1], loopBack:true,
      title:'Se agregan los tool_results a messages',
      desc:fmt => fmt==='openai'
        ? 'En OpenAI cada resultado es un mensaje propio con <code>role:"tool"</code> y su <code>tool_call_id</code>. Si hubo 3 tool_calls, se agregan 3 mensajes. Después, el loop vuelve a <b>llamar al modelo</b>.'
        : 'En Anthropic todos los resultados de la iteración van <b>juntos</b> en un único mensaje <code>role:"user"</code>, y los bloques <code>tool_result</code> van primero en <code>content</code>. Después, el loop vuelve a <b>llamar al modelo</b>.'});
    iter++;
  }

  if(invalid){
    callModel({stop:'tool_use', blocks:[{type:'text', text:'Voy a leer parser.py.'},
      {type:'tool_use', id:'call_01', name:'read', input:{file:'parser.py'}}]});
    toolRound('call_01', {file:'parser.py'}, false);
    callModel({stop:'tool_use', blocks:[{type:'text', text:'Faltaba path; reintento con el campo correcto.'},
      {type:'tool_use', id:'call_02', name:'read', input:{path:'parser.py'}}]},
      {res:{title:'RESPONSE #2 — el modelo corrige los argumentos (self-healing)'}});
    toolRound('call_02', {path:'parser.py'}, true);
  } else {
    callModel({stop:'tool_use', blocks:[{type:'text', text:'Voy a leer parser.py.'},
      {type:'tool_use', id:'call_01', name:'read', input:{path:'parser.py'}}]});
    toolRound('call_01', {path:'parser.py'}, true);
  }
  callModel({stop:'end_turn', blocks:[{type:'text', text:WT_FINAL}]});
  step({node:'print', stage:3, contract:'final', code:['check','print'],
    title:'¿hay tool_use? → no: imprimir y volver al REPL',
    desc:'Sin acciones pendientes, el agentic loop termina con <code>break</code>. El harness imprime el texto (la TUI lo renderiza) y vuelve a esperar tu próxima entrada. Fueron '+nCall+' requests para un solo mensaje tuyo.'});
  msgs.push({role:'user', text:WT_USER2});
  step({node:'input', stage:0, contract:'repl', code:['input','appendUser'], added:[msgs.length-1], turn2:true,
    title:'Siguiente entrada: el historial sigue ahí',
    desc:'Tu segunda pregunta se agrega <b>al final</b> del mismo messages. El próximo request va a llevar todo el turno anterior: así el modelo "recuerda". Es exactamente el escenario ⑬ <i>Segundo turno</i> de la pestaña ③.'});
  steps.forEach((s,i)=>{ s.i = i; });
  return steps;
}

/* ---------- render de messages / request / response por formato ---------- */
function wtBlocksAnth(blocks){
  return blocks.map(b=> b.type==='text' ? {type:'text', text:b.text} : {type:'tool_use', id:b.id, name:b.name, input:b.input});
}
function wtRenderMsgs(msgs, fmt){
  const out = [];
  if(fmt==='openai') out.push({i:-1, json:{role:'system', content:WT_SYSTEM}});
  msgs.forEach((m,i)=>{
    if(m.role==='user') out.push({i, json:{role:'user', content:m.text}});
    else if(m.role==='assistant'){
      if(fmt==='openai'){
        const text = m.blocks.filter(b=>b.type==='text').map(b=>b.text).join('');
        const calls = m.blocks.filter(b=>b.type==='tool_use');
        const j = {role:'assistant'};
        if(text) j.content = text;
        if(calls.length) j.tool_calls = calls.map(c=>({id:c.id, type:'function', function:{name:c.name, arguments:JSON.stringify(c.input)}}));
        out.push({i, json:j});
      } else out.push({i, json:{role:'assistant', content:wtBlocksAnth(m.blocks)}});
    } else if(m.role==='results'){
      if(fmt==='openai') m.results.forEach(r=>out.push({i, json:{role:'tool', tool_call_id:r.id, content:r.content}}));
      else out.push({i, json:{role:'user', content:m.results.map(r=>({type:'tool_result', tool_use_id:r.id, content:r.content, is_error:r.is_error}))}});
    }
  });
  return out;
}
function wtRequest(st, fmt){
  const messages = wtRenderMsgs(st.msgs, fmt).map(x=>x.json);
  if(fmt==='openai') return {model:'gpt-4.1', messages,
    tools:[{type:'function', function:{name:'read', description:'Lee un archivo del proyecto.', parameters:WT_READ_SCHEMA}}]};
  return {model:'claude-sonnet-4-5', max_tokens:1024, system:WT_SYSTEM,
    tools:[{name:'read', description:'Lee un archivo del proyecto.', input_schema:WT_READ_SCHEMA}], messages};
}
function wtResponse(st, fmt){
  const r = st.res;
  const inTok = est(JSON.stringify(wtRequest(st, fmt)));
  const outTok = est(JSON.stringify(r.blocks)) + 8;
  if(fmt==='openai'){
    const text = r.blocks.filter(b=>b.type==='text').map(b=>b.text).join('');
    const calls = r.blocks.filter(b=>b.type==='tool_use');
    const message = {role:'assistant', content:text || null};
    if(calls.length) message.tool_calls = calls.map(c=>({id:c.id, type:'function', function:{name:c.name, arguments:JSON.stringify(c.input)}}));
    return {id:'chatcmpl-0'+r.k+'…', object:'chat.completion', model:'gpt-4.1',
      choices:[{index:0, message, finish_reason: r.stop==='tool_use' ? 'tool_calls' : 'stop'}],
      usage:{prompt_tokens:inTok, completion_tokens:outTok, total_tokens:inTok+outTok}};
  }
  return {id:'msg_0'+r.k+'…', type:'message', role:'assistant', model:'claude-sonnet-4-5',
    content:wtBlocksAnth(r.blocks), stop_reason:r.stop, stop_sequence:null,
    usage:{input_tokens:inTok, output_tokens:outTok}};
}
function wtToolText(t, fmt){
  const oai = fmt==='openai';
  const pyIn = () => JSON.stringify(t.input).replace(/"/g,"'").replace(/:/g,': ');
  if(t.kind==='validate') return oai
    ? `call.function.arguments = '${JSON.stringify(t.input)}'   # string\n\nReadArgs.model_validate_json(call.function.arguments)\n→ ReadArgs(path='parser.py')   ✓ cumple el contrato`
    : `block.input = ${JSON.stringify(t.input)}   # objeto\n\nReadArgs.model_validate(block.input)\n→ ReadArgs(path='parser.py')   ✓ cumple el contrato`;
  if(t.kind==='invalid') return (oai
    ? `call.function.arguments = '${JSON.stringify(t.input)}'\n\nReadArgs.model_validate_json(call.function.arguments)\n`
    : `block.input = ${JSON.stringify(t.input)}\n\nReadArgs.model_validate(block.input)\n`)
    + `✗ ValidationError: 1 validation error for ReadArgs\n  path\n    Field required [type=missing, input_value=${pyIn()}, input_type=dict]\n\n→ la tool NO se ejecuta`;
  if(t.kind==='exec') return `# harness → permisos\ncheck_permission("read", ReadArgs(path='parser.py'))   → allow ✓\n\n# harness → tool (local, no cruza la red hacia el modelo)\nRUNNERS["read"](ReadArgs(path='parser.py'))\n\n# tool → harness\n${JSON.stringify(WT_OUTPUT)}`;
  if(t.kind==='result') return oai
    ? `ToolMessage(tool_call_id="${t.callId}", content=output).model_dump()\n\n${JSON.stringify({role:'tool', tool_call_id:t.callId, content:t.content}, null, 2)}`
    : `ToolResult(tool_use_id="${t.callId}", content=output${t.isError?', is_error=True':''}).model_dump()\n\n${JSON.stringify({type:'tool_result', tool_use_id:t.callId, content:t.content, is_error:t.isError}, null, 2)}`;
  return '';
}

/* ---------- estado y render ---------- */
let wtFmt = 'anthropic', wtInvalid = false, wtIdx = 0, wtTimer = null;
let WT_STEPS = wtBuild(false);

function wtVal(v){ return typeof v==='function' ? v(wtFmt) : v; }
function wtStepForPyd(key){ return WT_STEPS.find(s=>{ const c=WT_CONTRACTS[s.contract]; return c && (c.pyd===key || (c.also||[]).indexOf(key)>=0); }); }

function wtRenderFlow(st){
  const box = $('wtFlow'); if(!box) return;
  const node = id => {
    const n = WT_NODES[id];
    const cls = ['wtNode', id===st.node?'on':'', n.added?'added':'', id==='check'?'decision':'', id==='print'?'exit':''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-wt-node="${id}">${n.added?'<span class="wtNew">faltaba</span>':''}<b>${n.label}</b><small>${esc(n.sub)}</small></button>`;
  };
  const arrow = (t,on) => `<div class="wtArrow${on?' on':''}">▼${t?' <span>'+t+'</span>':''}</div>`;
  box.innerHTML = `<div class="wtRepl"><span class="wtBoxLabel">REPL · turno ${st.turn2?2:1}</span>
      ${node('input')}${arrow()}${node('user')}${arrow()}
      <div class="wtLoopBox${st.node==='results'?' back':''}"><span class="wtBoxLabel">agentic loop · iteración ${st.iter}</span>
        ${node('call')}${arrow()}${node('asst')}${arrow()}
        <div class="wtDecision">${node('check')}<div class="wtBranch">no ▶</div>${node('print')}</div>
        ${arrow('sí')}${node('exec')}${arrow()}${node('results')}
        <div class="wtBackLink${st.node==='results'?' on':''}">↩ vuelve a «llamar al modelo»</div>
      </div>
    </div>`;
  box.querySelectorAll('[data-wt-node]').forEach(b=>{ b.onclick = ()=>wtGotoNode(b.dataset.wtNode); });
}
function wtRenderMsgPane(st){
  const el = $('wtMsgs'); if(!el) return;
  const list = wtRenderMsgs(st.msgs, wtFmt);
  const added = new Set(st.added||[]);
  const head = $('wtMsgsCount'); if(head) head.textContent = list.length+' elemento'+(list.length===1?'':'s');
  if(!list.length){ el.innerHTML = '<div class="wtEmpty">messages = [ ]  — todavía vacío</div>'; return; }
  el.innerHTML = list.map((m,j)=>{
    const role = m.json.role;
    const isNew = added.has(m.i);
    const tag = role==='user' && Array.isArray(m.json.content) ? 'user · tool_result' : role==='assistant' && (m.json.tool_calls || (Array.isArray(m.json.content) && m.json.content.some(b=>b.type==='tool_use'))) ? 'assistant · tool_use' : role;
    const rcls = tag.indexOf('tool_result')>=0 ? 'tool' : role;
    return `<div class="wtMsg r-${rcls}${isNew?' new':''}"><div class="wtMsgHead"><span class="wtIdx">[${j}]</span><span class="wtRole">${tag}</span>${isNew?'<span class="wtNewTag">+ recién agregado</span>':''}${m.i===-1?'<span class="wtFixed">fijo</span>':''}</div><pre>${esc(JSON.stringify(m.json, null, 2))}</pre></div>`;
  }).join('');
  const last = el.querySelector('.wtMsg.new');
  if(last && last.scrollIntoView && el.scrollHeight > el.clientHeight) el.scrollTop = last.offsetTop - el.offsetTop - 6;
}
function wtRenderIO(st){
  const lab = $('wtIOLabel'), pre = $('wtIO'), sub = $('wtIOSub'); if(!pre) return;
  let label = 'Sin tráfico de red', text = '', subt = '';
  if(st.req){ label = `REQUEST #${st.req.k}`; subt = 'harness → proveedor'; text = JSON.stringify(wtRequest(st, wtFmt), null, 2); }
  else if(st.res){ label = `RESPONSE #${st.res.k}`; subt = 'proveedor → harness'; text = JSON.stringify(wtResponse(st, wtFmt), null, 2); }
  else if(st.tool){ label = st.tool.kind==='exec' ? 'HARNESS ↔ TOOL' : 'DENTRO DEL HARNESS'; subt = 'no es una llamada al modelo'; text = wtToolText(st.tool, wtFmt); }
  else {
    subt = 'este paso no cruza la red';
    text = st.node==='input' ? (st.turn2 ? `> ${WT_USER2}\n\n# messages ya trae el turno 1 completo:\n# el próximo request lleva ${wtRenderMsgs(st.msgs, wtFmt).length} mensajes.` : `> ${WT_USER}\n\n# todavía no hubo ningún request`)
      : st.node==='user' ? `messages.append({"role": "user", "content": user_text})`
      : st.node==='asst' ? (wtFmt==='openai' ? 'messages.append(msg.model_dump(exclude_none=True))' : 'messages.append({"role": "assistant", "content": resp.content})')
      : st.node==='check' ? (wtFmt==='openai' ? 'resp.choices[0].finish_reason   # "tool_calls" → hay acciones pendientes' : 'resp.stop_reason   # "tool_use" → hay acciones pendientes')
      : st.node==='results' ? 'messages.append(…)   # mirá el panel messages[]\n\n↩ el loop vuelve a llamar al modelo'
      : st.node==='print' ? `print(texto)\n# ${WT_FINAL}\nbreak   # sale del agentic loop, no del REPL` : '';
  }
  if(lab) lab.textContent = label;
  if(sub) sub.textContent = subt;
  pre.textContent = text;
}
function wtRenderCode(st){
  const el = $('wtCode'); if(!el) return;
  const keys = new Set(st.code||[]);
  // cada línea es un bloque: se unen sin '\n' para no duplicar el salto dentro del <pre>
  el.innerHTML = WT_CODE[wtFmt].map(([k,l])=>`<span class="wtLine${k && keys.has(k)?' on':''}">${esc(l)||' '}</span>`).join('');
  const on = el.querySelector('.wtLine.on');
  if(on) el.scrollTop = Math.max(0, on.offsetTop - el.offsetTop - 40);
  const f = $('wtCodeFile'); if(f) f.textContent = wtFmt==='openai' ? 'agent_openai.py' : 'agent.py';
}
function wtRenderContract(st){
  const c = WT_CONTRACTS[st.contract]; const box = $('wtContract'); if(!box || !c) return;
  const tab = c.pyd ? PYD_TABS.find(t=>t.key===c.pyd) : null;
  box.innerHTML = `<div class="wtCHead">🐍 Contrato en este paso</div><div class="wtCTitle">${c.title}</div><pre>${esc(c.code)}</pre>`
    + (tab ? `<button type="button" class="btn wtCLink" data-goto-pyd="${c.pyd}">Profundizar en ② Contratos → <code>${esc(tab.label)}</code></button>` : '');
}
function wtRender(){
  const st = WT_STEPS[wtIdx]; if(!st) return;
  const set = (id,v)=>{ const el=$(id); if(el) el.innerHTML = v; };
  const stage = WT_STAGE_NAMES[st.stage];
  set('wtKicker', `paso ${wtIdx+1} de ${WT_STEPS.length} · iteración ${st.iter}${st.turn2?' · turno 2':''}`);
  set('wtStage', `etapa: ${stage}`);
  set('wtTitle', st.title);
  set('wtDesc', wtVal(st.desc)||'');
  set('wtQA', st.q ? `<div class="wtQ">❓ ${st.q}</div><div class="wtA">${st.a}</div>` : '');
  const qa = $('wtQA'); if(qa) qa.classList.toggle('hidden', !st.q);
  const pf = $('wtProgFill'); if(pf) pf.style.width = ((wtIdx+1)/WT_STEPS.length*100).toFixed(1)+'%';
  const prev = $('wtPrev'), next = $('wtNext');
  if(prev) prev.disabled = wtIdx===0;
  if(next) next.disabled = wtIdx>=WT_STEPS.length-1;
  wtRenderFlow(st); wtRenderMsgPane(st); wtRenderIO(st); wtRenderCode(st); wtRenderContract(st);
  scheduleDecorate();
}
function wtGo(i){ wtIdx = Math.max(0, Math.min(WT_STEPS.length-1, i)); wtRender(); }
function wtNext(){ if(wtIdx < WT_STEPS.length-1) wtGo(wtIdx+1); else wtStop(); }
function wtPrev(){ wtStop(); wtGo(wtIdx-1); }
function wtStop(){ if(wtTimer){ clearInterval(wtTimer); wtTimer = null; } const b=$('wtPlay'); if(b) b.textContent='▶ Reproducir'; }
function wtGotoNode(node){
  wtStop();
  const cur = WT_STEPS[wtIdx];
  const same = WT_STEPS.find(s=>s.node===node && s.iter===cur.iter && !!s.turn2===!!cur.turn2);
  const any = WT_STEPS.find(s=>s.node===node);
  const t = same || any; if(t) wtGo(t.i);
}
function wtGotoPyd(key){
  const s = wtStepForPyd(key); if(!s) return;
  wtStop(); showMainTab('guide'); wtGo(s.i);
  requestAnimationFrame(()=>{ const p=$('wtPanel'); if(p && p.scrollIntoView) p.scrollIntoView({behavior:'smooth', block:'start'}); });
}
function wtSetVariant(invalid){
  const node = (WT_STEPS[wtIdx]||{}).node;
  wtInvalid = invalid; WT_STEPS = wtBuild(invalid);
  const inv = $('wtInvalid'); if(inv) inv.checked = invalid;
  const t = WT_STEPS.find(s=>s.node===node);
  wtGo(t ? t.i : 0);
}
/* Entrada desde otras pestañas: un nodo del diagrama ('exec', 'results'…) o 'turn2'. */
function wtGotoTarget(target, invalid){
  wtStop();
  showMainTab('guide');
  if(!!invalid !== wtInvalid) wtSetVariant(!!invalid);
  const t = target==='turn2'
    ? WT_STEPS.find(s=>s.turn2)
    : WT_STEPS.find(s=>s.node===target && (!invalid || s.contract!=='validate'));
  wtGo(t ? t.i : 0);
  requestAnimationFrame(()=>{ const p=$('wtPanel'); if(p && p.scrollIntoView) p.scrollIntoView({behavior:'smooth', block:'start'}); });
}
function wtInit(){
  const on = (id,fn)=>{ const el=$(id); if(el) el.onclick = fn; };
  on('wtPrev', wtPrev);
  on('wtNext', ()=>{ wtStop(); wtNext(); });
  on('wtReset', ()=>{ wtStop(); wtGo(0); });
  on('wtPlay', ()=>{
    if(wtTimer){ wtStop(); return; }
    if(wtIdx >= WT_STEPS.length-1) wtGo(0);
    const b=$('wtPlay'); if(b) b.textContent='⏸ Pausar';
    wtTimer = setInterval(wtNext, 2600);
  });
  on('wtJumpAsst', ()=>{ showMainTab('guide'); wtGotoNode('asst'); });
  const stg = $('wtStage');
  if(stg) stg.onclick = ()=>{
    const st = WT_STEPS[wtIdx];
    if(typeof loopRenderStage==='function'){ loopStop(); loopRenderStage(st.stage, false); }
    const p=$('loopPanel'); if(p){ p.classList.remove('collapsed'); const t=$('loopToggle'); if(t) t.textContent='ocultar'; if(p.scrollIntoView) p.scrollIntoView({behavior:'smooth', block:'start'}); }
  };
  document.querySelectorAll('#wtFmt button').forEach(b=>{
    b.onclick = ()=>{
      wtFmt = b.dataset.fmt;
      document.querySelectorAll('#wtFmt button').forEach(x=>x.classList.toggle('on', x===b));
      wtRender();
    };
  });
  const inv = $('wtInvalid'); if(inv) inv.onchange = ()=>wtSetVariant(inv.checked);
  const pseudo = $('wtPseudo'); if(pseudo && typeof AGENTIC_LOOP==='string') pseudo.textContent = AGENTIC_LOOP;
  wtRender();
  if(typeof pydRender==='function') pydRender();   // agrega el link "dónde aparece en el loop"
}
wtInit();
