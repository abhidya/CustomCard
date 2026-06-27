import type { VisualStylePreset } from "../src/customerWorkflow";

export type StoryPanelId = "front" | "inside-left" | "inside-right" | "back";

export interface StoryProofPanelCopy {
  headline: string;
  body: string;
}

export interface StoryProofAssets {
  front: string;
  insideLeft: string;
  insideRight: string;
  back: string;
  contactSheet: string;
}

export interface StoryThemeProof {
  recipient: string;
  sender: string;
  panels: Record<StoryPanelId, StoryProofPanelCopy>;
  assets: StoryProofAssets;
}

export interface StoryThemeCard {
  id: string;
  title: string;
  category: string;
  occasion: string;
  imageUrl: string;
  relationship: string;
  memoryObject: string;
  emotionalTruth: string;
  artBrief: string;
  avoid: string;
  tag: string;
  templateLabel: string;
  templateDetail: string;
  styleId: VisualStylePreset;
  proof: StoryThemeProof;
}

export const storyThemeCards: StoryThemeCard[] = [
  {
    id: "birthday-candle-stub",
    title: "The candle they kept reusing",
    category: "birthday",
    occasion: "birthday",
    imageUrl: "/generated/theme-inventory/story-birthday-candle-stub.webp",
    relationship: "Birthday card for the sibling whose family saved the same crooked candle for years.",
    memoryObject: "half-melted candle stub, matchbox, cake-plate shadow",
    emotionalTruth: "The joke matters because it proves the years were shared.",
    artBrief: "Warm keepsake still life with the candle treated like evidence, not party decor.",
    avoid: "balloons, cake as the whole idea, party confetti, generic birthday script",
    tag: "private ritual",
    templateLabel: "Candle ritual",
    templateDetail: "Birthday built from the weird object they would recognize.",
    styleId: "botanical",
    proof: proofFor("birthday-candle-stub", {
      recipient: "Nico",
      sender: "Ari",
      panels: {
        front: {
          headline: "For the last candle",
          body: "Same crooked flame. Same table. Somehow, another year of us."
        },
        "inside-left": {
          headline: "You made it a tradition.",
          body: "By the fourth birthday, that candle was barely a candle. Everyone still looked for it because it meant the joke had survived another year."
        },
        "inside-right": {
          headline: "Happy birthday, Nico.",
          body: "I hope this year gives you more of the small ridiculous rituals that make a room feel like family."
        },
        back: {
          headline: "Memory used",
          body: "Half-melted candle stub, matchbox, cake-plate shadow."
        }
      }
    })
  },
  {
    id: "airport-pickup-sign",
    title: "The airport pickup sign",
    category: "friendship",
    occasion: "welcome home",
    imageUrl: "/generated/theme-inventory/story-airport-pickup-sign.webp",
    relationship: "Welcome-home card for the person whose people always meet them with a handmade sign.",
    memoryObject: "blank poster board, suitcase stickers, marker cap, terminal glow",
    emotionalTruth: "Coming back matters because someone still shows up at arrivals.",
    artBrief: "Blue-hour airport collage with a blank sign and luggage details framing the proof.",
    avoid: "airplane icons, tourist postcards, flags, readable airport codes",
    tag: "welcome back",
    templateLabel: "Pickup sign",
    templateDetail: "A reunion card with the homemade-sign detail front and center.",
    styleId: "minimal",
    proof: proofFor("airport-pickup-sign", {
      recipient: "Sam",
      sender: "Mina",
      panels: {
        front: {
          headline: "Arrivals still know your name",
          body: "A blank poster board, one marker cap, and somebody waiting anyway."
        },
        "inside-left": {
          headline: "That sign was never fancy.",
          body: "It was crooked, usually rushed, and impossible to miss. That was the whole promise: when you came through the doors, you did not have to search long."
        },
        "inside-right": {
          headline: "Welcome home, Sam.",
          body: "I hope the next stretch feels lighter because you know there are people who still show up at arrivals."
        },
        back: {
          headline: "Memory used",
          body: "Blank pickup sign, suitcase stickers, marker cap, terminal glow."
        }
      }
    })
  },
  {
    id: "first-payroll-friday",
    title: "First payroll Friday",
    category: "business",
    occasion: "team thank-you",
    imageUrl: "/generated/theme-inventory/story-first-payroll-friday.webp",
    relationship: "Founder thank-you for the first employees after payroll finally cleared without panic.",
    memoryObject: "blank payroll envelope, cold pizza box edge, office plant, desk lamp",
    emotionalTruth: "The milestone is trust, relief, and people staying through uncertainty.",
    artBrief: "Late-night office still life with disciplined dark space and warm lamp proof area.",
    avoid: "money icons, dashboards, handshakes, startup stock imagery",
    tag: "team milestone",
    templateLabel: "Payroll Friday",
    templateDetail: "B2B gratitude with the relief of a real operating milestone.",
    styleId: "minimal",
    proof: proofFor("first-payroll-friday", {
      recipient: "The launch team",
      sender: "Manny",
      panels: {
        front: {
          headline: "Payroll cleared.",
          body: "So did the part where we wondered if this could become real."
        },
        "inside-left": {
          headline: "You stayed through the thin part.",
          body: "The pizza was cold, the plant was half alive, and the envelope on the desk felt bigger than a milestone. It felt like trust becoming visible."
        },
        "inside-right": {
          headline: "Thank you.",
          body: "Not for believing in a pitch. For doing the work before there was proof that the work would hold."
        },
        back: {
          headline: "Memory used",
          body: "Blank payroll envelope, cold pizza edge, office plant, desk lamp."
        }
      }
    })
  },
  {
    id: "trade-show-tape-booth",
    title: "The booth built from tape",
    category: "business",
    occasion: "client thank-you",
    imageUrl: "/generated/theme-inventory/story-trade-show-tape-booth.webp",
    relationship: "Conference follow-up for a client whose improvised booth became the place everyone gathered.",
    memoryObject: "gaffer tape, folded floor plan, blank lanyards, sample tray",
    emotionalTruth: "Scrappy work can become the part everyone remembers.",
    artBrief: "Bright expo-table composition with tape diagonals and a clean center field.",
    avoid: "crowds, conference logos, networking icons, handshakes",
    tag: "event follow-up",
    templateLabel: "Tape booth",
    templateDetail: "A client follow-up about the booth that survived the chaos.",
    styleId: "minimal",
    proof: proofFor("trade-show-tape-booth", {
      recipient: "Jordan",
      sender: "CustomCard",
      panels: {
        front: {
          headline: "The booth held.",
          body: "Gaffer tape, folded plans, and the table everyone somehow found."
        },
        "inside-left": {
          headline: "The polished part came later.",
          body: "What people remembered first was the way your team kept solving the next problem without turning the whole day into a crisis."
        },
        "inside-right": {
          headline: "Thanks for trusting us after the show.",
          body: "We are glad the scrappy version became the start of a better conversation."
        },
        back: {
          headline: "Memory used",
          body: "Gaffer tape, folded floor plan, blank lanyards, sample tray."
        }
      }
    })
  },
  {
    id: "night-class-bus-route",
    title: "The night-class bus route",
    category: "graduation",
    occasion: "graduation",
    imageUrl: "/generated/theme-inventory/story-night-class-bus-route.webp",
    relationship: "Graduation card for someone who earned the degree through late buses and edited drafts.",
    memoryObject: "blank bus transfer, route line, worn backpack, pencil shavings",
    emotionalTruth: "The public win was built from private persistence.",
    artBrief: "Transit-map collage and study-table artifacts with the accomplishment implied, not shouted.",
    avoid: "cap as the whole idea, diploma scrolls, school seals, confetti",
    tag: "earned path",
    templateLabel: "Night route",
    templateDetail: "Graduation framed around the commute and the work.",
    styleId: "minimal",
    proof: proofFor("night-class-bus-route", {
      recipient: "Leah",
      sender: "Kai",
      panels: {
        front: {
          headline: "You took the long route.",
          body: "Late bus. Worn backpack. Degree earned before anyone clapped."
        },
        "inside-left": {
          headline: "The ceremony is the visible part.",
          body: "The real proof was quieter: transfers in your pocket, pencil shavings on the table, and one more draft when sleep would have been easier."
        },
        "inside-right": {
          headline: "Congratulations, Leah.",
          body: "You did not just finish. You kept choosing the next mile until the path finally had your name on it."
        },
        back: {
          headline: "Memory used",
          body: "Blank bus transfer, route line, worn backpack, pencil shavings."
        }
      }
    })
  },
  {
    id: "closing-floor-scratch",
    title: "The closing-day floor scratch",
    category: "congratulations",
    occasion: "new home",
    imageUrl: "/generated/theme-inventory/story-closing-floor-scratch.webp",
    relationship: "Realtor or friend card for buyers who decided the tiny floor scratch made the house theirs.",
    memoryObject: "small floor scratch, house keys, painter tape, paint swatches",
    emotionalTruth: "A flaw can become the first sign a place belongs to you.",
    artBrief: "Sunlit oak-floor still life with the scratch and keys low, leaving a large message field.",
    avoid: "sold signs, house silhouettes, key ribbons, realtor logos",
    tag: "new-home proof",
    templateLabel: "Floor scratch",
    templateDetail: "A new-home card about the imperfection that made it personal.",
    styleId: "photo-note",
    proof: proofFor("closing-floor-scratch", {
      recipient: "Ava and Jules",
      sender: "Nora",
      panels: {
        front: {
          headline: "The scratch stayed.",
          body: "That was the first thing the house gave you."
        },
        "inside-left": {
          headline: "It was not perfect.",
          body: "The keys were new, the tape was still on the wall, and that tiny mark in the floor somehow made the place feel less like a listing."
        },
        "inside-right": {
          headline: "Welcome home.",
          body: "May the next marks be yours: chair legs, suitcase wheels, late dinners, ordinary mornings."
        },
        back: {
          headline: "Memory used",
          body: "Small floor scratch, house keys, painter tape, paint swatches."
        }
      }
    })
  },
  {
    id: "nurse-extra-hair-ties",
    title: "The nurse with extra hair ties",
    category: "thank-you",
    occasion: "thank-you",
    imageUrl: "/generated/theme-inventory/story-nurse-extra-hair-ties.webp",
    relationship: "Thank-you card for the person who always had the tiny thing everyone needed.",
    memoryObject: "scrub-green hair ties, blank badge reel, folded shift notes, pen cap",
    emotionalTruth: "Care often looks like practical preparedness, not grand sentiment.",
    artBrief: "Clean, soft clinical still life with practical objects around an open proof zone.",
    avoid: "red crosses, stethoscope cliches, hospital beds, superhero imagery",
    tag: "practical care",
    templateLabel: "Extra hair ties",
    templateDetail: "A thank-you that notices the small rescue.",
    styleId: "minimal",
    proof: proofFor("nurse-extra-hair-ties", {
      recipient: "Maya",
      sender: "Priya",
      panels: {
        front: {
          headline: "You had the thing.",
          body: "Extra hair ties. Shift notes. Care that arrived before anyone asked."
        },
        "inside-left": {
          headline: "You made hard rooms easier.",
          body: "Not with speeches. With the spare pen, the calm answer, the tiny practical fix that kept somebody from coming undone."
        },
        "inside-right": {
          headline: "Thank you, Maya.",
          body: "For the kind of care that does not announce itself, but everyone remembers once they can breathe again."
        },
        back: {
          headline: "Memory used",
          body: "Scrub-green hair ties, blank badge reel, folded shift notes, pen cap."
        }
      }
    })
  },
  {
    id: "faded-receipt-night",
    title: "The receipt from the night everything changed",
    category: "anniversary",
    occasion: "anniversary",
    imageUrl: "/generated/theme-inventory/story-faded-receipt-night.webp",
    relationship: "Anniversary card built around the ordinary receipt from the night a life turned.",
    memoryObject: "blank faded receipt, matchbook, two glass reflections, table ring",
    emotionalTruth: "The object is ordinary; the meaning is not.",
    artBrief: "Amber restaurant-table still life with a receipt shape treated as private evidence.",
    avoid: "hearts, rings, champagne flutes, roses, scripted love quotes",
    tag: "ordinary evidence",
    templateLabel: "Faded receipt",
    templateDetail: "Anniversary without the usual romance props.",
    styleId: "photo-note",
    proof: proofFor("faded-receipt-night", {
      recipient: "Elena",
      sender: "Marco",
      panels: {
        front: {
          headline: "I kept the receipt.",
          body: "Not because of the total. Because that was the night everything tilted."
        },
        "inside-left": {
          headline: "Nothing looked historic.",
          body: "A table ring. A plain matchbook. Two glasses catching the light. The receipt faded, but somehow the room did not."
        },
        "inside-right": {
          headline: "Happy anniversary.",
          body: "I still love that our story can hide inside something ordinary and become obvious only to us."
        },
        back: {
          headline: "Memory used",
          body: "Blank faded receipt, matchbook, two glass reflections, table ring."
        }
      }
    })
  },
  {
    id: "off-menu-regular-order",
    title: "The off-menu regular order",
    category: "business",
    occasion: "customer thank-you",
    imageUrl: "/generated/theme-inventory/story-off-menu-regular-order.webp",
    relationship: "Small-business thank-you for the regular whose impossible order became part of the place.",
    memoryObject: "blank order ticket, dessert plate, napkin doodle, counter lamp",
    emotionalTruth: "Loyalty is personal when the business remembers the exact ritual.",
    artBrief: "Bright counter still life with a blank ticket and dessert framing a generous center.",
    avoid: "storefront stock photos, punch-card stars, generic restaurant icons, logos",
    tag: "loyalty memory",
    templateLabel: "Off-menu order",
    templateDetail: "Customer appreciation that remembers the regular's ritual.",
    styleId: "botanical",
    proof: proofFor("off-menu-regular-order", {
      recipient: "Dana",
      sender: "The counter crew",
      panels: {
        front: {
          headline: "We know the order.",
          body: "Not because it is easy. Because it is yours."
        },
        "inside-left": {
          headline: "The ticket never told the whole story.",
          body: "Extra sauce, no rush, the same corner if it was open. Somewhere along the way, your impossible order became part of the place."
        },
        "inside-right": {
          headline: "Thanks for being a regular.",
          body: "You helped make the shop feel less like a counter and more like a ritual."
        },
        back: {
          headline: "Memory used",
          body: "Blank order ticket, dessert plate, napkin doodle, counter lamp."
        }
      }
    })
  },
  {
    id: "project-war-room-wall",
    title: "The project war-room wall",
    category: "business",
    occasion: "client launch",
    imageUrl: "/generated/theme-inventory/story-project-war-room-wall.webp",
    relationship: "Client-launch congratulations for the team whose messy wall got the project live.",
    memoryObject: "blank sticky notes, colored tape, marker cap, flow-line shapes",
    emotionalTruth: "The launch mattered because the work was specific, collaborative, and hard.",
    artBrief: "SaaS-meets-stationery paper wall with sticky-note clusters around a clean message field.",
    avoid: "dashboards, stock charts, rocket icons, trophies, generic confetti",
    tag: "client launch",
    templateLabel: "War-room wall",
    templateDetail: "A launch card that honors the work behind the go-live.",
    styleId: "bold-type",
    proof: proofFor("project-war-room-wall", {
      recipient: "Atlas Ops",
      sender: "Manny",
      panels: {
        front: {
          headline: "The wall became a launch.",
          body: "Sticky notes, tape, marker caps, and one hard thing finally live."
        },
        "inside-left": {
          headline: "The clean version hides the work.",
          body: "Before the go-live screen, there was the wall: arrows moved twice, notes rewritten, the same problem circled until it finally opened."
        },
        "inside-right": {
          headline: "Congratulations, Atlas Ops.",
          body: "This launch has fingerprints on it in the best way. Thank you for building it with us."
        },
        back: {
          headline: "Memory used",
          body: "Blank sticky notes, colored tape, marker cap, flow-line shapes."
        }
      }
    })
  }
];

