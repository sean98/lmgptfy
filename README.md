# Let Me GPT That For You

Pick **ChatGPT** or **Claude**, type a question, choose a roast level, and get a shareable
link. Whoever opens the link watches a themed, animated mockup of that AI's chat screen with
your question typing itself into the box — narrated by fake "steps" ("Step 1: Opening the
website you could have opened…") — then gets redirected to the real site with the question
ready to send.

## How it works

- Everything runs client-side as a static site — no backend, no database. The provider,
  question, and roast level are LZ-compressed into a single opaque query param
  (`launch.html?d=...`) so links stay short and the recipient can't read the question in the
  URL before the animation plays. The legacy plain format (`?to=gpt&q=...`) still works.
- `index.html` — pick a provider, type a question, pick a roast level (Gentle / Sassy /
  Nuclear / Custom with your own punchline), generate/copy a link. Recent links are saved to
  `localStorage` so you don't lose them.
- `launch.html` — decodes the link, renders a themed mockup (colors, wordmark, and layout
  inspired by each app's "new chat" screen), plays the typing animation with the roast-level
  step narration, then redirects to the real site.
- `js/providers.js` — single source of truth for each provider's theme, greeting text, and the
  real URL used for the final redirect.
- `js/roasts.js` — the roast levels and their step narration lines.
- `js/lz-string.min.js` — vendored [lz-string](https://github.com/pieroxy/lz-string) 1.5.0
  (MIT), used for the URL-safe payload compression.

## Prefill support (real-world caveat)

- **ChatGPT** (`chatgpt.com/?q=...`) reliably pre-fills the composer.
- **Claude** doesn't reliably support prefill via URL anymore (Anthropic removed
  `claude.ai/new?q=`). The app also copies the question to the clipboard right before
  redirecting, so the user can paste it in one step if it isn't auto-filled.
- **Gemini** was dropped as an option entirely — `gemini.google.com` has no URL prefill at
  all, so the reveal fell flat.

## Running locally

It's a static site — no build step. Either:

- Open `index.html` directly in a browser, or
- Serve it so relative paths and clipboard APIs behave like a normal site:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploying

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3). Just upload the
folder as-is — there's nothing to build.

## Disclaimer

This project is not affiliated with OpenAI, Google, or Anthropic. The themed loading screens are
original mockups built only to power the transition animation; users are always sent to the real,
official site to get their answer.
