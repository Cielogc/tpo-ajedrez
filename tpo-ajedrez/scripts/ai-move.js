// Proxy hacia Groq: la API key queda en el servidor y nunca llega al navegador.
const uci = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const fenPattern = /^[prnbqkPRNBQK1-8/]{15,71} [wb] (-|K?Q?k?q?) (-|[a-h][36]) \d+ \d+$/;
const namePattern = /^[\p{L}\p{N} .'-]{1,24}$/u;
const lastMovePattern = /^[\p{L}\p{N} ,]{0,80}$/u;
const isMoveList = (list, max) => Array.isArray(list) && list.length <= max && list.every(move => typeof move === 'string' && uci.test(move));
const isTextList = (list, max) => Array.isArray(list) && list.length <= max && list.every(text => typeof text === 'string' && text.length <= 240);

const systemPrompt = `Sos un rival de ajedrez argentino: sobrador, agrandado y canchero. Te creés el mejor del mundo, jugás fuerte y no parás de cargar a tu oponente.
Recibís la posición en FEN y la lista de jugadas legales en notación UCI (casilla de origen + casilla de destino). Elegí la mejor jugada para tu color.
Rigen todas las reglas: el enroque se escribe moviendo el rey dos casillas (e8g8) y la coronación agrega la pieza al final (e2e1q es coronar dama).
En cada jugada tirale una chicana a tu oponente y llamalo por su nombre:
- NO expliques ni describas jugadas: nada de piezas, casillas ni notación, ni las tuyas ni las suyas. La chicana es pura actitud, no análisis.
- Hablá sobrando: agrandate vos, bajale el precio a tu rival, mostrá que esto te aburre de lo fácil que es. Como mucho, una alusión al pasar a cómo viene la partida (si te comió algo, si va perdiendo, si tardó), sin detallar.
- En español rioplatense, con voseo y modismos argentinos (posta, ni ahí, mirá vos, re, flashear, bancá, de una, tranqui, dale), y si pinta alguna comparación futbolera.
- Ejemplos solo del tono: inventá frases propias, nunca uses estas textuales (NOMBRE va reemplazado por el nombre real): "Tranqui, NOMBRE, tomate tu tiempo, total el resultado ya lo sabemos." / "¿Eso fue una jugada, NOMBRE, o se te resbaló la mano?" / "NOMBRE, yo juego con los ojos cerrados y te sigo ganando."
- Corta: una o dos oraciones, máximo 20 palabras. Picante pero con buena onda: sin insultos fuertes, groserías ni nada discriminatorio.
- No repitas frases ni arranques de tus chicanas anteriores; no empieces siempre con "Che".
- No asumas el género de tu oponente: evitá adjetivos con género (cansado/cansada) y hablale de vos.
Respondé únicamente con JSON de la forma {"move":"e7e5","comment":"tu chicana"}, donde move es una jugada de la lista.`;

// Un enfoque distinto en cada jugada: sin esto, el modelo repite siempre la misma estructura.
const angles = [
  'Hacé una pregunta retórica sobradora.',
  'Elogiá a tu rival con ironía, como a alguien que recién aprende a mover las piezas.',
  'Agrandate: contá lo crack que sos vos.',
  'Hacé una comparación futbolera.',
  'Dale un "consejo" sobrador, como si le estuvieras dando una clase.',
  'Cargalo por lo que tarda en mover o por los nervios.',
  'Hacete el aburrido: esto es demasiado fácil para vos.',
  'Contá el final de la partida como si ya hubiera terminado.',
  'Empezá con su nombre y rematá con una frase corta y picante.'
];

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16384) throw new Error('Pedido demasiado grande');
  }
  return JSON.parse(body);
}

