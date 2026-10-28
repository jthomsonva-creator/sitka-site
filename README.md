# sitkastrings.com

The landing page and privacy policy for **Sitka: Tuner & Songwriting**,
served by GitHub Pages at <https://sitkastrings.com>.

Static HTML and one stylesheet. No build step, no dependencies, no
generator — edit a file, commit, and it is live in a minute or two.

## Layout

    index.html          the landing page
    privacy/index.html  the privacy policy, served at /privacy/
    404.html            GitHub Pages serves this for unknown paths
    assets/site.css     the shared palette and base type
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

Everything lives in `:root` in `assets/site.css`. The green is
`#0D3D32` — sampled from the app's own adaptive icon background, so the
web page, the launcher icon and the splash screen are the same colour on
purpose. Change it in one place and both pages follow.

## Before launch

- Replace `REPLACE-WITH-CONTACT-EMAIL` in `privacy/index.html`.
- Swap "Coming soon to Google Play" in `index.html` for the real badge
  and store link once the listing is live.
