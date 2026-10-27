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
    body: `'빛의 세기 보기'를 누르면 칸마다 ${name} 빛의 세기가 숫자로 보여요.`,
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
        body: '세 빛을 겹치면 모든 색이 나와요. R · G · B를 눌러 떼어 보세요.',
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
        body: '밝으면 1, 어두우면 0. 그림이 굵고 단순해져요.',
        terms: ['1비트 = 스위치 1개', '2가지 = 2¹'],
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

function getModeExplanation(mode, option) {
  const entry = modeExplanations[mode];
  if (!entry) return null;
  return entry.variants ? (entry.variants[option] ?? null) : entry;
}

module.exports = { modeExplanations, getModeExplanation };
