// lib/bingo.ts

export const BINGO_ITEMS: string[] = [
  "Joe’s Grows",
  "Harvest Heroes",
  "Sponsor Shoutout",
  "Growmie Advice",
  "Send Pics",
  "Winner Winner",
  "New Genetics",
  "Seed Pop",
  "Pray for Yield",
  "Smoke Test",

  "pH Check",
  "pH Down",
  "pH Up",
  "EC Check",
  "PPM Check",
  "Top Off",
  "Reservoir Change",
  "Water Temp Check",
  "Airstone Check",
  "Root Check",

  "VPD Check",
  "Leaf Temp Check",
  "Canopy Temp Check",
  "Humidity Spike",
  "Heat Stress",
  "Cold Snap",
  "Lights On",
  "Lights Off",
  "Fan Speed Adjust",
  "Exhaust Check",

  "Defoliation",
  "Lollipop",
  "Stretch Week",
  "Pre-Flower",
  "Training Day",
  "Topping",
  "FIM",
  "Supercrop",
  "Trellis Net",
  "Support Stakes",

  "Nute Burn",
  "Lockout",
  "Cal-Mag",
  "Yellowing Leaves",
  "Clawing Leaves",
  "Spots on Leaves",
  "Wilting",
  "Overwatered",
  "Underwatered",
  "Herm Watch",

  "IPM Spray",
  "Sticky Traps",
  "Fungus Gnats",
  "Spider Mites",
  "Thrips",
  "Aphids",
  "Neem Smell",
  "Powdery Mildew",
  "Bud Rot Watch",
  "Sanitize Tools",

  "Trichomes",
  "Amber Check",
  "Cloudy Check",
  "Funky Terps",
  "Frosty Buds",
  "Foxtails",
  "Late Flower Fade",
  "Flush Time",
  "Dry Back",
  "Calibrate Pen",

  "Harvest Day",
  "Wet Trim",
  "Dry Trim",
  "Hang Dry",
  "Dry Room Check",
  "Trim Jail",
  "Sticky Scissors",
  "Jar Time",
  "Burp Jars",
  "Cure Check",

  "Photo Update",
  "Time-Lapse",
  "Grow Shop Run",
  "Mix Nutrients",
  "Add Silica",
  "Add PK Booster",
  "Clean Res",
  "Change Filter",
  "Check Runoff",
  "Rotate Plants",
];

export type BingoCard = {
  id: string;
  grid: string[][];
};

export type BingoPack = {
  cards: BingoCard[];
  itemsUsed: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqByLower(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const v = (x ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

function makeId(prefix = "CARD") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function makeGridFromItems(items24: string[], centerText: string): string[][] {
  const grid: string[][] = [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", centerText, "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ];

  let idx = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) continue;
      grid[r][c] = items24[idx++];
    }
  }
  return grid;
}

function gridKey(grid: string[][]): string {
  return grid.map((row) => row.join("|")).join("~");
}

export function createBingoPack(items: string[], qty: number): BingoPack {
  const clean = uniqByLower(items);
  if (clean.length < 24) throw new Error("Need at least 24 unique items.");

  const count = Math.max(1, Math.min(500, Math.floor(qty || 1)));
  const cards: BingoCard[] = [];

  const seen = new Set<string>();
  const maxAttemptsPerCard = 200;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let pushed = false;

    while (attempts < maxAttemptsPerCard) {
      attempts++;
      const pick = shuffle(clean).slice(0, 24);
      const grid = makeGridFromItems(pick, "Joe’s Grows");
      const key = gridKey(grid);

      if (!seen.has(key)) {
        seen.add(key);
        cards.push({ id: makeId("CARD"), grid });
        pushed = true;
        break;
      }
    }

    if (!pushed) {
      const pick = shuffle(clean).slice(0, 24);
      cards.push({ id: makeId("CARD"), grid: makeGridFromItems(pick, "Joe’s Grows") });
    }
  }

  return { cards, itemsUsed: clean };
}
