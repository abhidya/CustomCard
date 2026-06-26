# QA Scorecard: botanical-birthday

- Status: pass
- Score: 100/100
- Checks: 24/24
- Pass score: 80
- Critical failures: none
- Reference bar: Elegant botanical stationery: side/corner foliage, quiet cream field, personal birthday copy, and no dense confetti or generic greeting-card filler.

| Result | Gate | Category | Check | Evidence |
|---|---|---|---|---|
| Pass | Critical | render | All four folded-card panels rendered. | 4/4 panels |
| Pass | Critical | copy | front has headline and body copy. | Happy Birthday Sara / For green paths, good coffee, and tiny morning wonders. |
| Pass | Critical | prompt | front has an image prompt and generated asset. | Premium vertical greeting-card artwork layer for the front panel. botanical watercolor stationery, fern fronds, tiny trail flowers, soft morning light. corner border, generous bla… |
| Pass | Critical | copy | inside-left has headline and body copy. | Coffee And Green Trails / I hope the day opens gently, with coffee, green trails, and little things worth noticing. |
| Pass | Critical | prompt | inside-left has an image prompt and generated asset. | Premium vertical greeting-card artwork layer for the inside-left panel. botanical watercolor stationery, fern fronds, tiny trail flowers, soft morning light. corner border, genero… |
| Pass | Critical | copy | inside-right has headline and body copy. | More Hikes, More Laughter / Wishing you more hikes, more laughter, and more quiet joy than the year can hold. |
| Pass | Critical | prompt | inside-right has an image prompt and generated asset. | Premium vertical greeting-card artwork layer for the inside-right panel. botanical watercolor stationery, fern fronds, tiny trail flowers, soft morning light. corner border, gener… |
| Pass | Critical | copy | back has headline and body copy. | Green Paths And Coffee / Made for a birthday full of green paths, good coffee, and tiny bright things. |
| Pass | Critical | prompt | back has an image prompt and generated asset. | Premium vertical greeting-card artwork layer for the back panel. botanical watercolor stationery, fern fronds, tiny trail flowers, soft morning light. corner border, generous blan… |
| Pass | Standard | copy | At least 3 distinct panel headlines. | 4 distinct headlines |
| Pass | Critical | copy | front copy includes target-specific anchors. | matched: Birthday, Sara |
| Pass | Critical | copy | inside-left copy includes target-specific anchors. | matched: coffee, green trails |
| Pass | Critical | copy | inside-right copy includes target-specific anchors. | matched: hikes, laughter |
| Pass | Critical | copy | back copy includes target-specific anchors. | matched: green paths, coffee |
| Pass | Critical | copy | Copy avoids forbidden pattern: A card made with care | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: For this moment | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: From the heart | not found |
| Pass | Critical | prompt | Image prompts include target term: botanical | found |
| Pass | Critical | prompt | Image prompts include target term: corner border | found |
| Pass | Critical | prompt | Image prompts include target term: generous blank field | found |
| Pass | Critical | prompt | Image prompts include target term: text-safe | found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: dense confetti | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: recipient['’]?s? name | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: main message | not found |
