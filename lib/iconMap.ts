// lib/iconMap.ts
// Keys MUST exactly match the bingo square text (case, spaces, punctuation)
// Missing icons are OK – squares will fall back to text-only

export const ICON_MAP: Record<string, string> = {
  // ───────── STRUCTURE / TRAINING ─────────
  "Trellis net": "/icons/trellis-net.png",
  "Lollipop": "/icons/lollipop.png",
  "Defoliate": "/icons/defoliate.png",
  "Stretch week": "/icons/stretch-week.png",
  "Dryback": "/icons/dryback.png",

  // ───────── ENVIRONMENT / METRICS ─────────
  "Runoff EC": "/icons/runoff-ec.png",
  "VPD off": "/icons/vpd-off.png", // gauge / crossed meter
  "Heat stress": "/icons/heat-stress.png",
  "Light burn": "/icons/light-burn.png",
  "Herm watch": "/icons/eye-watch.png",

  // ───────── FLOWER / MATURITY ─────────
  "Foxtails": "/icons/foxtails.png",
  "Amber trichomes": "/icons/trichomes-amber.png",
  "Cloudy trichomes": "/icons/trichomes-cloudy.png",
  "Clear trichomes": "/icons/trichomes-clear.png",
  "Flush debate": "/icons/flush-debate.png",
  "Fire genetics": "/icons/fire-genetics.png",
  "Stunted growth": "/icons/stunted-growth.png",

  // ───────── NUTRIENTS / CHEMISTRY ─────────
  "Cal-Mag": "/icons/cal-mag.png",
  "pH swing": "/icons/ph-swing.png", // pendulum icon
  "pH up": "/icons/ph-up.png",       // ↑ arrow + pH
  "pH down": "/icons/ph-down.png",   // ↓ arrow + pH
  "EC up": "/icons/ec-up.png",       // ↑ arrow + EC
  "EC down": "/icons/ec-down.png",   // ↓ arrow + EC
  "Overwatered": "/icons/overwatered.png",
  "Underwatered": "/icons/underwatered.png",

  // ───────── DISEASE / PESTS ─────────
  "Powdery mildew": "/icons/powdery-mildew.png",
  "Fungus gnats": "/icons/fungus-gnats.png",
  "Bud rot": "/icons/bud-rot.png",
  "Nute lockout": "/icons/nute-lockout.png",

  // ───────── LEAF SYMPTOMS ─────────
  "Photos": "/icons/photos.png",
  "Taco leaves": "/icons/taco-leaves.png",
  "Leaf claw": "/icons/leaf-claw.png",
  "Tip burn": "/icons/tip-burn.png",
  "Nitro tox": "/icons/nitro-tox.png",
  "Chlorosis": "/icons/chlorosis.png",
  "Sugar leaf curl": "/icons/sugar-leaf-curl.png",

  // ───────── DEFICIENCIES ─────────
  "Cal Def": "/icons/def-calcium.png",
  "Mag Def": "/icons/def-magnesium.png",
  "Iron Def": "/icons/def-iron.png",
  "Potassium Def": "/icons/def-potassium.png",
  "Phosphorus Def": "/icons/def-phosphorus.png",
  "Sulfur Def": "/icons/def-sulfur.png",
  "Zinc Def": "/icons/def-zinc.png",
  "Manganese Def": "/icons/def-manganese.png",
  "Boron Def": "/icons/def-boron.png",
  "Copper Def": "/icons/def-copper.png",
  "Molybdenum Def": "/icons/def-molybdenum.png",

  // ───────── ROOT ZONE ─────────
  "Root rot": "/icons/root-rot.png",
  "Slime roots": "/icons/slime-roots.png",
  "Brown roots": "/icons/brown-roots.png",
  "White roots": "/icons/white-roots.png",
  "Pythium": "/icons/pythium.png",
  "Algae bloom": "/icons/algae-bloom.png",
  "Biofilm": "/icons/biofilm.png",
  "Salt buildup": "/icons/salt-buildup.png",

  // ───────── EQUIPMENT / FAILURES ─────────
  "Light leak": "/icons/light-leak.png",
  "Timer fail": "/icons/timer-fail.png",
  "Pump fail": "/icons/pump-fail.png",
  "Air pump fail": "/icons/air-pump-fail.png",
  "Airstone clogged": "/icons/airstone-clogged.png",
  "Low oxygen": "/icons/low-oxygen.png",
  "Water temp high": "/icons/water-temp-high.png",
  "Water temp low": "/icons/water-temp-low.png",
  "Drain clog": "/icons/drain-clog.png",
  "Overflow scare": "/icons/overflow-scare.png",

  // ───────── RES / SYSTEM ─────────
  "Res top-off": "/icons/res-topoff.png",
  "Res change": "/icons/res-change.png",
  "Water change": "/icons/water-change.png",
  "Hydro": "/icons/hydro.png",
  "Soil": "/icons/soil.png",
  "Aircube": "/icons/aircube.png",
  "Bubble bucket": "/icons/bubble-bucket.png",

  // ───────── ADDITIVES / IPM ─────────
  "Beneficials": "/icons/beneficials.png",
  "H2O2 debate": "/icons/h2o2-debate.png",
  "Silica added": "/icons/silica-added.png",
  "PK boost": "/icons/pk-boost.png",
  "KoolBloom week": "/icons/koolbloom-week.png",

  // ───────── GROW PHASE ─────────
  "Transition": "/icons/transition.png",
  "Week 3 frost": "/icons/week-3-frost.png",
  "Week 6 swell": "/icons/week-6-swell.png",
  "Flower fade": "/icons/flower-fade.png",
  "Sugar leaves": "/icons/sugar-leaves.png",
  "Leaf strip": "/icons/leaf-strip.png",
  "LST": "/icons/lst.png",
  "Supercrop": "/icons/supercrop.png",
  "SCROG": "/icons/scrog.png",
  "Stake support": "/icons/stake-support.png",
  "Bud stacking": "/icons/bud-stacking.png",
  "Popcorn buds": "/icons/popcorn-buds.png",
  "Larf cleanup": "/icons/larf-cleanup.png",
  "Calyx swell": "/icons/calyx-swell.png",
  "Pistils orange": "/icons/pistils-orange.png",
  "Pistils white": "/icons/pistils-white.png",

  // ───────── INSPECTION / HARVEST ─────────
  "Loupe check": "/icons/loupe-check.png",
  "Scope pics": "/icons/scope-pics.png",
  "Bananas spotted": "/icons/bananas.png",
  "Nanner panic": "/icons/nanner-panic.png",
  "Herm confirmed": "/icons/herm-confirmed.png",
  "Seed found": "/icons/seed-found.png",

  // ───────── POST HARVEST ─────────
  "Bud wash": "/icons/bud-wash.png",
  "Dry trim": "/icons/dry-trim.png",
  "Wet trim": "/icons/wet-trim.png",
  "Jar burp": "/icons/jar-burp.png",
  "Grove bags": "/icons/grove-bags.png",
  "Hay smell": "/icons/hay-smell.png",
  "Terp pop": "/icons/terp-pop.png",
  "Odor control": "/icons/odor-control.png",
  "Carbon swap": "/icons/carbon-swap.png",

  // ───────── IPM ─────────
  "IPM spray": "/icons/ipm-spray.png",
  "Neem debate": "/icons/neem-debate.png",
  "Spinosad talk": "/icons/spinosad-talk.png",
  "Predator mites": "/icons/predator-mites.png",
  "Ladybugs released": "/icons/ladybugs.png",
};
