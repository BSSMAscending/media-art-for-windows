/**
 * Metaphor-first copy for the exhibition modes. Visitors should get the idea at a
 * glance, so each view pairs one picture-like headline and animation with a
 * single short line, and names the real terms in small chips. Every text is a
 * { ko, en } pair (see i18n.js).
 */
const CHANNEL_VARIANTS = {
  R: { name: { ko: '빨간', en: 'red' }, color: '#ff2a2a' },
  G: { name: { ko: '초록', en: 'green' }, color: '#2aff5a' },
  B: { name: { ko: '파란', en: 'blue' }, color: '#2a7bff' },
};

function channelExplanation(channel) {
  const { name, color } = CHANNEL_VARIANTS[channel];
  return {
    title: { ko: `${name.ko} 빛만 남기기`, en: `Only the ${name.en} light` },
    headline: { ko: `${name.ko} 손전등의 밝기 손잡이`, en: `The ${name.en} flashlight's dimmer` },
    body: {
      ko: `칸마다 적힌 숫자가 그 칸의 ${name.ko} 빛 세기예요.`,
      en: `Each number is how strong the ${name.en} light is there.`,
    },
    terms: [{ ko: '8비트 = 256단계', en: '8 bits = 256 steps' }, '0 ~ 255'],
    animation: { type: 'channel-dimmer', color },
  };
}

const modeExplanations = {
  original: {
    title: { ko: '0과 1로 그린 나', en: 'You, drawn in 0s and 1s' },
    headline: { ko: '칸마다 켜고 끄는 전등 스위치', en: 'A light switch in every cell' },
    body: {
      ko: '사람이 있는 칸은 1(켜짐), 없는 칸은 0(꺼짐)으로 적어요.',
      en: 'Cells with a person are 1 (on), all others are 0 (off).',
    },
    terms: [
      { ko: '이진법 = 0과 1로만 나타내기', en: 'Binary = only 0 and 1' },
      { ko: '1비트 = 스위치 1개', en: '1 bit = one switch' },
    ],
    animation: { type: 'scan-person' },
  },
  rgb: {
    variants: {
      N: {
        title: { ko: '빛 세 가지로 만든 색', en: 'Color from three lights' },
        headline: {
          ko: '빨강 · 초록 · 파랑 손전등 세 개',
          en: 'Three flashlights: red, green, blue',
        },
        body: {
          ko: '칸마다 R · G · B 세 숫자가 있어요. 세 빛을 섞은 색이에요.',
          en: 'Each cell has three numbers, R · G · B, mixed into one color.',
        },
        terms: [
          { ko: '빛의 삼원색', en: 'Primary colors of light' },
          { ko: '256 × 256 × 256 ≈ 1,677만 색', en: '256 × 256 × 256 ≈ 16.7 million colors' },
        ],
        animation: { type: 'light-mix' },
      },
      R: channelExplanation('R'),
      G: channelExplanation('G'),
      B: channelExplanation('B'),
    },
  },
  levels: {
    variants: {
      2: {
        title: { ko: '2단계: 검정과 흰색', en: '2 steps: black and white' },
        headline: { ko: '크레파스 2자루로 그리기', en: 'Drawing with 2 crayons' },
        body: {
          ko: '경계값보다 밝으면 1, 어두우면 0. 경계값을 옮겨 보세요.',
          en: 'Brighter than the threshold is 1, darker is 0. Move it!',
        },
        terms: [
          { ko: '1비트 = 스위치 1개', en: '1 bit = one switch' },
          { ko: '경계값 = 0과 1을 가르는 기준', en: 'Threshold = where 0 becomes 1' },
        ],
        animation: { type: 'level-steps', levels: 2 },
      },
      10: {
        title: { ko: '10단계: 0부터 9까지', en: '10 steps: 0 to 9' },
        headline: { ko: '회색 크레파스 10자루로 그리기', en: 'Drawing with 10 grey crayons' },
        body: {
          ko: '밝기를 10칸 계단으로 나누고 0부터 9까지 번호를 붙여요.',
          en: 'Brightness is cut into 10 steps, numbered 0 to 9.',
        },
        terms: [
          { ko: '양자화 = 계단으로 나누기', en: 'Quantization = cutting into steps' },
          { ko: '십진법 0 ~ 9', en: 'Decimal 0 ~ 9' },
        ],
        animation: { type: 'level-steps', levels: 10 },
      },
      256: {
        title: { ko: '256단계: 사진처럼', en: '256 steps: like a photo' },
        headline: { ko: '크레파스 256자루로 그리기', en: 'Drawing with 256 crayons' },
        body: {
          ko: '계단이 256칸이면 눈에는 거의 매끈하게 보여요.',
          en: 'With 256 steps, our eyes see it as almost smooth.',
        },
        terms: [
          { ko: '8비트 = 스위치 8개', en: '8 bits = 8 switches' },
          { ko: '256가지 = 2⁸', en: '256 values = 2⁸' },
        ],
        animation: { type: 'level-steps', levels: 256 },
      },
    },
  },
};

