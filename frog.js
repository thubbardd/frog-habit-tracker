/**
 * (C) frog-images.js: drop-in replacement for 01 Source/frog.js.
 *
 * The frog is the real Groyper artwork (./frog/stage1.png ... stage5.png, built
 * by "(C) make_frog_stages.py"). Each stage is the same frog with different gear
 * and mood. Motion and effects are SVG/CSS laid over the image in the same
 * 800x724 coordinate space as the PNGs.
 *
 * Same public API, thresholds, messages and stage class names as the old frog.js.
 */

const STAGE_THRESHOLDS = [
  { min: 0, max: 19, stage: 1, name: 'Defeated' },
  { min: 20, max: 39, stage: 2, name: 'Meh' },
  { min: 40, max: 59, stage: 3, name: 'Okay' },
  { min: 60, max: 79, stage: 4, name: 'Strong' },
  { min: 80, max: 100, stage: 5, name: 'Ascended' },
];

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

const STAGE_CLASSES = {
  1: 'groyper-stage-defeated',
  2: 'groyper-stage-meh',
  3: 'groyper-stage-okay',
  4: 'groyper-stage-strong',
  5: 'groyper-stage-ascended',
};

// ---------------------------------------------------------------------------
// Effects, all in the 800x724 space of the stage images
// ---------------------------------------------------------------------------

const STYLE = `<style>
  .gt-wrap{position:relative;width:100%;aspect-ratio:800/724;margin:auto;top:50%;transform:translateY(-50%)}
  .gt-wrap.gt-slump .gt-pose{transform:translateY(7%) scale(.95,.9);transform-origin:50% 100%}
  .gt-pose{position:absolute;inset:0}
  .gt-fxback,.gt-fxfront{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;filter:none!important}
  .gt-breathe{position:absolute;inset:0;transform-origin:50% 96%;animation:gt-breathe 3.6s ease-in-out infinite}
  .gt-slump .gt-breathe{animation-duration:6s}
  .gt-img{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;-webkit-user-drag:none}
  .gt-glow{transform-box:fill-box;transform-origin:center;animation:gt-glow 3.2s ease-in-out infinite}
  .gt-spark{transform-box:fill-box;transform-origin:center;animation:gt-twinkle 2.6s ease-in-out infinite}
  .gt-spark.b{animation-delay:.7s}.gt-spark.c{animation-delay:1.3s}.gt-spark.d{animation-delay:1.9s}
  .gt-glint{animation:gt-glint 3.8s ease-in-out infinite}
  .gt-rain line{animation:gt-rain 1s linear infinite}
  .gt-rain line:nth-child(2n){animation-delay:.33s}.gt-rain line:nth-child(3n){animation-delay:.66s}
  .gt-tear{animation:gt-drop 2.4s ease-in infinite}.gt-tear.b{animation-delay:1.2s}
  .gt-sweat{animation:gt-drop 2.8s ease-in infinite}
  @keyframes gt-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.008,1.022)}}
  @keyframes gt-glow{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
  @keyframes gt-twinkle{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
  @keyframes gt-glint{0%,52%{transform:translateX(-90px);opacity:0}58%{opacity:.95}78%{opacity:.95}86%,100%{transform:translateX(230px);opacity:0}}
  @keyframes gt-rain{0%{transform:translateY(0);opacity:0}15%{opacity:.85}100%{transform:translateY(260px);opacity:0}}
  @keyframes gt-drop{0%{transform:translateY(0);opacity:0}12%{opacity:.95}100%{transform:translateY(120px);opacity:0}}
  @media (prefers-reduced-motion:reduce){.gt-breathe,.gt-glow,.gt-spark,.gt-glint,.gt-rain line,.gt-tear,.gt-sweat{animation:none!important}.gt-spark{opacity:.8}}
</style>`;

const star = (x, y, r, fill, cls = '') =>
  `<g class="gt-spark ${cls}" transform="translate(${x} ${y})"><path d="M0 ${-r} L${r * 0.26} ${-r * 0.26} L${r} 0 L${r * 0.26} ${r * 0.26} L0 ${r} L${-r * 0.26} ${r * 0.26} L${-r} 0 L${-r * 0.26} ${-r * 0.26} Z" fill="${fill}"/></g>`;

const drop = (x, y, cls, fill = '#6fa8d8') =>
  `<path class="${cls}" d="M${x} ${y} q-13 26 0 34 q13 -8 0 -34 z" fill="${fill}" opacity="0"/>`;

const defs = (id) => `<defs>
  <radialGradient id="${id}glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#ffd700" stop-opacity=".55"/><stop offset="55%" stop-color="#ffd700" stop-opacity=".2"/><stop offset="100%" stop-color="#ffd700" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="${id}lens"><rect x="318" y="95" width="162" height="44"/></clipPath>
</defs>`;