export const storyImageByCategory: Record<string, string> = {
  birthday: imageForStory("birthday-candle-stub"),
  friendship: imageForStory("airport-pickup-sign"),
  graduation: imageForStory("night-class-bus-route"),
  congratulations: imageForStory("closing-floor-scratch"),
  "new home": imageForStory("closing-floor-scratch"),
  "thank-you": imageForStory("nurse-extra-hair-ties"),
  "get-well": imageForStory("nurse-extra-hair-ties"),
  anniversary: imageForStory("faded-receipt-night"),
  wedding: imageForStory("faded-receipt-night"),
  business: imageForStory("first-payroll-friday"),
  "business customer anniversary": imageForStory("off-menu-regular-order"),
  custom: imageForStory("project-war-room-wall")
};

function imageForStory(id: string): string {
  const story = storyThemeCards.find((candidate) => candidate.id === id);
  if (!story) throw new Error(`Missing story theme image for ${id}`);
  return story.imageUrl;
}

function proofFor(
  id: string,
  proof: Omit<StoryThemeProof, "assets">
): StoryThemeProof {
  return {
    ...proof,
    assets: {
      front: storyProofAsset(id, "front"),
      insideLeft: storyProofAsset(id, "inside-left"),
      insideRight: storyProofAsset(id, "inside-right"),
      back: storyProofAsset(id, "back"),
      contactSheet: storyProofAsset(id, "contact-sheet")
    }
  };
}

function storyProofAsset(id: string, asset: StoryPanelId | "contact-sheet"): string {
  return `/generated/story-proofs/${id}/${asset}.webp`;
}
