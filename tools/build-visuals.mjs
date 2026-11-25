/**
 * build-visuals.mjs — every illustration on the landing page, generated from
 * the Sitka app's own modules. Nothing in an illustration is drawn by hand.
 *
 *   git -C ../guitar-tuner fetch origin
 *   node --experimental-strip-types tools/build-visuals.mjs [--repo ../guitar-tuner] [--ref origin/release/46] [--check]
 *   node --experimental-strip-types tools/build-visuals.mjs --app <a checkout>        # a working tree instead
 *
 * By default it reads the app at a git ref of the main repo — origin/release/46 (what 1.46 ships)
 * after a fetch — by `git archive` into a temporary folder, so no branch and
 * no working tree is changed, and the figures come from the commit named
 * rather than from whatever a checkout happens to hold. Fetching is left to
 * the caller, on purpose: the script never talks to the network.
 *
 * It imports the app's TypeScript straight from that tree (Node strips the
 * types; the modules it reads have no React Native imports, which is what the
 * app's own Node tests rely on too), computes each figure, and rewrites the
 * blocks in index.html between
 *
 *     <!-- GENERATED:name -->  …  <!-- /GENERATED:name -->
 *
 * Everything outside those markers is hand-written copy and is never touched.
 * Each block opens with a comment naming the app commit and the functions it
 * came from, so nobody has to guess later whether a figure is real.
 *
 * The colours come from the app too: COLOR, KEY_ROLE (theme.ts), ROLE_FILL
 * (scales/neckDots.ts) and dotFill (songwriter/diagramColors.ts) — root
 * copper, every other chord tone cream, a passing note patina, a blue note
 * dusty, exactly as DOTS / DEGREES draw them in the app.
 *
 * Words: an SVG carries no words. Note names, degree labels (1, ♭3), finger
 * numbers and fret numbers only; every sentence is HTML beside it, where a
 * browser can translate it. Each SVG has a <title> and <desc>.
 *
 * CROSS-CHECKS (each can fail, and says so):
 *  - the page's hand-written tuning count must equal TUNING_LIBRARY.length;
 *  - the ranked G shapes and scores in "The details" must be what the ranker
 *    returns today, or the glosses written for them are wrong;
 *  - the four "first in each tuning" shapes likewise.
 * --check writes nothing and exits 1 if index.html is not what this script
 * would write (a block edited by hand, or the app's output moved).
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, '..');
const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : argv[i + 1]; };
const CHECK = argv.includes('--check');
const APP_DIR = argOf('app', null);
const REPO = path.resolve(SITE, argOf('repo', '../guitar-tuner'));
const REF = argOf('ref', 'origin/release/46');
const git = (args, cwd) => execSync(`git ${args}`, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

let APP, appCommit;
if (APP_DIR) {
  APP = path.resolve(SITE, APP_DIR);
  try { appCommit = `${git('rev-parse --abbrev-ref HEAD', APP)} ${git('rev-parse --short HEAD', APP)} (working tree)`; } catch { appCommit = 'unknown commit'; }
} else {
  let sha;
  try { sha = git(`rev-parse --short ${REF}`, REPO); } catch { console.error(`build-visuals: no ${REF} in ${REPO}`); process.exit(1); }
  APP = fs.mkdtempSync(path.join(os.tmpdir(), 'sitka-app-'));
  // only what the figures import: the source and the rhyme dictionary
  const tarPath = path.join(APP, 'app.tar');
  execFileSync('git', ['archive', '--format=tar', '-o', tarPath, REF, 'src', 'assets/rhyme'], { cwd: REPO });
  execFileSync('tar', ['-xf', 'app.tar'], { cwd: APP }); // relative: GNU tar reads 'C:' as a remote host
  fs.rmSync(tarPath);
  appCommit = `${REF} ${sha}`;
  process.on('exit', () => { try { fs.rmSync(APP, { recursive: true, force: true }); } catch { /* temp */ } });
}

const imp = (rel) => import(pathToFileURL(path.join(APP, rel)).href);

