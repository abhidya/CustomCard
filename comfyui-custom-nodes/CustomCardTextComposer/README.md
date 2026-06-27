# CustomCard Text Composer

ComfyUI custom node for production greeting-card typography.

`CustomCardTextComposer` takes an `IMAGE` from the art workflow, exact headline
and body strings from the app, and explicit pixel safe boxes. It wraps text,
shrinks fonts until content fits, resolves pinned fonts from `fonts/` or the
Windows fonts directory, and returns a final Comfy `IMAGE`.

Use this instead of asking the diffusion model to draw body copy. The model
should render text-safe artwork only; this node owns exact spelling, wrapping,
and final print pixels.

The node can also draw deterministic safe fields before typography:

- `box` draws a plain rounded field.
- `panel` draws the same field with a subtle outer and inner edge, so broad
  Comfy-side text-safe regions read like intentional card stationery instead
  of accidental flat rectangles.
- `text-hug` on headline/body backgrounds hugs the fitted copy while the
  broader artwork guard keeps busy model output out of the reading area.

Install with:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/install-comfy-customcard-text-node.ps1 -ComfyRoot C:\path\to\ComfyUI
```

Then restart ComfyUI and use
`comfyui-workflows/customcard-production-text-overlay.json`.
