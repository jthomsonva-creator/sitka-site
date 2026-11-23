/**
 * contrast.mjs — every text/background and graphic pair the site draws,
 * measured against WCAG 2.x: 4.5:1 body text, 3:1 large text (≥24px, or
 * ≥18.7px bold) and UI / graphical objects. Reads the colours from
 * assets/site.css's :root, so it measures what the page uses.
 *
 *   node tools/contrast.mjs        # prints the table; exits 1 on a failure
 *
 * THE CONTROL: before measuring, it checks two pairs with known answers
 * (#777 on white is 4.48, black on white is 21). If either moves, the maths
 * is wrong and every line below it is void.
 *
 * Hairlines (--hair, --hair-lit) are decorative card edges, not controls,
 * and are listed as exempt with that reason rather than skipped quietly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(SITE, 'assets/site.css'), 'utf8');
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const T = {};
for (const m of root.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6}|rgba\([^)]*\))/g)) T[m[1]] = m[2];

const parse = (c) => {
  if (c.startsWith('#')) return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
  const [r, g, b, a] = c.match(/[\d.]+/g).map(Number);
  return [r, g, b, a];
};
const over = (fg, bg) => { const [r, g, b, a] = parse(fg); const [R, G, B] = parse(bg); return `#${[r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`; };
const lum = (c) => parse(c).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// the control
const c1 = ratio('#777777', '#FFFFFF'), c2 = ratio('#000000', '#FFFFFF');
if (Math.abs(c1 - 4.48) > 0.01 || Math.abs(c2 - 21) > 0.01) { console.error(`contrast: control failed (${c1.toFixed(2)}, ${c2.toFixed(2)}): the maths is wrong`); process.exit(1); }

const v = (n) => { if (!T[n]) throw new Error(`no --${n} in site.css`); return T[n]; };
const BG = { ground: v('ground'), lift: v('lift'), surface: v('surface'), raise: v('raise'), copper: v('copper') };

// [what, foreground token or colour, background name, need]
const PAIRS = [
  // text
  ['body text, headings', 'ink', ['ground', 'lift', 'surface', 'raise'], 4.5],
  ['secondary copy (feature lines, lists)', 'ink-dim', ['ground', 'surface', 'raise'], 4.5],
  ['captions, eyebrows, notes, fret numbers', 'ink-faint', ['ground', 'lift', 'surface', 'raise'], 4.5],
  ['copper text: links, tagline, tier terms, chord names, counts', 'copper', ['ground', 'surface', 'raise'], 4.5],
  ['patina text (privacy page date line)', 'patina', ['ground'], 4.5],
  ['button / tag / placeholder-tag label on copper', 'ground', ['copper'], 4.5],
  ['button hover: ground on ink', 'ground', ['ink'], 4.5],
  // graphics (3:1)
  ['primary button fill against the page', 'copper', ['ground', 'lift'], 3],
  ['chip and syllable-badge border (hair-lit)', 'hair-lit', ['ground', 'surface'], 3, 'chips are labels, not controls; their text carries them (ink-dim)'],
  ['placeholder dashed frame (copper-mid)', 'copper-mid', ['ground', 'surface'], 3],
  ['objections bullet (copper square)', 'copper', ['lift'], 3],
  ['card edge (hair)', 'hair', ['ground'], 3, 'decorative: a card is not a control, and its contents carry it'],
];

// the SVG figures: the app's tokens, drawn on the panels (surface) and the minis (raise)
const SVG = {
  'root dot (bezelLit)': '#C88B4E', 'chord-tone dot (ink)': '#F2EEE4', 'passing dot (patina)': '#879689', 'blue-note dot (dusty)': '#8295A8',
  'strings (patinaDim)': '#657A6D', 'fret wires (bezel)': '#8A5A32', 'nut (live)': '#C8D2B4', 'open / muted marks (inkDim)': '#B8A693', 'run line (bezelMid)': '#A66E3E',
};
const DOT_TEXT = '#0E0A05'; // COLOR.ground on every dot

const rows = [];
let bad = 0;
const push = (what, fgName, fg, bgName, need, exempt) => {
  const bgc = BG[bgName] ?? v(bgName);
  const fgc = fg.startsWith('rgba') ? over(fg, bgc) : fg;
  const r = ratio(fgc, bgc);
  const ok = r >= need;
  if (!ok && !exempt) bad++;
  rows.push(`${ok ? 'pass' : exempt ? 'exempt' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  need ${need}  ${what}: --${fgName} on --${bgName}${exempt && !ok ? `  (${exempt})` : ''}`);
};
for (const [what, fg, bgs, need, exempt] of PAIRS) for (const b of bgs) push(what, fg, v(fg), b, need, exempt);
rows.push('— the figures (graphical objects, 3:1) —');
for (const [what, c] of Object.entries(SVG)) for (const b of ['surface', 'raise']) {
  const r = ratio(c, BG[b]); const ok = r >= 3; if (!ok) bad++;
  rows.push(`${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  need 3  ${what} on --${b}`);
}
rows.push('— text on a dot (note names, degrees, fingers: 12px, so 4.5:1) —');
for (const [what, c] of Object.entries(SVG).slice(0, 4)) {
  const r = ratio(DOT_TEXT, c); const ok = r >= 4.5; if (!ok) bad++;
  rows.push(`${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  need 4.5  ground text on the ${what}`);
}
console.log(`contrast: control ok (#777 on white ${c1.toFixed(2)}, black on white ${c2.toFixed(0)})`);
console.log(rows.join('\n'));
if (bad) { console.error(`contrast: ${bad} pair(s) below their bar`); process.exit(1); }
console.log('contrast: every pair meets its bar');
