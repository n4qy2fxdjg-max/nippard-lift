/** Generates original SVG sample media (flags, shapes, symbols) for the picture boards. */
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'public', 'images');

const flag = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="600" height="400">${body}</svg>`;
const hStripes = (...c: string[]) => c.map((col, i) => `<rect y="${(2 / c.length) * i}" width="3" height="${2 / c.length}" fill="${col}"/>`).join('');
const vStripes = (...c: string[]) => c.map((col, i) => `<rect x="${(3 / c.length) * i}" width="${3 / c.length}" height="2" fill="${col}"/>`).join('');

export const FLAGS: Record<string, string> = {
  japan: flag(`<rect width="3" height="2" fill="#fff"/><circle cx="1.5" cy="1" r="0.6" fill="#bc002d"/>`),
  france: flag(vStripes('#0055a4', '#fff', '#ef4135')),
  italy: flag(vStripes('#009246', '#fff', '#ce2b37')),
  germany: flag(hStripes('#000', '#dd0000', '#ffce00')),
  sweden: flag(`<rect width="3" height="2" fill="#006aa7"/><rect x="0.9" width="0.4" height="2" fill="#fecc00"/><rect y="0.8" width="3" height="0.4" fill="#fecc00"/>`),
  switzerland: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="400" height="400"><rect width="32" height="32" fill="#d52b1e"/><rect x="13" y="6" width="6" height="20" fill="#fff"/><rect x="6" y="13" width="20" height="6" fill="#fff"/></svg>`,
  poland: flag(hStripes('#fff', '#dc143c')),
  ukraine: flag(hStripes('#005bbb', '#ffd500')),
  austria: flag(hStripes('#ed2939', '#fff', '#ed2939')),
  netherlands: flag(hStripes('#ae1c28', '#fff', '#21468b')),
  denmark: flag(`<rect width="3" height="2" fill="#c60c30"/><rect x="0.8" width="0.35" height="2" fill="#fff"/><rect y="0.825" width="3" height="0.35" fill="#fff"/>`),
  finland: flag(`<rect width="3" height="2" fill="#fff"/><rect x="0.8" width="0.45" height="2" fill="#003580"/><rect y="0.775" width="3" height="0.45" fill="#003580"/>`),
};

const shape = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400"><rect width="100" height="100" fill="#0b1020"/>${body}</svg>`;
const poly = (points: string) => shape(`<polygon points="${points}" fill="#7dd3fc" stroke="#e2e8f0" stroke-width="1.5"/>`);
const regular = (n: number, r = 38) => Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`; }).join(' ');

export const SHAPES: Record<string, string> = {
  pentagon: poly(regular(5)),
  hexagon: poly(regular(6)),
  heptagon: poly(regular(7)),
  octagon: poly(regular(8)),
  trapezium: poly('25,25 75,25 90,75 10,75'),
  rhombus: poly('50,10 85,50 50,90 15,50'),
  parallelogram: poly('30,25 95,25 70,75 5,75'),
  ellipse: shape(`<ellipse cx="50" cy="50" rx="42" ry="26" fill="#7dd3fc" stroke="#e2e8f0" stroke-width="1.5"/>`),
  kite: poly('50,8 80,40 50,92 20,40'),
  crescent: shape(`<path d="M62 12a38 38 0 1 0 0 76 30 30 0 1 1 0-76z" fill="#7dd3fc" stroke="#e2e8f0" stroke-width="1.5"/>`),
  'right-triangle': poly('15,85 85,85 15,15'),
  star: poly(Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 17 : 40; const a = -Math.PI / 2 + (i * Math.PI) / 5; return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`; }).join(' ')),
};

const symbol = (glyph: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400"><rect width="100" height="100" fill="#0b1020"/><text x="50" y="68" font-family="Georgia, 'Times New Roman', serif" font-size="56" text-anchor="middle" fill="#fcd34d">${glyph}</text></svg>`;

export const SYMBOLS: Record<string, string> = {
  sigma: symbol('∑'),
  integral: symbol('∫'),
  pi: symbol('π'),
  infinity: symbol('∞'),
  'square-root': symbol('√'),
  omega: symbol('Ω'),
  delta: symbol('∆'),
  'approximately-equal': symbol('≈'),
  'proportional-to': symbol('∝'),
  therefore: symbol('∴'),
  'empty-set': symbol('∅'),
  lambda: symbol('λ'),
};

export function writeMedia() {
  for (const [dir, set] of [['flags', FLAGS], ['shapes', SHAPES], ['symbols', SYMBOLS]] as const) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    for (const [name, svg] of Object.entries(set)) fs.writeFileSync(path.join(root, dir, `${name}.svg`), svg);
  }
}

if (process.argv[1]?.endsWith('seed-media.ts')) {
  writeMedia();
  console.log('Sample media written to public/images');
}