async function askGroq(model, messages) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, ...(model.startsWith('openai/gpt-oss') && { reasoning_effort: process.env.GROQ_REASONING || 'low' }) }),
      signal: AbortSignal.timeout(30000)
    });
    const data = await response.json().catch(() => ({}));
    // El plan gratuito limita los tokens por minuto: si Groq pide esperar unos segundos, se espera y se reintenta.
    const wait = Number(response.headers.get('retry-after') || data.error?.message?.match(/try again in ([\d.]+)s/)?.[1]);
    if (response.status === 429 && attempt < 2 && wait > 0 && wait <= 30) {
      console.log(`Groq pidió esperar ${wait}s por el límite de tokens por minuto`);
      await new Promise(resolve => setTimeout(resolve, wait * 1000));
      continue;
    }
    if (response.status === 429) throw new Error('se alcanzó el límite de uso de Groq, probá en un rato');
    if (!response.ok) throw new Error(data.error?.message || `Groq respondió ${response.status}`);
    const usage = data.usage ?? {};
    console.log(`IA: ${usage.prompt_tokens} tokens de prompt + ${usage.completion_tokens} de respuesta (${usage.completion_tokens_details?.reasoning_tokens ?? '?'} razonando)`);
    return data.choices?.[0]?.message?.content ?? '';
  }
}

export async function handleAIMove(request, response) {
  if (request.method !== 'POST') { response.writeHead(405, { Allow: 'POST' }); response.end(); return; }
  // Exigir JSON obliga a otros sitios a pasar por un preflight CORS, que este servidor no acepta.
  if (!request.headers['content-type']?.startsWith('application/json')) { send(response, 415, { error: 'Se esperaba JSON' }); return; }
  if (!process.env.GROQ_API_KEY) { send(response, 503, { error: 'Falta GROQ_API_KEY en el archivo .env' }); return; }

  let input;
  try { input = await readJson(request); } catch { send(response, 400, { error: 'Pedido inválido' }); return; }
  const { color, fen, history, legalMoves, opponentName, lastMove = '', recentComments = [] } = input ?? {};
  if (!['WHITE', 'BLACK'].includes(color) || typeof fen !== 'string' || !fenPattern.test(fen) || !isMoveList(history, 1000) || !isMoveList(legalMoves, 256) || !legalMoves.length) {
    send(response, 400, { error: 'Posición inválida' }); return;
  }
  if (typeof opponentName !== 'string' || !namePattern.test(opponentName) || typeof lastMove !== 'string' || !lastMovePattern.test(lastMove) || !isTextList(recentComments, 4)) {
    send(response, 400, { error: 'Datos del rival inválidos' }); return;
  }

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const own = color === 'WHITE' ? 'blancas' : 'negras', theirs = color === 'WHITE' ? 'negras' : 'blancas';
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: [
      `Jugás con las ${own} contra ${opponentName}, que juega con ${theirs}.`,
      `FEN: ${fen}`,
      `Jugadas previas: ${history.join(' ') || '(ninguna)'}`,
      lastMove && `Última jugada de ${opponentName}: ${lastMove}`,
      recentComments.length && `Tus chicanas anteriores (no repitas sus palabras ni cómo arrancan): ${recentComments.map(text => `"${text}"`).join(' | ')}`,
      `Enfoque para esta chicana: ${angles[Math.floor(Math.random() * angles.length)]}`,
      `Jugadas legales: ${legalMoves.join(' ')}`
    ].filter(Boolean).join('\n') }
  ];
  try {
    // Un segundo intento por si el modelo propone una jugada fuera de la lista.
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await askGroq(model, messages);
      let move, comment;
      try { ({ move, comment } = JSON.parse(content)); } catch {}
      if (legalMoves.includes(move)) { send(response, 200, { move, comment: typeof comment === 'string' ? comment.trim().slice(0, 240) : '' }); return; }
      messages.push({ role: 'assistant', content }, { role: 'user', content: 'Esa jugada no está en la lista de jugadas legales. Elegí una de la lista.' });
    }
    send(response, 502, { error: 'La IA no eligió una jugada legal' });
  } catch (error) {
    console.error('Error consultando a Groq:', error.message);
    send(response, 502, { error: error.name === 'TimeoutError' ? 'Groq tardó demasiado' : error.message });
  }
}
