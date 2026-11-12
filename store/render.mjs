// Génère les visuels du Chrome Web Store à partir du build (.output/chrome-mv3).
// Usage : npm run build && node store/render.mjs [images|video|all]
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const build = join(root, '.output/chrome-mv3');
const out = join(root, 'store/out');
const what = process.argv[2] ?? 'all';
const LANGS = ['en', 'fr'];

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);
if (!CHROME) throw new Error('Chrome introuvable');
if (!existsSync(build)) throw new Error('Lance d’abord `npm run build`');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

// Serveur local : pages de l'extension (avec les fausses API injectées) + scènes du store.
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file;
  if (path === '/store/logo.svg') file = join(root, 'assets/logo.svg');
  else if (path.startsWith('/store/')) file = join(root, path);
  else file = join(build, path);
  if (!file.startsWith(root) || !existsSync(file)) return res.writeHead(404).end();
  let body = readFileSync(file);
  if (path === '/popup.html' || path === '/options.html') {
    body = body.toString().replace('<head>', '<head><script src="/store/stub.js"></script>');
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });

async function shoot(url, file, width, height, scale = 1) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.__ready);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
  await page.close();
  console.log('✓', file.replace(root, '.'));
}

if (what === 'images' || what === 'all') {
  for (const lang of LANGS) {
    const dir = join(out, lang);
    mkdirSync(dir, { recursive: true });
    for (const n of [1, 2, 3, 4, 5]) {
      await shoot(`${base}/store/scenes.html?lang=${lang}&scene=${n}`, join(dir, `screenshot-${n}.png`), 1280, 800);
    }
    await shoot(`${base}/store/scenes.html?lang=${lang}&scene=small`, join(dir, 'promo-small-440x280.png'), 440, 280);
    await shoot(`${base}/store/scenes.html?lang=${lang}&scene=marquee`, join(dir, 'promo-marquee-1400x560.png'), 1400, 560);
  }
}

if (what === 'video' || what === 'all') {
  const FPS = 30;
  for (const lang of LANGS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 }); // → 1920×1080
    await page.goto(`${base}/store/video.html?lang=${lang}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => window.__ready);
    const duration = await page.evaluate(() => window.DURATION);
    const file = join(out, lang, 'presentation.mp4');
    mkdirSync(join(out, lang), { recursive: true });
    const enc = spawn(ffmpeg, [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', file,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const frames = Math.round(duration * FPS);
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => window.setTime(t), i / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`  ${lang} ${Math.round((i / frames) * 100)}%`);
    }
    enc.stdin.end();
    await new Promise((r, j) => enc.on('close', (code) => (code ? j(new Error('ffmpeg ' + code)) : r())));
    await page.close();
    console.log('✓', file.replace(root, '.'));
  }
}

// Visuels du README public : fonds abstraits, sans images des séries.
if (what === 'readme') {
  const dir = join(root, 'docs/images');
  mkdirSync(dir, { recursive: true });
  for (const n of [1, 2, 3, 4, 5]) {
    await shoot(`${base}/store/scenes.html?lang=en&scene=${n}&art=none`, join(dir, `screenshot-${n}.png`), 1280, 800);
  }
  await shoot(`${base}/store/scenes.html?lang=en&scene=marquee`, join(dir, 'banner.png'), 1400, 560);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`${base}/store/video.html?lang=en&art=none`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.__ready);
  const duration = await page.evaluate(() => window.DURATION);
  const FPS = 12;
  const enc = spawn(ffmpeg, [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-vf', 'scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    join(dir, 'demo.gif'),
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < Math.round(duration * FPS); i++) {
    await page.evaluate((t) => window.setTime(t), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
  }
  enc.stdin.end();
  await new Promise((r, j) => enc.on('close', (code) => (code ? j(new Error('ffmpeg ' + code)) : r())));
  console.log('✓ docs/images/demo.gif');
}

await browser.close();
server.close();