const { COLOR, KEY_ROLE } = await imp('src/theme.ts');
const { ROLE_FILL } = await imp('src/features/scales/neckDots.ts');
const { dotFill } = await imp('src/features/songwriter/diagramColors.ts');
const { TUNING_LIBRARY, byCategory } = await imp('src/features/tuner/tuningLibrary.ts');
const { resolveTuning } = await imp('src/tunings.ts');
const { parseChordSymbol, diatonicChords, mod12, noteName, prefersFlats } = await imp('src/features/songwriter/musicTheory.ts');
const { findVoicings } = await imp('src/features/songwriter/voicings.ts');
const { capoTuning, capoMaxFret, shapeSymbol } = await imp('src/features/songwriter/capo.ts');
const { scaleNeck, scalePositions, scaleTitle } = await imp('src/features/scales/scales.ts');
const { linkedRuns } = await imp('src/features/scales/fullNeck.ts');
const { placesOn } = await imp('src/features/scales/noteFinder.ts');
const { spiderSteps, spiderWindow } = await imp('src/features/scales/drills.ts');
const { LICKS } = await imp('src/features/phrases/licks.ts');
const { placements } = await imp('src/features/phrases/placement.ts');
const { harmonyOf, chordLine, lineAt, degreeOf, roleOf , spellsFlats, spellNote } = await imp('src/features/phrases/theory.ts');
const { createLine } = await imp('src/features/songwriter/songModel.ts');
const { createRhymeIndex } = await imp('src/features/songwriter/rhyme.ts');

const fail = (msg) => { console.error(`build-visuals: ${msg}`); process.exit(1); };
if (typeof spellNote !== 'function') fail('the app has no spellNote (theory.ts): it predates STUDY spelling notes by degree; build from origin/release/46');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ */
/* Palette — the app's tokens, under the names the drawings use        */
/* ------------------------------------------------------------------ */

const C = {
  string: COLOR.patinaDim,   // strings: aged, quiet
  fret: COLOR.bezel,         // fret wires: the copper frame
  nut: COLOR.live,           // the nut: pale spruce
  inlay: COLOR.bezelDim,     // inlay dots: barely there
  figure: COLOR.inkFaint,    // fret numbers
  open: COLOR.inkDim,        // open-string rings and mutes
  path: COLOR.bezelMid,      // a run's line through its notes
  dotText: COLOR.ground,     // text on a dot
  root: KEY_ROLE.root,       // copper
  tone: KEY_ROLE.third,      // cream (ink)
  passing: ROLE_FILL.passing,
  blue: ROLE_FILL.blue,
  bar: COLOR.bezelLit,
};

const FONT = `font-family="Poppins, ui-sans-serif, system-ui, sans-serif"`;
let idSeq = 0;
const nextId = (p) => `${p}-${++idSeq}`;

function svgOpen(w, h, title, desc, cls = '') {
  const id = nextId('v');
  return {
    open: `<svg class="viz ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${id}-t ${id}-d" xmlns="http://www.w3.org/2000/svg">` +
      `<title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(desc)}</desc>`,
    close: '</svg>',
  };
}

/* ------------------------------------------------------------------ */
/* A chord diagram — vertical, low string left, as the app's           */
/* ChordDiagram draws it                                               */
/* ------------------------------------------------------------------ */

function chordSvg(v, rootPc, title) {
  const W = 140, H = 150, x0 = 24, dx = 19, y0 = 32, dy = 27, rows = 4, n = v.frets.length;
  const xs = (s) => x0 + s * dx;
  const right = xs(n - 1);
  const { open, close } = svgOpen(W, H, title, `Frets low string to high: ${v.frets.map((f) => (f === null ? 'x' : f)).join('-')}. Root notes copper, other chord tones cream.`, 'chord');
  const out = [open];
  const top = v.atNut ? 0 : v.position - 1;  // fret number of the line at y0
  // muted / open markers
  v.frets.forEach((f, s) => {
    if (f === null) out.push(`<path d="M${xs(s) - 4} ${y0 - 18}l8 8m0 -8l-8 8" stroke="${C.open}" stroke-width="1.6" fill="none"/>`);
    else if (f === 0) out.push(`<circle cx="${xs(s)}" cy="${y0 - 14}" r="4.2" stroke="${C.open}" stroke-width="1.6" fill="none"/>`);
  });
  // nut or position number
  if (v.atNut) out.push(`<rect x="${xs(0) - 2}" y="${y0 - 3}" width="${right - xs(0) + 4}" height="4" fill="${C.nut}"/>`);
  else out.push(`<text x="${x0 - 12}" y="${y0 + dy / 2 + 4}" fill="${C.figure}" font-size="11" text-anchor="middle" ${FONT}>${v.position}</text>`);
  // frets and strings
  for (let r = v.atNut ? 1 : 0; r <= rows; r++) out.push(`<line x1="${xs(0)}" y1="${y0 + r * dy}" x2="${right}" y2="${y0 + r * dy}" stroke="${C.fret}" stroke-width="1.2"/>`);
  for (let s = 0; s < n; s++) out.push(`<line x1="${xs(s)}" y1="${y0}" x2="${xs(s)}" y2="${y0 + rows * dy}" stroke="${C.string}" stroke-width="1.2"/>`);
  const yOf = (f) => y0 + (f - top - 0.5) * dy;
  // barre: cream, under its dots
  if (v.barre) {
    const b = v.barre;
    out.push(`<rect x="${xs(b.from) - 7}" y="${yOf(b.fret) - 7}" width="${xs(b.to) - xs(b.from) + 14}" height="14" rx="7" fill="${dotFill(null, rootPc)}"/>`);
  }
  v.frets.forEach((f, s) => {
    if (!f) return;
    out.push(`<circle cx="${xs(s)}" cy="${yOf(f)}" r="7" fill="${dotFill(v.midi[s], rootPc)}"/>`);
  });
  out.push(close);
  return out.join('');
}

