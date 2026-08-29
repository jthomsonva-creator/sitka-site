# sitkastrings.com — make the page show, not tell

The page is accurate and fast and reads like documentation. Every claim on it is a
thing that could be *demonstrated* instead, and most of them can be demonstrated
with inline SVG built from data the app already produces. That's the job.

Tell me the plan before you build it.

## The principle

The chord comparison you already made is the model: **real output from the real
module, rendered as a diagram, not an artist's impression.** Everything below
should work the same way — if a number appears in an illustration, it should come
from `npm run voicings:rank` or `musicTheory.ts` or the aperiodicity fixtures, not
from your head. An illustration that invents its data is the same failure as
writing illustrative output that looks like real output.

Where a figure genuinely can't be derived, label it as schematic rather than
letting it imply measurement.

## Things worth illustrating

**1. The same chord across several tunings.** Currently G in Standard vs DADGAD,
two diagrams. Make it a row: G in Standard, Drop D, DADGAD, Open G — four
fretboards, generated from the real ranking. The point lands harder at four than
at two, because two looks like a special case and four looks like a system.

**2. What "ranked" means.** Nothing on the page shows the ranking, only the
result. A short list of the top voicings for one chord in one tuning, with the
score components visible — open strings, fingers required, whether the root is in
the bass. That's the differentiator explained in one graphic, and `scoreOf` has
the numbers.

**3. The tuning changes everything.** A fretboard where the six string labels
change and the dots move. Even static, showing the same shape producing different
notes in two tunings makes the problem concrete for someone who's never thought
about it.

**4. How the voice trainer judges.** Three numbers, and the page currently just
asserts them. Draw a pitch trace against a target line, with the three
measurements called out on the same curve — time inside the band, mean deviation,
time to settle. One curve, three annotations, and the reader understands why one
score would hide two of the three problems. The aperiodicity fixtures have real
traces if you want real data.

**5. Why a rhyme dictionary that ranks by sound is different.** A small
side-by-side: what you get sorted by spelling versus sorted by phonetic distance,
for one word. `rhyme.ts` produces both.

**6. The thirty tunings, as a shape rather than a list.** Grouped by family —
standard shifts, dropped, open, modal — with the interval pattern shown. Turns a
number into something you can look at.

## Constraints

- Inline SVG, no JS, no framework, no image files where a diagram will do.
- Same palette. The mark, the green and the gold are established now — use them.
- It must work with images disabled and read sensibly on a phone.
- Anything with real data gets a comment in the source saying which command
  produced it, so nobody has to guess later whether a number is real.

## Also

The six hero-card screenshots are going in the repo — replace the drawn
placeholders. They carry their own captions, so don't repeat the caption text
underneath them.

And the current prose stays unless an illustration genuinely replaces it. The
writing is the reason the page doesn't read like a template; the illustrations
are there to stop it reading like a document.

## What I want back first

A plan: which of the six you'd build, in what order, what data each needs, and
which you think aren't worth it. I'd rather have three that are genuinely good
than six that are decoration.
