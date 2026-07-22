import { chromium } from '@playwright/test';
import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const FPS = 18;
const SIZE = 128;
const DIR = 'public/weather';
const TMP = path.join(process.env.TMPDIR || '/tmp', 'meteocons-frames');
const filter = process.argv[2]; // opcional: só processa arquivos que contenham essa string

function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function lcm(a, b) { return (a * b) / gcd(a, b); }

// período do loop = LCM das durações SMIL (em centésimos), limitado a [2s, 6s]
function loopPeriod(svg) {
  const durs = [...svg.matchAll(/dur="([0-9.]+)s"/g)].map((m) => Math.round(parseFloat(m[1]) * 100));
  if (!durs.length) return 3;
  let l = durs[0];
  for (const d of durs) l = lcm(l, d);
  let sec = l / 100;
  while (sec > 6) sec /= 2;      // evita loops longos demais
  while (sec < 2) sec *= 2;
  return Math.min(6, Math.max(2, Math.round(sec)));
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg') && (!filter || f.includes(filter)));
fs.mkdirSync(TMP, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const FF = '/usr/bin/ffmpeg';
const results = [];

for (const file of files) {
  const name = file.replace('.svg', '');
  const svgRaw = fs.readFileSync(path.join(DIR, file), 'utf8');
  const period = loopPeriod(svgRaw);
  const frames = period * FPS;

  // injeta o SVG dimensionado, fundo transparente
  const sized = svgRaw.replace(/<svg\b/i, `<svg width="${SIZE}" height="${SIZE}"`);
  await page.setContent(
    `<body style="margin:0;background:transparent">${sized}</body>`,
    { waitUntil: 'domcontentloaded' },
  );
  const svgEl = await page.$('svg');
  await page.evaluate(() => { const s = document.querySelector('svg'); if (s && s.pauseAnimations) s.pauseAnimations(); });

  const frameDir = path.join(TMP, name);
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });

  for (let i = 0; i < frames; i++) {
    const t = i / FPS;
    await page.evaluate((tt) => { const s = document.querySelector('svg'); if (s && s.setCurrentTime) s.setCurrentTime(tt); }, t);
    await svgEl.screenshot({ path: path.join(frameDir, `f${String(i).padStart(4, '0')}.png`), omitBackground: true });
  }

  const out = path.join(DIR, `${name}.webp`);
  execFileSync(FF, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(FPS),
    '-i', path.join(frameDir, 'f%04d.png'),
    '-c:v', 'libwebp_anim', '-loop', '0',
    '-pix_fmt', 'yuva420p', '-lossless', '0', '-q:v', '70', '-compression_level', '6',
    out,
  ]);
  const kb = Math.round(fs.statSync(out).size / 1024);
  fs.rmSync(frameDir, { recursive: true, force: true });
  results.push(`${name}: ${frames}f @${FPS}fps (loop ${period}s) -> ${kb}KB`);
  console.log(results[results.length - 1]);
}

await browser.close();
console.log(`\nOK: ${results.length} ícones gerados.`);