const shapeText = (v) => v.frets.map((f) => (f === null ? 'x' : f)).join('-');
const FINGERS_WORD = ['none', 'one', 'two', 'three', 'four'];
const fingersUsed = (v) => new Set(v.fingers.filter((f) => f && f > 0)).size;
const notesText = (v, flats) => v.midi.map((m) => (m === null ? '·' : noteName(mod12(m), flats))).join(' ');

/* ------------------------------------------------------------------ */
/* A neck — horizontal (high string on top, as tab reads) or vertical  */
/* (low string left, frets down), for narrow screens                   */
/* ------------------------------------------------------------------ */

const INLAYS = [3, 5, 7, 9, 15];

/**
 * dots: { string, fret, fill, text, small? (a little order number) }
 * path: [{ string, fret, slide? }] drawn as one line, in order, behind the dots
 */
function neckSvg({ strings = 6, lo, hi, dots, path: route = [], title, desc, vertical = false, cell = 46, gap = 30, numbers = 'markers', cls = '' }) {
  const hasOpen = lo === 0;
  const first = Math.max(lo, 1);
  const cells = hi - first + 1;
  const pad = 14, openRoom = hasOpen ? 30 : 6, figRoom = 22;
  const along = openRoom + cells * cell + pad;          // length along the frets
  const across = (strings - 1) * gap + pad * 2;          // width across the strings
  const W = vertical ? across + figRoom : along + pad;
  const H = vertical ? along + pad : across + figRoom;
  // u: position along the neck; v: across the strings (string index)
  const uOfWire = (k) => pad + openRoom + k * cell;      // wire after k cells
  const uOf = (fret) => (fret === 0 ? pad + openRoom - 16 : uOfWire(fret - first) + cell / 2);
  const vOf = (s) => (vertical ? pad + s * gap : pad + (strings - 1 - s) * gap);
  const xy = (u, v) => (vertical ? [v + figRoom, u] : [u, v]);
  const line = (u1, v1, u2, v2, attrs) => { const [x1, y1] = xy(u1, v1); const [x2, y2] = xy(u2, v2); return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" ${attrs}/>`; };
  const { open, close } = svgOpen(W, H, title, desc, `neck ${vertical ? 'neck-v' : 'neck-h'} ${cls}`);
  const out = [open];
  const vMid = (vOf(0) + vOf(strings - 1)) / 2;
  // inlays
  for (let f = first; f <= hi; f++) {
    const u = uOf(f);
    if (f === 12) {
      for (const k of [-1, 1]) { const [x, y] = xy(u, vMid + k * gap); out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="4" fill="${C.inlay}"/>`); }
    } else if (INLAYS.includes(f)) { const [x, y] = xy(u, vMid); out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="4" fill="${C.inlay}"/>`); }
  }
  // wires
  for (let k = 0; k <= cells; k++) {
    const isNut = hasOpen && k === 0;
    out.push(line(uOfWire(k), vOf(0), uOfWire(k), vOf(strings - 1), isNut ? `stroke="${C.nut}" stroke-width="5"` : `stroke="${C.fret}" stroke-width="1.3"`));
  }
  // strings (low strings a touch heavier)
  for (let s = 0; s < strings; s++) {
    const w = r1(1 + (strings - 1 - s) * 0.18);
    out.push(line(hasOpen ? uOfWire(0) - 26 : uOfWire(0), vOf(s), uOfWire(cells), vOf(s), `stroke="${C.string}" stroke-width="${w}"`));
  }
  // fret numbers
  for (let f = first; f <= hi; f++) {
    const show = numbers === 'all' || f === first || f === 12 || INLAYS.includes(f);
    if (!show) continue;
    const [x, y] = vertical ? [figRoom / 2, uOf(f) + 4] : [uOf(f), across + figRoom - 6];
    out.push(`<text x="${r1(x)}" y="${r1(y)}" fill="${C.figure}" font-size="11" text-anchor="middle" ${FONT}>${f}</text>`);
  }
  // the route
  if (route.length > 1) {
    const pts = route.map((p) => xy(uOf(p.fret), vOf(p.string)));
    out.push(`<polyline points="${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}" fill="none" stroke="${C.path}" stroke-width="2" stroke-linejoin="round" stroke-opacity=".8"/>`);
    route.forEach((p, i) => {
      if (!p.slide || i === 0) return;
      const [x1, y1] = pts[i - 1]; const [x2, y2] = pts[i];
      out.push(`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${C.root}" stroke-width="5" stroke-linecap="round" stroke-opacity=".55"/>`);
    });
  }
  // dots
  const R = 11;
  for (const d of dots) {
    const [x, y] = xy(uOf(d.fret), vOf(d.string));
    out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${R}" fill="${d.fill}"/>`);
    if (d.text !== undefined && d.text !== '') {
      const t = String(d.text);
      const fs = t.length > 2 ? 8.5 : t.length > 1 ? 10 : 12;
      out.push(`<text x="${r1(x)}" y="${r1(y + fs * 0.36)}" fill="${C.dotText}" font-size="${fs}" font-weight="500" text-anchor="middle" ${FONT}>${esc(t)}</text>`);
    }
    if (d.small) {
      out.push(`<text x="${r1(x + R + 1)}" y="${r1(y - R + 2)}" fill="${C.figure}" font-size="9.5" ${FONT}>${esc(d.small)}</text>`);
    }
  }
  out.push(close);
  return out.join('');
}

/* both orientations: the page shows one by width (CSS .neck-h / .neck-v) */
const neckBoth = (o) => neckSvg({ ...o, vertical: false }) + neckSvg({ ...o, vertical: true, cell: Math.min(o.cell ?? 46, 40), gap: 34 });

const legend = (items) => `<ul class="legend">${items.map(([fill, word]) => `<li><span class="swatch" style="background:${fill}"></span>${word}</li>`).join('')}</ul>`;

/* ------------------------------------------------------------------ */
/* The blocks                                                          */
/* ------------------------------------------------------------------ */

const blocks = {};
const src = (what) => `<!-- generated by tools/build-visuals.mjs from the app at ${appCommit}: ${what}. Do not edit by hand; re-run the script. -->`;

/* ---- Tunings: the families, one square per tuning ---- */
{
  const FAMILIES = [['standard', 'Standard &amp; shifts'], ['dropped', 'Dropped'], ['open', 'Open'], ['modal', 'Modal'], ['other', 'Other']];
  const total = TUNING_LIBRARY.length;
  const counted = FAMILIES.reduce((n, [c]) => n + byCategory(c).length, 0);
  if (counted !== total) fail(`families add to ${counted}, the library holds ${total}: a category the page does not list`);
  const rows = FAMILIES.map(([cat, label]) => {
    const list = byCategory(cat);
    const sq = 14, g = 4, perRow = 20;
    const w = Math.min(list.length, perRow) * (sq + g) - g;
    const h = Math.ceil(list.length / perRow) * (sq + g) - g;
    const { open, close } = svgOpen(w, h, `${list.length} tunings`, `${list.length} squares, one per tuning in this family.`, 'fam-sq');
    const squares = list.map((t, i) => `<rect x="${(i % perRow) * (sq + g)}" y="${Math.floor(i / perRow) * (sq + g)}" width="${sq}" height="${sq}" fill="${t.name === 'Standard' ? C.tone : C.root}"/>`).join('');
    return `<div class="fam"><p class="fam-name">${label} <span class="fam-count">${list.length}</span></p>${open}${squares}${close}` +
      `<p class="fam-list">${list.map((t) => esc(t.name)).join(', ')}</p></div>`;
  });
  blocks.families = `${src('TUNING_LIBRARY, byCategory()')}\n<div class="families">${rows.join('')}</div>\n` +
    `<p class="fam-note">One square for each of the ${total}; the cream one is Standard.</p>`;
  blocks.__total = total;
}

/* ---- Tunings: the same chord in three tunings ---- */
{
  const chord = parseChordSymbol('G');
  const figs = ['Standard', 'DADGAD', 'Open G'].map((name) => {
    const t = resolveTuning(name, null);
    const v = findVoicings(chord, t)[0];
    if (!v) fail(`no G voicing in ${name}`);
    const strings = t.map((s) => s.label.replace(/\d+$/, '')).join(' ');
    return `<figure class="mini"><figcaption><span class="mini-name">${esc(name)}</span><span class="mini-sub">${esc(strings)}</span></figcaption>` +
      chordSvg(v, chord.root, `G in ${name}`) +
      `<p class="mini-shape">${shapeText(v)}</p><p class="mini-meta">${fingersUsed(v) === 0 ? 'no fingers' : `${FINGERS_WORD[fingersUsed(v)]} ${fingersUsed(v) === 1 ? 'finger' : 'fingers'}`}</p></figure>`;
  });
  blocks.threeTunings = `${src("findVoicings(parseChordSymbol('G'), resolveTuning(name))[0], dotFill()")}\n<div class="minirow">${figs.join('')}</div>`;
}

/* ---- Chords: a key's shapes, ranked first, for one tuning and capo ---- */
{
  const TUNING = 'DADGAD', CAPO = 2, TONIC = 4 /* E, sounding */, MODE = 'Ionian';
  const strings = capoTuning(resolveTuning(TUNING, null), CAPO);
  const key = diatonicChords(TONIC, MODE).filter((c) => c.quality === 'maj' || c.quality === 'min');
  const shapeKey = { tonic: mod12(TONIC - CAPO), mode: MODE };
  const figs = key.map((c) => {
    const v = findVoicings(c, strings, { maxFret: capoMaxFret(CAPO) })[0];
    if (!v) return '';
    const shape = shapeSymbol(c.symbol, CAPO, { tonic: TONIC, mode: MODE });
    return `<figure class="mini"><figcaption><span class="mini-name">${esc(shape)}</span><span class="mini-sub">${esc(c.roman)}</span></figcaption>` +
      chordSvg(v, mod12(c.root), `${shape} shape, capo ${CAPO}, ${TUNING}`) +
      `<p class="mini-shape">${shapeText(v)}</p><p class="mini-meta">sounds ${esc(c.symbol)}</p></figure>`;
  });
  void shapeKey;
  blocks.chordSet = `${src(`diatonicChords(E, Ionian) triads, findVoicings(c, capoTuning(${TUNING}, ${CAPO}), { maxFret: capoMaxFret(${CAPO}) })[0], shapeSymbol()`)}\n` +
    `<p class="viz-cap">${TUNING}, capo ${CAPO}: the first shape for each chord in the key. You play D shapes; it sounds in E.</p>\n<div class="minirow six">${figs.join('')}</div>`;
}

/* ---- Scales: one position, DEGREES colours ---- */
{
  const TUNING = 'DADGAD', TONIC = 2 /* D */, SCALE = 'blues', POS = 1;
  const open = resolveTuning(TUNING, null).map((s) => s.midi);
  const neck = scaleNeck(open, 0, TONIC, SCALE);
  const p = scalePositions(neck, open.length)[POS - 1];
  if (!p) fail('no scale position');
  const fill = (n) => (n.label === '1' ? C.root : n.role !== 'other' ? C.tone : n.label === '♭5' ? C.blue : C.passing);
  const dots = p.notes.map((n) => ({ string: n.string, fret: n.fret, fill: fill(n), text: n.label }));
  const title = `${scaleTitle(TONIC, SCALE)}, position ${POS}, in ${TUNING}`;
  blocks.scale = `${src(`scaleNeck(${TUNING}, capo 0, D, '${SCALE}'), scalePositions()[${POS - 1}], ROLE_FILL`)}\n` +
    neckSvg({ lo: p.lo, hi: Math.max(p.hi, p.lo + 4), dots, title, desc: `${p.notes.length} notes in frets ${p.lo} to ${p.hi}, each labelled with its scale degree.`, numbers: 'all', cls: 'fit' }) +
    `<p class="viz-cap">${esc(title)}, frets ${p.lo}&ndash;${p.hi}.</p>` +
    legend([[C.root, 'root'], [C.tone, 'chord tone'], [C.passing, 'passing'], [C.blue, 'blue note']]);
}

/* ---- Across the neck: a linked run, a finger on every note ---- */
{
  const TUNING = 'Standard', TONIC = 9 /* A */, SCALE = 'minorPentatonic';
  const open = resolveTuning(TUNING, null).map((s) => s.midi);
  const neck = scaleNeck(open, 0, TONIC, SCALE);
  const positions = scalePositions(neck, open.length);
  const run = linkedRuns(positions, open.length)[0];
  if (!run) fail('no linked run');
  const up = run.steps.filter((s) => s.dir === 'up');
  const dots = up.map((s) => ({ string: s.note.string, fret: s.note.fret, fill: s.note.label === '1' ? C.root : C.tone, text: String(s.finger) }));
  const route = up.map((s) => ({ string: s.note.string, fret: s.note.fret, slide: s.how === 'slide' }));
  const slides = up.filter((s) => s.how === 'slide').length;
  const title = `${scaleTitle(TONIC, SCALE)}, linked positions 1 to 3, in ${TUNING}`;
  blocks.across = `${src(`linkedRuns(scalePositions(scaleNeck(${TUNING}, A, minorPentatonic)))[0], the steps going up`)}\n` +
    neckBoth({ lo: Math.min(run.lo, 0) === 0 && run.lo <= 1 ? 0 : run.lo - 1, hi: run.hi + 1, dots, path: route, title, desc: `${up.length} notes up the neck from fret ${run.lo} to ${run.hi}, each with the finger that plays it; ${slides} slide${slides === 1 ? '' : 's'} between positions.` }) +
    `<p class="viz-cap">${esc(title)}: the number on each note is the finger; the copper stroke is a slide.</p>`;
}

/* ---- Phrases: a lick, with STUDY's words ---- */
{
  /*
   * 'bl5' ("Seventh becomes the third", with a blue note), the owner's choice
   * (2026-11-23). STUDY spells each note by its degree over its chord
   * (theory.ts spellNote, the app's fix on feature/pro), so its ♭7 in C is B♭.
   */
  const ID = 'bl5', KEY = 0 /* C */, TUNING = 'Standard';
  const lick = LICKS.find((l) => l.id === ID);
  if (!lick) fail(`lick ${ID} not found`);
  const open = resolveTuning(TUNING, null).map((s) => s.midi);
  const pl = placements(lick, 'asWritten', open, 0, KEY)[0];
  if (!pl) fail(`lick ${ID} does not place`);
  const notes = pl.placed.notes;
  const flats = spellsFlats(KEY, false);
  const hs = harmonyOf(lick, notes, KEY);
  const names = hs.map((h) => spellNote(h, flats)); // spelled as STUDY spells them: by degree over the chord
  const fill = (h) => { const r = roleOf(h); return r === 'chord' ? (mod12(h.iv) === 0 ? C.root : C.tone) : r === 'blue' ? C.blue : C.passing; };
  const byPlace = new Map();
  notes.forEach((n, i) => {
    const k = `${n.string}:${n.fret}`;
    if (!byPlace.has(k)) byPlace.set(k, { string: n.string, fret: n.fret, fill: fill(hs[i]), text: degreeOf(hs[i]), order: [] });
    byPlace.get(k).order.push(i + 1);
  });
  const dots = [...byPlace.values()].map((d) => ({ ...d, small: d.order.join(' ') }));
  const roles = new Set(dots.map((d) => d.fill));
  /* the cross-check: the lick's ♭7 over C must read B♭, as STUDY shows it; A♯ would mean the app's spelling moved back */
  {
    const i7 = hs.findIndex((h) => mod12(h.iv) === 10);
    if (i7 < 0 || names[i7] !== 'B♭') fail(`"${lick.name}" in C: its ♭7 reads ${i7 < 0 ? 'nowhere' : names[i7]}, not B♭ as STUDY spells it`);
  }
  const lines = notes.map((_, i) => `<li>${esc(lineAt(i, names, notes, hs, flats))}</li>`).join('');
  const title = `“${lick.name}”, in C, on the neck in ${TUNING}`;
  blocks.phrase = `${src(`LICKS '${ID}', placements(asWritten, ${TUNING}, C)[0], harmonyOf, chordLine, lineAt, degreeOf, roleOf`)}\n` +
    `<p class="study-chords">${esc(chordLine(hs, flats))}</p>` +
    neckSvg({ lo: Math.max(0, pl.placed.lo - 1), hi: Math.max(pl.placed.hi + 1, pl.placed.lo + 4), dots, title, desc: `${notes.length} notes; each dot shows its degree over the chord and its place in the order.`, numbers: 'all', cls: 'fit' }) +
    `<ol class="study-lines">${lines}</ol>` +
    legend([[C.root, 'root'], [C.tone, 'chord tone'], [C.passing, 'passing'], [C.blue, 'blue note']].filter(([c]) => roles.has(c)));
}

/* ---- Note finder: one note everywhere it falls ---- */
{
  const TUNING = 'Standard', PC = 0 /* C */, FRETS = 15;
  const open = resolveTuning(TUNING, null).map((s) => s.midi);
  const dots = [];
  open.forEach((_, s) => placesOn(open, 0, s, PC, FRETS).forEach((f) => dots.push({ string: s, fret: f, fill: C.root, text: 'C' })));
  blocks.finder = `${src(`placesOn(${TUNING}, capo 0, each string, C, ${FRETS})`)}\n` +
    neckBoth({ lo: 0, hi: FRETS, dots, cell: 44, title: `Every C on the neck in ${TUNING}, frets 0 to ${FRETS}`, desc: `${dots.length} places, on all six strings.` }) +
    `<p class="viz-cap">Every C in ${TUNING}, frets 0&ndash;${FRETS}: ${dots.length} places.</p>`;
}

/* ---- Finger drills: the spider ---- */
{
  const TUNING = 'Standard', TONIC = 9, SCALE = 'minorPentatonic', ORDER = '1234';
  const open = resolveTuning(TUNING, null).map((s) => s.midi);
  const neck = scaleNeck(open, 0, TONIC, SCALE);
  const p = scalePositions(neck, open.length)[0];
  const steps = spiderSteps(p, { order: ORDER, pinkyFirst: false }, neck, prefersFlats(TONIC, 'Aeolian'));
  const up = steps.filter((s) => s.dir === 'up');
  const { first, last } = spiderWindow(p);
  const dots = up.map((s) => ({ string: s.note.string, fret: s.note.fret, fill: C.tone, text: String(s.finger) }));
  const route = up.map((s) => ({ string: s.note.string, fret: s.note.fret }));
  blocks.spider = `${src(`spiderSteps(scalePositions(scaleNeck(${TUNING}, A, minorPentatonic))[0], order ${ORDER}), the way up`)}\n` +
    neckSvg({ lo: first, hi: last, dots, path: route, numbers: 'all', cell: 56, title: `The spider, ${ORDER}, frets ${first} to ${last}`, desc: `${up.length} notes: four frets, one finger each, low string to high; the line shows the order.`, cls: 'fit' }) +
    `<p class="viz-cap">Order ${ORDER}, frets ${first}&ndash;${last}, low string to high and back.</p>`;
}

/* ---- Writer: a ZZ demo line, chords above the words ---- */
{
  const TEXT = 'ZZ demo line, with the chords above the words';
  const at = (w) => { const i = TEXT.indexOf(w); if (i < 0) fail(`"${w}" not in the demo line`); return i; };
  const line = createLine(TEXT, [
    { symbol: 'G', at: at('demo') },
    { symbol: 'Em', at: at('with') },
    { symbol: 'C', at: at('chords') },
    { symbol: 'D', at: at('words') },
  ]);
  const rhyme = createRhymeIndex(JSON.parse(fs.readFileSync(path.join(APP, 'assets/rhyme/words.json'), 'utf8')));
  const syl = rhyme.lineSyllables(line.text);
  // split the text at each chord: a chord sits over the first letter it was placed on
  const cuts = [...line.chords].sort((a, b) => a.at - b.at);
  const parts = [];
  let i = 0;
  if (cuts[0]?.at > 0) parts.push({ chord: '', text: line.text.slice(0, cuts[0].at) });
  cuts.forEach((c, k) => { parts.push({ chord: c.symbol, text: line.text.slice(c.at, cuts[k + 1]?.at ?? line.text.length) }); i = c.at; });
  void i;
  const html = parts.map((p) => `<span class="seg"><span class="ch" aria-hidden="${p.chord ? 'false' : 'true'}">${esc(p.chord) || '&nbsp;'}</span><span class="ly">${esc(p.text).replace(/ /g, '&nbsp;')}</span></span>`).join('');
  blocks.writer = `${src("createLine(text, chords), RhymeIndex.lineSyllables over assets/rhyme/words.json")}\n` +
    `<div class="lyric" lang="en"><p class="lyric-line">${html}</p><span class="syl" title="syllables">${syl}</span></div>` +
    `<p class="viz-cap">A test line, not a lyric. The number is the syllable count Sitka puts beside every line.</p>`;
}

/* ---- The details: G ranked in Standard, and G first in four tunings ---- */
{
  const chord = parseChordSymbol('G');
  const std = findVoicings(chord, resolveTuning('Standard', null), { limit: 3 });
  const WANT = [['3-2-0-0-0-3', 58], ['3-2-0-0-0-x', 55], ['3-2-0-0-3-3', 53]];
  WANT.forEach(([shape, score], k) => {
    const v = std[k];
    if (!v || shapeText(v) !== shape || v.score !== score) fail(`ranked G #${k + 1} is now ${v ? `${shapeText(v)} (${v.score})` : 'missing'}, the page says ${shape} (${score}): rewrite the verdict under it`);
  });
  blocks.ranked = `${src("findVoicings(G, Standard, { limit: 3 }), Voicing.score, rootPosition, openStrings")}\n<div class="minirow three">` + std.map((v, k) =>
    `<figure class="mini"><span class="rank-n">${k + 1}</span>` + chordSvg(v, chord.root, `G in Standard, ranked ${k + 1}`) +
    `<p class="mini-shape">${shapeText(v)}</p><p class="rank-score"><span>${v.score}</span> score</p>` +
    `<p class="mini-meta">${v.rootPosition ? 'root in bass' : 'inversion'} · ${v.openStrings} open</p><p class="mini-meta">${notesText(v, false)}</p></figure>`).join('') + '</div>';

  const FOUR = [['Open G', 'x-0-0-0-0-0', 'Strum it. No hand on the neck at all.'], ['DADGAD', '0-2-0-0-2-0', 'Two fingers, and the drone stays in the bass.'], ['Standard', '3-2-0-0-0-3', 'The shape everyone learns first.'], ['Drop D', '5-2-0-0-0-3', 'The same notes, but a stretch to the fifth fret.']];
  blocks.four = `${src("findVoicings(G, resolveTuning(name))[0] for four tunings")}\n<div class="minirow four">` + FOUR.map(([name, want, gloss]) => {
    const t = resolveTuning(name, null);
    const v = findVoicings(chord, t)[0];
    if (shapeText(v) !== want) fail(`G first in ${name} is now ${shapeText(v)}, the gloss was written for ${want}`);
    return `<figure class="mini"><figcaption><span class="mini-name">${esc(name)}</span><span class="mini-sub">${esc(t.map((s) => s.label.replace(/\d+$/, '')).join(' '))}</span></figcaption>` +
      chordSvg(v, chord.root, `G in ${name}`) + `<p class="mini-shape">${shapeText(v)}</p><p class="mini-meta">${FINGERS_WORD[fingersUsed(v)]} · ${notesText(v, false)}</p><p class="mini-gloss">${esc(gloss)}</p></figure>`;
  }).join('') + '</div>';
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

const DUMP = argOf('dump', null);
if (DUMP) {
  fs.mkdirSync(DUMP, { recursive: true });
  for (const [n, b] of Object.entries(blocks)) if (!n.startsWith('__')) fs.writeFileSync(path.join(DUMP, `${n}.html`), String(b));
  console.log(`build-visuals: dumped ${Object.keys(blocks).length - 1} blocks to ${DUMP}`);
  process.exit(0);
}

const file = path.join(SITE, 'index.html');
const before = fs.readFileSync(file, 'utf8');
const eol = before.includes('\r\n') ? '\r\n' : '\n';
let html = before;

// the hand-written counts must match the library
const total = blocks.__total;
delete blocks.__total;
const counts = [...html.replace(/<!-- GENERATED:[\s\S]*?<!-- \/GENERATED:[a-zA-Z]+ -->/g, '').matchAll(/\b(\d{2}) (?:built-in )?tunings\b/g)].map((m) => Number(m[1]));
if (!counts.length) fail('found no hand-written tuning count to check');
const wrong = counts.filter((n) => n !== total);
if (wrong.length) fail(`the page says ${wrong.join(', ')} tunings, the library holds ${total}`);

for (const [name, body] of Object.entries(blocks)) {
  const re = new RegExp(`(<!-- GENERATED:${name} -->)[\\s\\S]*?(<!-- /GENERATED:${name} -->)`);
  if (!re.test(html)) fail(`index.html has no GENERATED:${name} block`);
  html = html.replace(re, (_, a, b) => `${a}${eol}${body.replace(/\n/g, eol)}${eol}${b}`);
}

if (CHECK) {
  if (html !== before) fail('index.html is not what the app generates now: run the script without --check');
  console.log(`build-visuals: index.html matches the app (${appCommit}); ${counts.length} tuning counts = ${total}`);
} else {
  fs.writeFileSync(file, html);
  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1);
  console.log(`build-visuals: ${Object.keys(blocks).length} blocks from ${appCommit}`);
  for (const [n, b] of Object.entries(blocks)) console.log(`  ${n.padEnd(13)} ${kb(b).padStart(6)} KB`);
  console.log(`  tuning counts on the page: ${counts.join(', ')} = ${total}`);
}
