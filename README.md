# sitkastrings.com

The landing page and privacy policy for **Sitka: Tuner & Songwriting**,
served by GitHub Pages at <https://sitkastrings.com>.

Static HTML and one stylesheet. No build step to deploy and no
dependencies — edit a file, commit, and it is live in a minute or two.

The illustrations are the one exception, and they are generated *before*
commit, not at deploy: `tools/build-visuals.mjs` imports the Sitka app's
own modules — by default `origin/feature/pro` of the main repo
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

The page carries placeholders, not screenshots: the hero's screen
recording (the owner's own footage) and three phone shots, to come from
the vc50 store set (`store/play/phone-v2` in the app repo, never vc49).
The vc27 screens in `assets/screen-*.webp` are no longer on the page. `assets/og.png` (1200x630) is
the link preview. Give every `<img>` its real `width` and `height` so the
page does not shift as images load.
