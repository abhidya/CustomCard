# Generated Card Comparisons

Store CustomCard-generated benchmark outputs here when comparing against
`../competitor-card-examples/`.

Recommended file set per benchmark:

- `<category>-customcard-export.png`
- `<category>-customcard-editor-desktop.png`
- `<category>-customcard-editor-mobile.png`
- `<category>-scorecard.md`

For the live benchmark harness, run:

```bash
npm run card:benchmark -- --live
```

Use `--image-adapter cloudflare-workers-ai-image` for the preferred live
Cloudflare image path. Use `--image-adapter browser-svg-renderer` when the RCA
focus is deterministic flat SVG artwork, no-network debugging, or isolating R2
persistence from provider-image behavior.

Do not copy competitor images into generated outputs. Keep competitor references
in `../competitor-card-examples/` and generate all CustomCard art, copy, layout,
and screenshots from our own prompts and product flows.
