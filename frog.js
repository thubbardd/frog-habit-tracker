/**
 * (C) frog-thug.js — drop-in replacement for 01 Source/frog.js.
 *
 * Same public API (getStage, getStageName, getFrogSVG, getMotivationalMessage,
 * renderFrog) and the same stage thresholds / messages / CSS class names.
 * The art is new: one Groyper pose redrawn as SVG, with the gear and the
 * pose changing by stage. Stage 5 is the top tier: hands steepled at the chin,
 * thug life shades, fat gold chain with a $ pendant, iced-out watch.
 *
 * All animation is CSS inside each SVG (class prefix "gt-"), so no extra
 * stylesheet is needed. prefers-reduced-motion switches it all off.
 */

// ---------------------------------------------------------------------------
// Stage thresholds (unchanged from frog.js)
// ---------------------------------------------------------------------------

const STAGE_THRESHOLDS = [
  { min: 0, max: 19, stage: 1, name: 'Defeated' },
  { min: 20, max: 39, stage: 2, name: 'Meh' },
  { min: 40, max: 59, stage: 3, name: 'Okay' },
  { min: 60, max: 79, stage: 4, name: 'Strong' },
  { min: 80, max: 100, stage: 5, name: 'Ascended' },
];

// ---------------------------------------------------------------------------
// Motivational messages (unchanged from frog.js)
// ---------------------------------------------------------------------------

const MESSAGES = {
  1: [
    'LOCK IN!!!!',
    'WHY THE GENERATIONAL FUMBLE!?!',
    'THIS IS YOUR VILLAIN ORIGIN STORY!!!!',
    'EVEN THE FROG IS DISAPPOINTED!!!!',
    'YOU FELL OFF SO HARD!!!!',
    'ROCK BOTTOM IS NOT A LIFESTYLE!!!!',
  ],
  2: [
    'DO BETTER!!!!',
    'THIS AIN\'T IT CHIEF!!!!',
    'YOU\'RE BETTER THAN THIS!!!!',
    'MEDIOCRITY IS A CHOICE!!!!',
    'THE GRIND DOESN\'T CARE ABOUT YOUR FEELINGS!!!!',
    'WAKE UP!!!!',
  ],
  3: [
    'WE ARE SO BACK!!!!',
    'HALFWAY THERE KEEP PUSHING!!!!',
    'NOT BAD BUT NOT GREAT!!!!',
    'THE COMEBACK IS LOADING!!!!',
    'MOMENTUM IS BUILDING!!!!',
    'ALMOST RESPECTABLE!!!!',
  ],
  4: [
    'YOU ARE HIM!!!!',
    'BUILT DIFFERENT!!!!',
    'SIGMA GRINDSET!!!!',
    'MAIN CHARACTER ENERGY!!!!',
    'NO DAYS OFF!!!!',
    'THE SAUCE IS STRONG!!!!',
  ],
  5: [
    'WITNESS GREATNESS!!!!',
    'ABSOLUTELY GOATED!!!!',
    'UNSTOPPABLE!!!!',
    'THE FROG BOWS TO YOU!!!!',
    'GENERATIONAL TALENT!!!!',
    'YOU HAVE ASCENDED!!!!',
  ],
};

// ---------------------------------------------------------------------------
// Art. One frog, built from layers, 200x200 viewBox.
// Frog sits side-on facing left, big round body, head up top-left,
// wide orange mouth, heavy lids, one foot kicked out bottom right.
// ---------------------------------------------------------------------------

const INK = '#23400f'; // outline

