const mathDescriptions = {
  original: {
    title: '이진 표현 (Binary)',
    desc: '픽셀 밝기를 임계값과 비교하여 0 또는 1로 표현합니다.',
    shortDesc: '사람의 형태를 0과 1로 나누어 보여줍니다.',
    metric: '1bit · 2가지 값',
    formula: 'f(x) = x > θ ? 1 : 0',
    colorDepth: '1bit (2색)',
  },
  rgb: {
    title: '빛의 삼원색 (RGB)',
    desc: '카메라 화면의 모든 색은 빨강(R)·초록(G)·파랑(B) 빛 세 장을 겹쳐 만듭니다.',
    shortDesc: '화면의 색을 빨강·초록·파랑 빛 세 장으로 나누어 보여줍니다.',
    metric: '빛마다 0~255 · 256단계',
    formula: 'color = (R, G, B)',
    colorDepth: '24bit (1677만색)',
  },
  levels: {
    title: '밝기 단계',
    desc: '밝기를 몇 단계로 나누느냐에 따라 그림이 거칠어지거나 부드러워집니다.',
    shortDesc: '밝기를 2·10·256단계로 나누고 단계마다 번호를 붙입니다.',
    metric: '2 · 10 · 256단계',
    formula: 'level = floor(L × 단계 수)',
    colorDepth: '1bit · 십진법 · 8bit',
  },
  busan: {
    title: { ko: '부산 수학문화관', en: 'Busan Mathematical Culture Center' },
    desc: '밝기에 따라 한국어 글자로 표현합니다.',
    shortDesc: {
      ko: '밝기의 차이를 한국어 글자의 밀도로 표현합니다.',
      en: 'Shows brightness as the density of Korean letters.',
    },
    metric: { ko: '한글 7종', en: '7 Korean letters' },
    formula: 'char = chars[floor(L / 256 × n)]',
    colorDepth: '4bit',
  },
  pixelvalue: {
    title: { ko: '픽셀 수치 시각화', en: 'Pixel values' },
    desc: '모든 픽셀이 0~255의 숫자로 표현됩니다. 8bit = 2⁸ = 256단계입니다.',
    shortDesc: {
      ko: '각 지점을 0부터 255까지의 밝기값으로 보여줍니다.',
      en: 'Shows every spot as a brightness value from 0 to 255.',
    },
    metric: { ko: '0~255 · 256단계', en: '0~255 · 256 steps' },
    formula: 'L = 0.299R + 0.587G + 0.114B  ∈ [0, 255]',
    colorDepth: '8bit (256단계)',
  },
  colorrgb: {
    title: { ko: 'RGB 색상 모델', en: 'RGB color model' },
    desc: '각 픽셀은 R·G·B 세 채널로 구성됩니다. 총 256³ ≈ 1,677만 색상을 표현할 수 있습니다.',
    shortDesc: {
      ko: '카메라의 색을 RGB 세 채널로 나누어 표현합니다.',
      en: "Splits the camera's colors into R, G and B channels.",
    },
    metric: { ko: '24bit · 약 1,677만 색', en: '24-bit · about 16.7 million colors' },
    formula: 'color = (R, G, B)  각 채널 0~255 (8bit)',
    colorDepth: '24bit (1677만색)',
  },
  grayscale8bit: {
    title: { ko: '8비트 그레이스케일', en: '8-bit grayscale' },
    desc: '256단계(2⁸)로 밝기를 표현합니다. 흑백을 디지털로 나타내는 방식입니다.',
    shortDesc: {
      ko: '색을 걷어내고 256단계의 밝기로 표현합니다.',
      en: 'Removes the color and keeps 256 steps of brightness.',
    },
    metric: { ko: '8bit · 256단계', en: '8-bit · 256 steps' },
    formula: 'gray = 0.299R + 0.587G + 0.114B',
    colorDepth: '8bit (256단계)',
  },
  color4k: {
    title: { ko: '4비트 컬러 (4096색)', en: '4-bit color (4,096 colors)' },
    desc: '채널당 4bit(0~15). RGB 각각 16단계. 16³ = 4096색을 표현합니다.',
    shortDesc: {
      ko: '색을 채널별로 단순화해 4,096가지로 표현합니다.',
      en: 'Simplifies each channel to show 4,096 colors.',
    },
    metric: { ko: '12bit · 4,096색', en: '12-bit · 4,096 colors' },
    formula: 'R₄ = floor(R/16), G₄ = floor(G/16), B₄ = floor(B/16)',
    colorDepth: '12bit (4096색)',
  },
  gaussian: {
    title: '가우시안 블러',
    kernel: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ],
    divisor: 16,
    desc: '주변 픽셀을 가중평균하여 이미지를 부드럽게 만듭니다.',
  },
  sharpen: {
    title: '샤프닝 커널',
    kernel: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    desc: '중심 픽셀을 강조하고 주변을 억제하여 이미지를 선명하게 만듭니다.',
  },
  sobel: {
    title: '소벨 엣지 검출',
    kernel: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    kernelX: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
    desc: '수평/수직 기울기를 계산하여 경계선을 검출합니다.',
  },
};

module.exports = { mathDescriptions };
