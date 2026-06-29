# vault42 — landing page

Marketing landing page for **vault42**, served at <https://vault.42-v.com>.

vault42 is a self-hosted identity authority in a single Go binary — it issues
session tokens, signs them RS256, and publishes keys at a JWKS endpoint, so you
own your root of trust. The product itself lives at
<https://github.com/42-v/vault42>.

## Files

- `index.html` — the self-contained landing page
- `styles.css` — design tokens + components (AMOLED black + `#00FF42` phosphor)
- `app.js` — minified runtime (WebGL noise-gas hero, comparison + audit-ledger
  sections, contact form, `prefers-reduced-motion` guards)

## Preview

Serve it over HTTP — a plain `file://` open works, but browsers cache assets
aggressively, so use a server while iterating:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

It runs fully client-side; the page needs no backend (the contact form posts to
a separate Cloudflare Worker).

## Production

Static-host the tree at `https://vault.42-v.com` (nginx, Caddy, object storage +
CDN, Pages, …):

- correct `Content-Type` for `.js` / `.css`, `index.html` as the entry point
- add CSP / HSTS and related headers at the edge
- bump the `v0.8.0` marker on release

## Accessibility

- Interactive targets ≥ 44px, full keyboard nav + visible focus rings
- `prefers-reduced-motion` disables the animation loops and shows static states
- High-contrast green-on-black

## License

This landing-page source is licensed under **Apache-2.0** — see [`LICENSE`](LICENSE),
with trademark terms in [`NOTICE`](NOTICE). (The vault42 product itself is MIT,
per its own repository.)
