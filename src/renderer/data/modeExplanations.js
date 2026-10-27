/**
 * Metaphor-first copy for the three exhibition modes. Visitors should get the idea
 * at a glance, so each view pairs one picture-like headline and animation with a
 * single short line, and names the real terms in small chips.
 */
const CHANNEL_VARIANTS = {
  R: { name: '빨간', color: '#ff2a2a' },
  G: { name: '초록', color: '#2aff5a' },
  B: { name: '파란', color: '#2a7bff' },
};

function channelExplanation(channel) {
  const { name, color } = CHANNEL_VARIANTS[channel];
  return {
    title: `${name} 빛만 남기기`,
    headline: `${name} 손전등의 밝기 손잡이`,
    body: `칸마다 적힌 숫자가 그 칸의 ${name} 빛 세기예요.`,
    terms: ['8비트 = 256단계', '0 ~ 255'],
    animation: { type: 'channel-dimmer', color },
  };
}

const modeExplanations = {
  original: {
    title: '0과 1로 그린 나',
    headline: '칸마다 켜고 끄는 전등 스위치',
    body: '사람이 있는 칸은 1(켜짐), 없는 칸은 0(꺼짐)으로 적어요.',
    terms: ['이진법 = 0과 1로만 나타내기', '1비트 = 스위치 1개'],
    animation: { type: 'scan-person' },
  },
  rgb: {
    variants: {
      N: {
        title: '빛 세 가지로 만든 색',
        headline: '빨강 · 초록 · 파랑 손전등 세 개',
        body: '칸마다 R · G · B 세 숫자가 있어요. 세 빛을 섞은 색이에요.',
        terms: ['빛의 삼원색', '256 × 256 × 256 ≈ 1,677만 색'],
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
        title: '2단계: 검정과 흰색',
        headline: '크레파스 2자루로 그리기',
        body: '경계값보다 밝으면 1, 어두우면 0. 경계값을 옮겨 보세요.',
        terms: ['1비트 = 스위치 1개', '경계값 = 0과 1을 가르는 기준'],
        animation: { type: 'level-steps', levels: 2 },
      },
      10: {
        title: '10단계: 0부터 9까지',
        headline: '회색 크레파스 10자루로 그리기',
        body: '밝기를 10칸 계단으로 나누고 0부터 9까지 번호를 붙여요.',
        terms: ['양자화 = 계단으로 나누기', '십진법 0 ~ 9'],
        animation: { type: 'level-steps', levels: 10 },
      },
      256: {
        title: '256단계: 사진처럼',
        headline: '크레파스 256자루로 그리기',
        body: '계단이 256칸이면 눈에는 거의 매끈하게 보여요.',
        terms: ['8비트 = 스위치 8개', '256가지 = 2⁸'],
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
      title: '수학으로 사진 바꾸기',
      headline: '칸마다 숫자 하나 = 밝기',
      body: '계산을 하나 고르면 칸마다 숫자가 바뀌어요.',
      terms: ['픽셀 = 숫자 하나', '영상 처리 = 숫자 계산'],
    }),
    brightness: mathOp('brightness', {
      title: '밝기: 더하기',
      headline: '새 값 = 값 + 더할 수',
      body: '모든 칸에 같은 수를 더해요. 255를 넘으면 255예요.',
      terms: ['덧셈', '0 ~ 255 안으로 자르기'],
    }),
    contrast: mathOp('contrast', {
      title: '대비: 곱하기',
      headline: '새 값 = (값 − 128) × 곱할 수 + 128',
      body: '가운데 128에서 멀어지게 곱해요. 밝은 칸은 더 밝게.',
      terms: ['곱셈', '128 = 가운데 밝기'],
    }),
    blur: mathOp('blur', {
      title: '블러: 무게 평균',
      headline: '새 값 = 주변 칸의 무게 평균',
      body: '가운데 칸일수록 무게를 더 줘서 섞으면 부드럽게 흐려져요.',
      terms: ['가우시안 블러', '3×3 무게 1 · 2 · 4, 합 16'],
    }),
    sharpen: mathOp('sharpen', {
      title: '선명: 차이 키우기',
      headline: '새 값 = 값 + (값 − 무게 평균) × 세기',
      body: '주변 평균과 다른 만큼 더 벌리면 경계가 또렷해져요.',
      terms: ['뺄셈 · 곱셈 · 덧셈', '언샤프 마스크'],
    }),
  },
};

function getModeExplanation(mode, option) {
  const entry = modeExplanations[mode];
  if (!entry) return null;
  return entry.variants ? (entry.variants[option] ?? null) : entry;
}

module.exports = { modeExplanations, getModeExplanation };
