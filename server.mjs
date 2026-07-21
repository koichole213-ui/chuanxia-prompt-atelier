import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const localUrl = `http://127.0.0.1:${port}`;
const shouldOpenBrowser = process.argv.includes('--open');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function resolveRequestPath(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, '');
  const normalized = normalize(decoded || 'index.html');
  const target = join(root, normalized);
  return target.startsWith(root) ? target : null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    let target = resolveRequestPath(url.pathname);
    if (!target) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) target = join(target, 'index.html');
    const body = await readFile(target);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`没有找到这个页面。\n${error.code || ''}`);
  }
});

function openBrowser() {
  const browserProcess = spawn('explorer.exe', [localUrl], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  browserProcess.unref();
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`串匣已经在运行：${localUrl}`);
    if (shouldOpenBrowser) openBrowser();
    setTimeout(() => process.exit(0), 300);
    return;
  }
  console.error('串匣启动失败：', error.message);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`串匣已启动：${localUrl}`);
  console.log('保持这个窗口开启；关闭窗口即可停止串匣。');
  if (shouldOpenBrowser) openBrowser();
});