const FX = {
  1: {
    back: () => `<g opacity=".9"><ellipse cx="680" cy="70" rx="95" ry="38" fill="#7f8da0"/><ellipse cx="620" cy="86" rx="62" ry="32" fill="#7f8da0"/><ellipse cx="745" cy="86" rx="58" ry="30" fill="#7f8da0"/><ellipse cx="682" cy="96" rx="118" ry="28" fill="#6c7a8d"/></g>
      <g class="gt-rain" stroke="#6f93b8" stroke-width="4" stroke-linecap="round">
        <line x1="610" y1="120" x2="602" y2="146"/><line x1="640" y1="124" x2="632" y2="150"/><line x1="670" y1="120" x2="662" y2="146"/>
        <line x1="700" y1="126" x2="692" y2="152"/><line x1="730" y1="120" x2="722" y2="146"/><line x1="760" y1="124" x2="752" y2="150"/>
        <line x1="655" y1="130" x2="647" y2="156"/><line x1="715" y1="130" x2="707" y2="156"/>
      </g>`,
    front: () => drop(352, 122, 'gt-tear') + drop(446, 118, 'gt-tear b'),
  },
  2: {
    back: () => '',
    front: () => drop(505, 70, 'gt-sweat', '#a9d4ee'),
  },
  3: { back: () => '', front: () => '' },
  4: {
    back: (id) => `<g class="gt-glow"><ellipse cx="400" cy="380" rx="470" ry="430" fill="url(#${id}glow)" opacity=".5"/></g>`,
    front: () => star(552, 306, 14, '#fff', 'c') + star(420, 385, 14, '#fff8c0', 'a'),
  },
  5: {
    back: (id) => `<g class="gt-glow"><ellipse cx="400" cy="380" rx="500" ry="450" fill="url(#${id}glow)"/></g>`,
    front: (id) => `
      <g clip-path="url(#${id}lens)"><g class="gt-glint"><polygon points="330,90 352,90 326,142 304,142" fill="#fff" opacity=".9"/><polygon points="372,90 380,90 354,142 346,142" fill="#fff" opacity=".7"/></g></g>
      ${star(420, 408, 18, '#fff', 'a')}${star(556, 318, 14, '#fff', 'b')}
      ${star(250, 60, 22, '#ffd700', 'c')}${star(700, 120, 20, '#ffe84d', 'd')}${star(760, 330, 16, '#fff', 'a')}${star(70, 380, 18, '#ffe84d', 'b')}${star(640, 40, 14, '#fff', 'c')}`,
  },
};

function buildFrog(stage) {
  const id = `gt${stage}`;
  const fx = FX[stage];
  return `<div class="gt-wrap gt-s${stage}${stage === 1 ? ' gt-slump' : ''}" role="img" aria-label="Groyper frog, stage ${stage}">
  ${STYLE}
  <div class="gt-pose">
    <svg class="gt-fxback" viewBox="0 0 800 724" preserveAspectRatio="none" aria-hidden="true">${defs(id)}${fx.back(id)}</svg>
    <div class="gt-breathe">
      <img class="gt-img" src="./frog/stage${stage}.png" alt="" draggable="false" width="800" height="724">
      <svg class="gt-fxfront" viewBox="0 0 800 724" preserveAspectRatio="none" aria-hidden="true">${defs(id + 'f')}${fx.front(id + 'f')}</svg>
    </div>
  </div>
</div>`;
}

const FROG_MARKUP = {};
[1, 2, 3, 4, 5].forEach((s) => { FROG_MARKUP[s] = buildFrog(s); });

// ---------------------------------------------------------------------------
// Public API (identical signatures to the old frog.js)
// ---------------------------------------------------------------------------

export function getStage(score) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const entry = STAGE_THRESHOLDS.find((t) => clamped >= t.min && clamped <= t.max);
  return entry ? entry.stage : 1;
}

export function getStageName(stage) {
  const entry = STAGE_THRESHOLDS.find((t) => t.stage === stage);
  if (!entry) throw new RangeError(`Invalid stage "${stage}". Must be 1-5.`);
  return entry.name;
}

export function getFrogSVG(stage) {
  const m = FROG_MARKUP[stage];
  if (!m) throw new RangeError(`Invalid stage "${stage}". Must be 1-5.`);
  return m;
}

export function getMotivationalMessage(stage) {
  const pool = MESSAGES[stage];
  if (!pool) throw new RangeError(`Invalid stage "${stage}". Must be 1-5.`);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function renderFrog(containerElement, score) {
  if (!(containerElement instanceof HTMLElement)) {
    throw new TypeError('containerElement must be an HTMLElement.');
  }
  const stage = getStage(score);
  Object.values(STAGE_CLASSES).forEach((cls) => containerElement.classList.remove(cls));
  containerElement.classList.add(STAGE_CLASSES[stage]);
  containerElement.innerHTML = getFrogSVG(stage);
}