// Per-stage look. Anything not listed here is not drawn at that stage.
const LOOKS = {
  1: { // Defeated: slumped, grey-green, nothing on, rained on
    skin: '#7f9a6e', skinDark: '#667f58', skinLight: '#93ac84',
    lids: 'shut', mouth: 'frown', hands: 'limp', posture: 'slump',
    chain: null, watch: null, shades: null,
    fx: ['rain', 'tears'],
  },
  2: { // Meh: bored, hands in lap, sweating, still nothing on
    skin: '#6f9a45', skinDark: '#587f35', skinLight: '#86b05a',
    lids: 'half', mouth: 'flat', hands: 'lap', posture: 'lean',
    chain: null, watch: null, shades: null,
    fx: ['sweat'],
  },
  3: { // Okay: upright, first smirk, one cheap silver chain
    skin: '#6aa23c', skinDark: '#548a2c', skinLight: '#84bf55',
    lids: 'smug', mouth: 'smirk', hands: 'clasp', posture: 'tall',
    chain: 'silver', watch: null, shades: null,
    fx: [],
  },
  4: { // Strong: arms crossed, gold chain, gold watch, shades up on the forehead
    skin: '#5fae35', skinDark: '#4a9528', skinLight: '#7acb4c',
    lids: 'smug', mouth: 'smirk', hands: 'crossed', posture: 'tall',
    chain: 'gold', watch: 'gold', shades: 'up',
    fx: ['glow'],
  },
  5: { // Ascended: the steeple. Full kit.
    skin: '#55b82e', skinDark: '#3f9e22', skinLight: '#74d546',
    lids: 'shades', mouth: 'bigsmirk', hands: 'steeple', posture: 'tall',
    chain: 'fat', watch: 'iced', shades: 'on',
    fx: ['glow', 'sparkles'],
  },
};

const STYLE = `<style>
  .gt-body{transform-origin:100px 192px;animation:gt-breathe 3.4s ease-in-out infinite}
  .gt-slump .gt-body{animation-duration:5.5s}
  .gt-chain{transform-origin:100px 96px;animation:gt-swing 3.8s ease-in-out infinite}
  .gt-rub{animation:gt-rub 1.7s ease-in-out infinite}
  .gt-blink{transform-origin:50% 0;transform-box:fill-box;transform:scaleY(0);animation:gt-blink 5.5s infinite}
  .gt-glint{animation:gt-glint 3.6s ease-in-out infinite}
  .gt-shine{animation:gt-shine 2.2s ease-in-out infinite}
  .gt-glow{transform-origin:100px 110px;animation:gt-glow 3s ease-in-out infinite}
  .gt-spark{transform-box:fill-box;transform-origin:center;animation:gt-twinkle 2.4s ease-in-out infinite}
  .gt-spark.b{animation-delay:.6s}.gt-spark.c{animation-delay:1.2s}.gt-spark.d{animation-delay:1.8s}
  .gt-rain line{animation:gt-rain 1s linear infinite}
  .gt-rain line:nth-child(2n){animation-delay:.35s}.gt-rain line:nth-child(3n){animation-delay:.7s}
  .gt-tear{animation:gt-tear 2.2s ease-in infinite}
  .gt-tear.b{animation-delay:1.1s}
  .gt-sweat{animation:gt-sweat 2.6s ease-in infinite}
  @keyframes gt-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,1.028)}}
  @keyframes gt-swing{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}}
  @keyframes gt-rub{0%,100%{transform:translate(0,0)}25%{transform:translate(-1.6px,1px)}75%{transform:translate(1.6px,-1px)}}
  @keyframes gt-blink{0%,93%,100%{transform:scaleY(0)}95.5%{transform:scaleY(1)}}
  @keyframes gt-glint{0%,55%{transform:translateX(-26px);opacity:0}62%{opacity:.95}80%{opacity:.95}88%,100%{transform:translateX(60px);opacity:0}}
  @keyframes gt-shine{0%,100%{opacity:.35}50%{opacity:1}}
  @keyframes gt-glow{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
  @keyframes gt-twinkle{0%,100%{opacity:.15;transform:scale(.5)}50%{opacity:1;transform:scale(1.15)}}
  @keyframes gt-rain{0%{transform:translateY(-6px);opacity:0}20%{opacity:.8}100%{transform:translateY(34px);opacity:0}}
  @keyframes gt-tear{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(26px);opacity:0}}
  @keyframes gt-sweat{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(22px);opacity:0}}
  @media (prefers-reduced-motion:reduce){.gt-body,.gt-chain,.gt-rub,.gt-blink,.gt-glint,.gt-shine,.gt-glow,.gt-spark,.gt-rain line,.gt-tear,.gt-sweat{animation:none!important}}
</style>`;

