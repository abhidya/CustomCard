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

Use `--image-adapter browser-svg-renderer` to capture deterministic flat SVG
artwork instead of live provider images when the RCA focus is text-free,
mockup-free panel composition. Use the default `cloudflare-workers-ai-image`
adapter when validating Workers AI prompt adherence and R2 persistence.

Do not copy competitor images into generated outputs. Keep competitor references
in `../competitor-card-examples/` and generate all CustomCard art, copy, layout,
and screenshots from our own prompts and product flows.
