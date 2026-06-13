# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: DeepAI text2img (text2img)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## User Input

- Sender: Jordan
- Recipient: Eli
- Relationship: friend
- Brief: A quiet card for Eli after losing his father. Mention that I am here for the practical stuff too: meals, rides, calls, silence. No cliches.
- Must include: Eli, father, meals, rides, silence
- Must avoid: religious claims, platitudes, bright celebration, overdesigned ornament

## Rubric

- Product quality score /100: 8
- Prompt/pipeline contract score /100: 76
- Tier: F visible product; rough prompt experiment only
- Dimension scores:
  - Prompt adherence and panel contract /15: 14
  - Occasion and user-story fit /15: 9
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 2
  - Theme coherence across panels /10: 5
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 10
  - Commercial usefulness /5: 2
  - Originality and taste /5: 0
- Raw dimension sum before cap: 63
- Hard failure caps triggered: cap at 10 because user/customer calibrated this class of visible artifact around 5/100 and the rendered result supports the complaint; also front lacks a commercial hook and inside-left has text/art collision.
- Best panel: inside-right; most readable and least cluttered.
- Worst panel: inside-left; text sits over desert/hill art and loses contrast.
- Blocking failures: weak cover concept, inside-left collision, generic bowl/branch motifs, low premium taste, uneven panel coherence.
- Smallest prompt/config fix: stronger text-field enforcement helps readability, but the image model still needs a different art direction or replacement for saleable output.
- Prompt-side or model-capability-side: mixed, but mainly image model capability/art-direction side.
- Estimated cost per 4-panel card: live DeepAI image calls used; exact unit cost not recomputed in this grading pass.

## Notes

- Auto-checks show four panels and required terms, but this run recorded `noProviderFailure: false` because the deterministic text lane was still marked as fallback in the run metadata.
- Product grade stays below the SVG control because DeepAI introduces real art/text collision while still failing premium visual quality.