// --- pieces ----------------------------------------------------------------

function fxBack(look, id) {
  let s = '';
  if (look.fx.includes('glow')) {
    const a = look.shades === 'on' ? 0.55 : 0.32;
    s += `<g class="gt-glow"><ellipse cx="100" cy="112" rx="98" ry="92" fill="url(#${id}glow)" opacity="${a}"/></g>`;
  }
  if (look.fx.includes('rain')) {
    s += `<g opacity=".85">
      <ellipse cx="100" cy="24" rx="34" ry="13" fill="#7f8da0"/><ellipse cx="78" cy="29" rx="22" ry="11" fill="#7f8da0"/>
      <ellipse cx="124" cy="29" rx="22" ry="11" fill="#7f8da0"/><ellipse cx="100" cy="31" rx="40" ry="10" fill="#6c7a8d"/>
    </g>
    <g class="gt-rain" stroke="#6f93b8" stroke-width="1.6" stroke-linecap="round">
      <line x1="70" y1="40" x2="68" y2="48"/><line x1="82" y1="42" x2="80" y2="51"/><line x1="94" y1="40" x2="92" y2="48"/>
      <line x1="106" y1="42" x2="104" y2="51"/><line x1="118" y1="40" x2="116" y2="48"/><line x1="130" y1="42" x2="128" y2="50"/>
      <line x1="88" y1="43" x2="86" y2="52"/><line x1="112" y1="43" x2="110" y2="52"/>
    </g>`;
  }
  return s;
}

function bodyPath(look) {
  const k = look.skin, d = look.skinDark, l = look.skinLight;
  return `
  <!-- back foot (kicked out, bottom right) -->
  <g>
    <path d="M142 152 C160 150 178 156 184 170 C186 177 180 181 170 181 L146 181 Z" fill="${d}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M172 181 C176 184 184 184 188 180 M176 176 C181 178 187 177 190 174" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>
  <!-- body -->
  <path d="M52 92 C14 104 6 156 38 180 C62 196 126 198 162 184 C192 172 196 122 168 98 C142 76 92 72 52 92 Z" fill="${k}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M168 98 C196 122 192 172 162 184 C178 160 178 124 152 96 Z" fill="${d}" opacity=".55"/>
  <ellipse cx="92" cy="150" rx="44" ry="30" fill="${l}" opacity=".32"/>
  <!-- front foot -->
  <g>
    <path d="M70 182 C86 176 124 176 140 184 C142 192 130 196 112 195 L82 195 C72 194 66 188 70 182 Z" fill="${d}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M78 195 C74 198 66 197 63 192 M92 196 C89 200 81 200 78 195" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`;
}

function chainSvg(kind, id) {
  if (!kind) return '';
  if (kind === 'silver') {
    return `<g class="gt-chain"><path d="M40 98 Q84 142 150 98" fill="none" stroke="#6d7783" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M40 98 Q84 142 150 98" fill="none" stroke="#dfe6ee" stroke-width="2" stroke-dasharray="3.5 2.5" stroke-linecap="round"/></g>`;
  }
  const fat = kind === 'fat';
  const w = fat ? 6 : 4.2;
  const pend = fat
    ? `<g transform="translate(92 138)">
         <circle r="13" fill="url(#${id}gold)" stroke="#7a5a05" stroke-width="2"/>
         <circle r="9.5" fill="none" stroke="#fff3a8" stroke-width="1" opacity=".8"/>
         <text y="6" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="17" fill="#6b4a00">$</text>
       </g>`
    : '';
  return `<g class="gt-chain">
    <path d="M36 98 Q84 152 154 98" fill="none" stroke="#7a5a05" stroke-width="${w + 2}" stroke-linecap="round"/>
    <path d="M36 98 Q84 152 154 98" fill="none" stroke="url(#${id}gold)" stroke-width="${w}" stroke-dasharray="${fat ? '5 2.5' : '4 2'}" stroke-linecap="round"/>
    ${pend}
  </g>`;
}

