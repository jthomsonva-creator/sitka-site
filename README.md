# sitkastrings.com

The landing page and privacy policy for **Sitka: Tuner & Songwriting**,
served by GitHub Pages at <https://sitkastrings.com>.

Static HTML and one stylesheet. No build step to deploy and no
dependencies — edit a file, commit, and it is live in a minute or two.

The illustrations are the one exception, and they are generated *before*
commit, not at deploy: `tools/build-visuals.mjs` imports the Sitka app's
own modules — by default `origin/release/46` (what 1.46 ships) of the main repo
(`../guitar-tuner`), read with `git archive` so no branch or working tree
is touched — and rewrites the blocks in
`index.html` between `<!-- GENERATED:name -->` markers. Nothing in a
figure is drawn by hand. Needs Node 22.6+ (it strips TypeScript):

    git -C ../guitar-tuner fetch origin
    node --experimental-strip-types tools/build-visuals.mjs                # --ref <ref>, or --app <checkout>
    node --experimental-strip-types tools/build-visuals.mjs --check   # exit 1 if stale
    node tools/contrast.mjs                                            # every colour pair vs WCAG AA

The script fails if a hand-written tuning count on the page differs from
the app's library, or if the ranker no longer returns the shapes the
words in "The details" were written about.

## Layout

    index.html          the landing page
    privacy/index.html  the privacy policy, served at /privacy/
    404.html            GitHub Pages serves this for unknown paths
    assets/site.css     the shared palette and base type (the app's theme.ts)
    tools/              build-visuals.mjs and contrast.mjs (authoring only)
    assets/mark.png     the tuning-fork mark (adaptive icon foreground)
    assets/icon.png     1024x1024 app icon, used for link previews
    assets/favicon.png  48x48
    CNAME               the custom domain — do not delete, see below
    .nojekyll           skip Jekyll; this is plain HTML

## The privacy policy is a Play Store requirement

Google Play requires a reachable privacy policy URL for any app that
requests a permission, and Sitka requests the microphone. The listing
points at `https://sitkastrings.com/privacy`, so **that path has to keep
working** — if the file moves, the store listing breaks.

Its claims are not marketing copy. Each one was checked against the app:
`allowBackup="false"`, `RECORD_AUDIO` the one runtime permission, and
Google Play (billing and the in-app review) the only network peer. If the
app changes, the policy changes with it.

## `CNAME` is load-bearing

The file contains `sitkastrings.com` and is what binds the custom domain
to this repository. GitHub rewrites it when you change the domain in
Settings → Pages. **Deleting it drops the site back to
`<user>.github.io`,** which breaks the Play listing's policy URL.

## Editing the colours

Everything lives in `:root` in `assets/site.css`, and every value is a
token from the app's `src/theme.ts`: the ground, copper for the frame and
the main action, cream ink, patina. The deep green `#0D3D32` (the app's
adaptive icon background) appears only behind the app icon. The SVG
figures read their colours from the app at build time. Run
`node tools/contrast.mjs` after changing any of it.

## Images

The hero is the Play v2 hero scene (`store/play/make-feature-graphic-v2-hero.mjs`
on `store/play-v2` in the app repo) rendered **without** its type, so the
headline and tagline stay live text: `assets/hero/hero-2400.webp` (and
`hero-1440`) is the script's 2400x1000 web crop, `hero-phone-800.webp` an
800x1000 crop of it centred on the phone, served below 860px. Never use the
store's `feature-graphic-v2-hero-web.png` itself: its tagline is baked in.

The eight phone shots, `assets/shots/v3-<n>-<name>.webp` (600x1228), are the
Play v2 raw captures (Sitka 1.46.0 (51) from Play, Pixel 8), cropped 1080x2210
from y 120 like the framed store set, and framed by the page's own `.shot`
style, one or two per feature. The vc27 screens in `assets/screen-*.webp` are
no longer on the page. `assets/og.png` (1200x630) is the link preview. Give
every `<img>` its real `width` and `height` so the page does not shift as
images load.