// 수학 처리: one calculation per card, written as a one-line formula.
const mathOp = (effect, copy) => ({ ...copy, animation: { type: 'math-op', effect } });
modeExplanations.math = {
  variants: {
    none: mathOp('none', {
      title: { ko: '수학으로 사진 바꾸기', en: 'Changing a photo with math' },
      headline: { ko: '칸마다 숫자 하나 = 밝기', en: 'One number per cell = brightness' },
      body: {
        ko: '계산을 하나 고르면 칸마다 숫자가 바뀌어요.',
        en: 'Pick a calculation and watch every number change.',
      },
      terms: [
        { ko: '픽셀 = 숫자 하나', en: 'Pixel = one number' },
        { ko: '영상 처리 = 숫자 계산', en: 'Image processing = number math' },
      ],
    }),
    brightness: mathOp('brightness', {
      title: { ko: '밝기: 더하기', en: 'Brightness: add' },
      headline: { ko: '새 값 = 값 + 더할 수', en: 'new = value + amount' },
      body: {
        ko: '모든 칸에 같은 수를 더해요. 255를 넘으면 255예요.',
        en: 'Add the same number to every cell. Over 255 stays 255.',
      },
      terms: [
        { ko: '덧셈', en: 'Addition' },
        { ko: '0 ~ 255 안으로 자르기', en: 'Clamp to 0 ~ 255' },
      ],
    }),
    contrast: mathOp('contrast', {
      title: { ko: '대비: 곱하기', en: 'Contrast: multiply' },
      headline: {
        ko: '새 값 = (값 − 128) × 곱할 수 + 128',
        en: 'new = (value − 128) × factor + 128',
      },
      body: {
        ko: '가운데 128에서 멀어지게 곱해요. 밝은 칸은 더 밝게.',
        en: 'Stretch away from the middle 128: bright gets brighter.',
      },
      terms: [
        { ko: '곱셈', en: 'Multiplication' },
        { ko: '128 = 가운데 밝기', en: '128 = middle brightness' },
      ],
    }),
    blur: mathOp('blur', {
      title: { ko: '블러: 무게 평균', en: 'Blur: weighted average' },
      headline: { ko: '새 값 = 주변 칸의 무게 평균', en: 'new = weighted average of neighbors' },
      body: {
        ko: '가운데 칸일수록 무게를 더 줘서 섞으면 부드럽게 흐려져요.',
        en: 'Mix with the neighbors, the center weighing most, to soften.',
      },
      terms: [
        { ko: '가우시안 블러', en: 'Gaussian blur' },
        { ko: '3×3 무게 1 · 2 · 4, 합 16', en: '3×3 weights 1 · 2 · 4, sum 16' },
      ],
    }),
    sharpen: mathOp('sharpen', {
      title: { ko: '선명: 차이 키우기', en: 'Sharpen: boost the difference' },
      headline: {
        ko: '새 값 = 값 + (값 − 무게 평균) × 세기',
        en: 'new = value + (value − average) × strength',
      },
      body: {
        ko: '주변 평균과 다른 만큼 더 벌리면 경계가 또렷해져요.',
        en: 'Push each cell away from its neighbors: edges get crisp.',
      },
      terms: [
        { ko: '뺄셈 · 곱셈 · 덧셈', en: 'Subtract · multiply · add' },
        { ko: '언샤프 마스크', en: 'Unsharp mask' },
      ],
    }),
  },
};

function getModeExplanation(mode, option) {
  const entry = modeExplanations[mode];
  if (!entry) return null;
  return entry.variants ? (entry.variants[option] ?? null) : entry;
}

module.exports = { modeExplanations, getModeExplanation };
