import type { VisualStylePreset } from "../src/customerWorkflow";

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
    styleId: "botanical"
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
    styleId: "minimal"
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
    styleId: "minimal"
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
    styleId: "minimal"
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
    styleId: "minimal"
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
    styleId: "photo-note"
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
    styleId: "minimal"
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
    styleId: "photo-note"
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
    styleId: "botanical"
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
    styleId: "bold-type"
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
