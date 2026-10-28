const { BODY_SEGMENTATION_CONFIG } = require('../config');

/**
 * One rule per view for the card above the controls. Visitors get the idea from a
 * short title and a picture; the rule says the same thing as one calculation, with
 * the right lever's value written in, so it always matches what the screen does.
 * The marked cell's own numbers go into that calculation in the card under the
 * controls (cellReadout.js), so the rule never needs a second sentence.
 *
 * Every text is a { ko, en } pair (see i18n.js). `rule` may instead be a function of
 * the right lever's value; `note` is an optional one-line fact under the picture.
 */
const PERSON_PERCENT = Math.round((BODY_SEGMENTATION_CONFIG.personAlphaThreshold / 255) * 100);

const CHANNEL_VARIANTS = {
  R: { name: { ko: '빨간', en: 'red' }, color: '#ff2a2a' },
  G: { name: { ko: '초록', en: 'green' }, color: '#2aff5a' },
  B: { name: { ko: '파란', en: 'blue' }, color: '#2a7bff' },
};

// Written the way formulas read: "+ 60", "− 40".
function signed(value) {
  return value < 0 ? `− ${-value}` : `+ ${value}`;
}

function blurSize(radius) {
  return `${radius * 2 + 1}×${radius * 2 + 1}`;
}

function channelExplanation(channel) {
  const { name, color } = CHANNEL_VARIANTS[channel];
  return {
    title: { ko: `${name.ko} 빛만 남기기`, en: `Only the ${name.en} light` },
    rule: {
      ko: `숫자 = ${name.ko} 빛의 세기 (0 ~ 255)`,
      en: `number = how strong the ${name.en} light is (0 ~ 255)`,
    },
    visual: { type: 'channel-dimmer', color },
  };
}

const modeExplanations = {
  original: {
    title: { ko: '0과 1로 그린 나', en: 'You, drawn in 0s and 1s' },
    rule: {
      ko: `AI가 본 사람일 확률이 ${PERSON_PERCENT}% 이상인 칸은 1, 아니면 0`,
      en: `Cells the AI finds ${PERSON_PERCENT}% or more likely a person are 1, others 0`,
    },
    visual: { type: 'scan-person' },
  },
  rgb: {
    variants: {
      N: {
        title: { ko: '빛 세 가지로 만든 색', en: 'Color from three lights' },
        rule: {
          ko: '색 = R, G, B 세 숫자 (각 0 ~ 255)',
          en: 'color = three numbers R, G, B (each 0 ~ 255)',
        },
        note: {
          ko: '256 × 256 × 256 = 16,777,216가지 색',
          en: '256 × 256 × 256 = 16,777,216 colors',
        },
        visual: { type: 'light-mix' },
      },
      R: channelExplanation('R'),
      G: channelExplanation('G'),
      B: channelExplanation('B'),
    },
  },
  levels: {
    variants: {
      2: {
        title: { ko: '2단계: 크레파스 2자루', en: '2 steps: 2 crayons' },
        rule: (threshold = 128) => ({
          ko: `밝기가 ${threshold} 이상이면 1, 아니면 0`,
          en: `brightness ${threshold} or more → 1, else 0`,
        }),
        note: { ko: '2 = 2¹ → 1비트', en: '2 = 2¹ → 1 bit' },
        visual: { type: 'level-steps', levels: 2 },
      },
      10: {
        title: { ko: '10단계: 크레파스 10자루', en: '10 steps: 10 crayons' },
        rule: {
          ko: '단계 = 밝기 ÷ 25.5, 소수점 아래는 버림',
          en: 'step = brightness ÷ 25.5, rounded down',
        },
        note: { ko: '255 ÷ 10 = 25.5 → 계단 한 칸의 폭', en: '255 ÷ 10 = 25.5 → one step wide' },
        visual: { type: 'level-steps', levels: 10 },
      },
      256: {
        title: { ko: '256단계: 크레파스 256자루', en: '256 steps: 256 crayons' },
        rule: { ko: '단계 = 밝기 그대로 (0 ~ 255)', en: 'step = brightness as it is (0 ~ 255)' },
        note: { ko: '256 = 2⁸ → 8비트', en: '256 = 2⁸ → 8 bits' },
        visual: { type: 'level-steps', levels: 256 },
      },
    },
  },
  // 수학 처리: one calculation per card, written as a formula with the lever's value.
  math: {
    variants: {
      none: {
        title: { ko: '수학으로 사진 바꾸기', en: 'Changing a photo with math' },
        rule: {
          ko: '칸마다 숫자 하나 = 밝기, 0(검정) ~ 255(흰색)',
          en: 'one number per cell = brightness, 0 (black) ~ 255 (white)',
        },
        visual: { type: 'math-op', effect: 'none' },
      },
      brightness: {
        title: { ko: '밝기: 더하기', en: 'Brightness: add' },
        rule: (amount = 0) => ({
          ko: `새 값 = 값 ${signed(amount)}`,
          en: `new = value ${signed(amount)}`,
        }),
        visual: { type: 'math-op', effect: 'brightness' },
      },
      contrast: {
        title: { ko: '대비: 곱하기', en: 'Contrast: multiply' },
        rule: (amount = 1) => ({
          ko: `새 값 = (값 − 128) × ${amount} + 128`,
          en: `new = (value − 128) × ${amount} + 128`,
        }),
        visual: { type: 'math-op', effect: 'contrast' },
      },
      blur: {
        title: { ko: '블러: 무게 평균', en: 'Blur: weighted average' },
        rule: (radius = 1) => ({
          ko: `새 값 = 주변 ${blurSize(radius)}칸의 무게 평균`,
          en: `new = weighted average of the ${blurSize(radius)} cells around`,
        }),
        visual: { type: 'math-op', effect: 'blur' },
      },
      sharpen: {
        title: { ko: '선명: 차이 키우기', en: 'Sharpen: boost the difference' },
        rule: (amount = 1) => ({
          ko: `새 값 = 값 + (값 − 무게 평균) × ${amount}`,
          en: `new = value + (value − average) × ${amount}`,
        }),
        visual: { type: 'math-op', effect: 'sharpen' },
      },
    },
  },
};

function getModeExplanation(mode, option) {
  const entry = modeExplanations[mode];
  if (!entry) return null;
  return entry.variants ? (entry.variants[option] ?? null) : entry;
}

/** The view's rule as a { ko, en } pair, with `value` (the right lever) written in. */
function getRule(explanation, value) {
  const { rule } = explanation;
  return typeof rule === 'function' ? rule(value) : rule;
}

module.exports = { modeExplanations, getModeExplanation, getRule, PERSON_PERCENT };
