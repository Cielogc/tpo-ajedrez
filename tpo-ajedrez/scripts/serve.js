import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { handleAIMove } from './ai-move.js';

const root = fileURLToPath(new URL('../', import.meta.url));
// GROQ_API_KEY vive en .env (fuera de git). Sin el archivo, el modo contra IA avisa el error.
try { process.loadEnvFile(resolve(root, '.env')); } catch {}
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (request, response) => {
  if (request.url === '/api/ai-move') { await handleAIMove(request, response); return; }
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || pathname.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(403); response.end(); return;
    }
    if (!(await stat(file)).isFile()) { response.writeHead(404); response.end(); return; }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404); response.end('No encontrado');
  }
});
server.on('error', error => { console.error(`No se pudo iniciar el servidor: ${error.message}. Probá con PORT=3001 npm start.`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Ajedrez 3D: http://localhost:${port}${process.env.GROQ_API_KEY ? ' · IA con Groq activa' : ' · sin GROQ_API_KEY: el modo contra IA no va a responder'}`));
