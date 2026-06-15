const mathDescriptions = {
  original: {
    title: '이진 표현 (Binary)',
    desc: '픽셀 밝기를 임계값과 비교하여 0 또는 1로 표현합니다.',
    formula: 'f(x) = x > θ ? 1 : 0',
    colorDepth: '1bit (2색)',
  },
  binary: {
    title: '바이너리 (0/1)',
    desc: '밝기(luminance)를 계산하여 밝으면 1, 어두우면 0으로 표시합니다.',
    formula: 'L = 0.299R + 0.587G + 0.114B',
    colorDepth: '1bit (2색)',
  },
  numeric: {
    title: '계조 표현 (0~9)',
    desc: '밝기를 0~9 단계로 분류합니다. 9개 구간으로 나눈 양자화(quantization)입니다.',
    formula: 'digit = floor(L / 256 × 10)',
    colorDepth: '4bit (10단계)',
  },
  blackwhite: {
    title: '흑백 실루엣',
    desc: 'AI 세그멘테이션 마스크로 인물 영역만 흰색으로 표시합니다.',
    formula: 'mask(x,y) ∈ {0, 1}',
    colorDepth: '1bit (2색)',
  },
  busan: {
    title: '부산 수학문화관',
    desc: '밝기에 따라 한국어 글자로 표현합니다.',
    formula: 'char = chars[floor(L / 256 × n)]',
    colorDepth: '4bit',
  },
  pixelvalue: {
    title: '픽셀 수치 시각화',
    desc: '모든 픽셀이 0~255의 숫자로 표현됩니다. 8bit = 2⁸ = 256단계입니다.',
    formula: 'L = 0.299R + 0.587G + 0.114B  ∈ [0, 255]',
    colorDepth: '8bit (256단계)',
  },
  colorrgb: {
    title: 'RGB 색상 모델',
    desc: '각 픽셀은 R·G·B 세 채널로 구성됩니다. 총 256³ ≈ 1,677만 색상을 표현할 수 있습니다.',
    formula: 'color = (R, G, B)  각 채널 0~255 (8bit)',
    colorDepth: '24bit (1677만색)',
  },
  grayscale8bit: {
    title: '8비트 그레이스케일',
    desc: '256단계(2⁸)로 밝기를 표현합니다. 흑백을 디지털로 나타내는 방식입니다.',
    formula: 'gray = 0.299R + 0.587G + 0.114B',
    colorDepth: '8bit (256단계)',
  },
  color4k: {
    title: '4비트 컬러 (4096색)',
    desc: '채널당 4bit(0~15). RGB 각각 16단계. 16³ = 4096색을 표현합니다.',
    formula: 'R₄ = floor(R/16), G₄ = floor(G/16), B₄ = floor(B/16)',
    colorDepth: '12bit (4096색)',
  },
  gaussian: {
    title: '가우시안 블러',
    kernel: [[1, 2, 1], [2, 4, 2], [1, 2, 1]],
    divisor: 16,
    desc: '주변 픽셀을 가중평균하여 이미지를 부드럽게 만듭니다.',
  },
  sharpen: {
    title: '샤프닝 커널',
    kernel: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    desc: '중심 픽셀을 강조하고 주변을 억제하여 이미지를 선명하게 만듭니다.',
  },
  sobel: {
    title: '소벨 엣지 검출',
    kernel: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    kernelX: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    desc: '수평/수직 기울기를 계산하여 경계선을 검출합니다.',
  },
};

module.exports = { mathDescriptions };