function headSvg(look, id) {
  const k = look.skin, l = look.skinLight;
  // heavy lids per mood: how far down the lid sits (0 = fully open, 1 = shut)
  const lidDrop = { shut: 1, half: 0.5, smug: 0.56, shades: 0.56 }[look.lids];
  const eyes = [[60, 50], [106, 48]].map(([cx, cy], i) => {
    const rx = 16, ry = 12;
    const lidY = cy - ry + 2 * ry * lidDrop;
    const slope = look.lids === 'smug' || look.lids === 'shades' ? (i ? -2 : 2) : 0;
    const cid = `${id}eye${i}`;
    return `<clipPath id="${cid}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#f4f1e2" stroke="${INK}" stroke-width="2.2"/>
      <g clip-path="url(#${cid})">
        <ellipse cx="${cx - 5}" cy="${cy + 3}" rx="4.6" ry="5" fill="#101a08"/>
        <circle cx="${cx - 6.6}" cy="${cy + 1.2}" r="1.3" fill="#fff" opacity=".85"/>
        <polygon points="${cx - rx - 2},${cy - ry - 2} ${cx + rx + 2},${cy - ry - 2} ${cx + rx + 2},${lidY - slope} ${cx - rx - 2},${lidY + slope}" fill="${k}"/>
        <line x1="${cx - rx - 2}" y1="${lidY + slope}" x2="${cx + rx + 2}" y2="${lidY - slope}" stroke="${INK}" stroke-width="2.4"/>
        ${look.lids !== 'shut' ? `<ellipse class="gt-blink" cx="${cx}" cy="${cy}" rx="${rx + 1}" ry="${ry + 1}" fill="${k}"/>` : ''}
      </g>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
  }).join('');

  let mouth;
  if (look.mouth === 'frown') {
    mouth = `<path d="M30 82 Q78 66 128 82" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  } else if (look.mouth === 'flat') {
    mouth = `<path d="M30 76 Q78 80 128 74" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  } else {
    const drop = look.mouth === 'bigsmirk' ? 112 : 104;
    mouth = `<path d="M24 70 Q76 86 136 66 Q82 ${drop} 24 70 Z" fill="#d98648" stroke="#7a3b1c" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M24 70 Q76 86 136 66" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M52 86 Q80 98 110 82" fill="none" stroke="#b9642c" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>`;
  }

  return `
  <path d="M18 66 C14 40 40 24 76 24 C112 22 138 38 138 64 C138 82 122 94 100 98 C66 102 22 94 18 66 Z" fill="${k}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M30 34 C48 24 90 20 118 30" fill="none" stroke="${l}" stroke-width="3" opacity=".5" stroke-linecap="round"/>
  ${eyes}
  ${mouth}`;
}

function shadesSvg(kind, id) {
  if (!kind) return '';
  if (kind === 'up') {
    // pushed up onto the forehead, tilted
    return `<g transform="translate(0 -26) rotate(-4 78 48)">${shadesBody(id, false)}</g>`;
  }
  return shadesBody(id, true);
}

function shadesBody(id, glint) {
  // 8-bit thug-life shades, stepped lens edges
  const L = '42,39 82,39 82,49 78,49 78,54 74,54 74,59 50,59 50,54 46,54 46,49 42,49';
  const R = '90,37 130,37 130,47 126,47 126,52 122,52 122,57 98,57 98,52 94,52 94,47 90,47';
  return `<g>
    <path d="M82 42 L90 40 M130 42 L142 46 M42 42 L28 48" stroke="#0a0a0a" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <polygon points="${L}" fill="#0b0b0b" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="${R}" fill="#0b0b0b" stroke="#000" stroke-width="2" stroke-linejoin="round"/>
    <rect x="47" y="42" width="8" height="3" fill="#fff" opacity=".55"/><rect x="95" y="40" width="8" height="3" fill="#fff" opacity=".55"/>
    ${glint ? `<clipPath id="${id}lens"><polygon points="${L}"/><polygon points="${R}"/></clipPath>
      <g clip-path="url(#${id}lens)"><g class="gt-glint"><polygon points="44,36 54,36 42,62 32,62" fill="#fff" opacity=".9"/></g></g>` : ''}
  </g>`;
}

function watchSvg(kind, id, x, y, rot) {
  if (!kind) return '';
  const iced = kind === 'iced';
  const band = kind === 'gold' || iced ? `url(#${id}gold)` : '#9aa6b2';
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-9" y="-6.5" width="18" height="13" rx="3" fill="${band}" stroke="#6b4a00" stroke-width="1.6"/>
    <circle r="6.2" fill="${iced ? '#10131c' : '#f7f4ea'}" stroke="#6b4a00" stroke-width="1.6"/>
    <path d="M0 0 L0 -3.6 M0 0 L2.6 1" stroke="${iced ? '#fff' : '#222'}" stroke-width="1.1" stroke-linecap="round"/>
    ${iced ? `<g class="gt-shine" fill="#fff"><circle cx="-6.8" cy="-4.4" r="1.1"/><circle cx="6.8" cy="-4.4" r="1.1"/><circle cx="-6.8" cy="4.4" r="1.1"/><circle cx="6.8" cy="4.4" r="1.1"/></g>` : ''}
  </g>`;
}

// hands + arm per pose; returns the markup (watch is placed with the hands)
function handsSvg(look, id) {
  const k = look.skin, d = look.skinDark;
  const arm = (path) => `<path d="${path}" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
    <path d="${path}" fill="none" stroke="${k}" stroke-width="12.4" stroke-linecap="round"/>`;
  const blob = (cx, cy, rx, ry, rot = 0) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="${k}" stroke="${INK}" stroke-width="2.4"/>`;

  switch (look.hands) {
    case 'limp':
      return `${arm('M48 104 C36 126 38 150 50 166')}${blob(51, 168, 8, 6, 20)}
        ${arm('M150 108 C162 130 160 152 150 168')}${blob(149, 170, 8, 6, -20)}`;
    case 'lap':
      return `${arm('M48 104 C34 124 48 146 84 150')}${blob(90, 152, 11, 7, 8)}
        <path d="M84 148 L84 156 M90 147 L90 157 M96 148 L96 156" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'clasp':
      return `${arm('M48 104 C34 126 50 146 88 142')}${blob(98, 142, 17, 10, -6)}
        <path d="M90 136 L92 148 M98 134 L99 148 M106 135 L106 147" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
        ${watchSvg(look.watch, id, 70, 138, 20)}`;
    case 'crossed':
      return `${arm('M48 104 C34 128 56 150 118 138')}${blob(122, 138, 11, 8, -10)}
        ${arm('M156 108 C168 134 140 156 82 142')}${blob(78, 142, 11, 8, 10)}
        ${watchSvg(look.watch, id, 66, 140, -8)}`;
    case 'steeple':
    default:
      return `${arm('M46 100 C28 122 48 142 84 128')}
        <g class="gt-rub">
          ${blob(100, 120, 26, 12, -14)}
          <g transform="rotate(-24 108 112)">${blob(100, 98, 8.5, 21)}</g>
          <g transform="rotate(24 108 112)">${blob(116, 98, 8.5, 21)}</g>
          <path d="M104 100 L104 112 M111 100 L111 112" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
          ${blob(88, 116, 9, 6, 32)}
        </g>
        ${watchSvg(look.watch, id, 76, 122, 24)}`;
  }
}

function fxFront(look) {
  let s = '';
  if (look.fx.includes('tears')) {
    s += `<path class="gt-tear" d="M52 58 Q49 66 52 69 Q55 66 52 58" fill="#6fa4d1"/>
          <path class="gt-tear b" d="M98 56 Q95 64 98 67 Q101 64 98 56" fill="#6fa4d1"/>`;
  }
  if (look.fx.includes('sweat')) {
    s += `<path class="gt-sweat" d="M140 40 Q143 32 146 40 Q143 46 140 40" fill="#a9d4ee"/>`;
  }
  if (look.fx.includes('sparkles')) {
    const star = (x, y, r, c, cls) => `<g class="gt-spark ${cls}" transform="translate(${x} ${y})">
      <path d="M0 ${-r} L${r * 0.28} ${-r * 0.28} L${r} 0 L${r * 0.28} ${r * 0.28} L0 ${r} L${-r * 0.28} ${r * 0.28} L${-r} 0 L${-r * 0.28} ${-r * 0.28} Z" fill="${c}"/></g>`;
    s += star(26, 24, 8, '#ffd700', '') + star(176, 30, 7, '#ffe84d', 'b') +
         star(186, 120, 6, '#fff', 'c') + star(14, 120, 5, '#ffe84d', 'd') + star(150, 12, 5, '#fff', 'b');
  }
  return s;
}

const POSTURE = {
  slump: 'translate(4 16) rotate(5 100 190) scale(1 .9)',
  lean: 'translate(0 8) scale(1 .96)',
  tall: '',
};

function buildFrog(stage) {
  const look = LOOKS[stage];
  const id = `gt${stage}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" class="gt-frog gt-s${stage}${look.posture === 'slump' ? ' gt-slump' : ''}" role="img" aria-label="Groyper frog, stage ${stage}">
  ${STYLE}
  <defs>
    <radialGradient id="${id}glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd700" stop-opacity=".6"/><stop offset="55%" stop-color="#ffd700" stop-opacity=".22"/><stop offset="100%" stop-color="#ffd700" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff0a0"/><stop offset="45%" stop-color="#ffd21f"/><stop offset="100%" stop-color="#b98700"/>
    </linearGradient>
  </defs>
  ${fxBack(look, id)}
  <g transform="${POSTURE[look.posture]}">
    <g class="gt-body">
      ${bodyPath(look)}
      ${chainSvg(look.chain, id)}
      ${headSvg(look, id)}
      ${shadesSvg(look.shades, id)}
      ${handsSvg(look, id)}
    </g>
  </g>
  ${fxFront(look)}
</svg>`;
}

const FROG_SVGS = {};
[1, 2, 3, 4, 5].forEach((s) => { FROG_SVGS[s] = buildFrog(s); });

// ---------------------------------------------------------------------------
// CSS class names per stage (unchanged from frog.js)
// ---------------------------------------------------------------------------

const STAGE_CLASSES = {
  1: 'groyper-stage-defeated',
  2: 'groyper-stage-meh',
  3: 'groyper-stage-okay',
  4: 'groyper-stage-strong',
  5: 'groyper-stage-ascended',
};

// ---------------------------------------------------------------------------
// Public API (identical signatures to frog.js)
// ---------------------------------------------------------------------------

export function getStage(score) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const entry = STAGE_THRESHOLDS.find(
    (t) => clamped >= t.min && clamped <= t.max,
  );
  return entry ? entry.stage : 1;
}

export function getStageName(stage) {
  const entry = STAGE_THRESHOLDS.find((t) => t.stage === stage);
  if (!entry) {
    throw new RangeError(`Invalid stage "${stage}". Must be 1-5.`);
  }
  return entry.name;
}

export function getFrogSVG(stage) {
  const svg = FROG_SVGS[stage];
  if (!svg) {
    throw new RangeError(`Invalid stage "${stage}". Must be 1-5.`);
  }
  return svg;
}

export function getMotivationalMessage(stage) {
  const pool = MESSAGES[stage];
  if (!pool) {
    throw new RangeError(`Invalid stage "${stage}". Must be 1-5.`);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function renderFrog(containerElement, score) {
  if (!(containerElement instanceof HTMLElement)) {
    throw new TypeError('containerElement must be an HTMLElement.');
  }

  const stage = getStage(score);
  const svg = getFrogSVG(stage);

  Object.values(STAGE_CLASSES).forEach((cls) => {
    containerElement.classList.remove(cls);
  });
  containerElement.classList.add(STAGE_CLASSES[stage]);
  containerElement.innerHTML = svg;
}
