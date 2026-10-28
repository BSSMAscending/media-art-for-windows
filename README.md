# Binary Media Art

카메라에 비친 내 모습이 컴퓨터 안에서 **숫자**가 되는 과정을 보여주는 미디어 아트 전시물입니다.
터치 화면 앞에 서서 모드를 고르면 같은 장면이 **0과 1**, **빛의 삼원색**, **밝기 계단**, **계산된 숫자**로 바뀝니다.

**[소개 사이트](https://bssmascending.github.io/media-art-for-windows/)** · **[패치노트](https://bssmascending.github.io/media-art-for-windows/patch-notes.html)** · **[기여자](https://bssmascending.github.io/media-art-for-windows/credits.html)** · **[설치 파일](https://github.com/BSSMAscending/media-art-for-windows-releases/releases/latest)**

![색 RGB 모드에서 빨강·초록·파랑 빛이 층층이 나뉘는 전시 화면](docs/images/readme/hero.webp)

> README의 화면은 실제 카메라 대신 그린 가상 장면(팔을 벌린 사람)과 가상 인물 인식 결과로 캡처했습니다.

## 한눈에 보기

| 미디어 아트 | 색 RGB |
| :---: | :---: |
| ![미디어 아트 모드](docs/images/readme/mode-media-art.webp) | ![색 RGB 모드](docs/images/readme/mode-rgb.webp) |
| 사람이 있는 칸은 **1**, 없는 칸은 **0** | 칸마다 **빨강 · 초록 · 파랑** 빛의 세기 |
| **밝기 단계** | **수학 처리** |
| ![밝기 단계 모드](docs/images/readme/mode-levels.webp) | ![수학 처리 모드](docs/images/readme/mode-math.webp) |
| 밝기를 **2 · 10 · 256단계**로 나눈 번호 | **밝기 · 대비 · 블러 · 선명** 계산 전후의 숫자 |

모든 화면은 카메라를 **숫자가 적힌 픽셀 칸**으로 보여줍니다. 칸 크기는 레버로 바꾸고, 작은 숫자는 화면을 꾹 눌러 돋보기로 봅니다.

## 화면 구성

![화면 구성: 1 작품 화면, 2 규칙 카드, 3 버튼과 레버, 4 표시한 칸](docs/images/readme/layout.webp)

그림의 번호는 아래 목록의 번호와 같습니다.

1. **작품 화면**: 4:3 카메라 화면이 화면 높이를 가득 채웁니다. 모든 모드가 같은 자리에 그리고, 계산하는 칸 하나에 네모를 칩니다. 누르고 있으면 돋보기가 뜹니다.
2. **규칙 카드**: 지금 화면의 이름, 계산 규칙 한 줄, 그림 하나를 보여줍니다.
3. **버튼과 레버**: 모드 버튼, 세부 버튼, 레버 두 개가 화면 세로 가운데에 모여 있습니다. 모드를 바꿔도 위치는 그대로입니다.
4. **표시한 칸**: 네모 친 칸의 숫자를 규칙에 넣은 계산과 지금 화면의 칸 수를 보여줍니다.

## 모드

### 미디어 아트: 0과 1로 그린 나

인공지능이 사람을 찾은 칸은 `1`, 나머지 칸은 흐린 `0`으로 화면 전체를 채웁니다. 아무도 없으면 화면이 `0`으로 가득 차고, 사람이 들어오면 그 자리만 `1`로 켜집니다.

![아무도 없을 때와 사람이 들어왔을 때](docs/images/readme/media-art-states.webp)

### 색 RGB: 빛 세 가지로 만든 색

`R`/`G`/`B`를 누르면 겹쳐 있던 세 빛이 층층이 나뉜 뒤 고른 빛만 남고, 같은 버튼을 한 번 더 누르면 다시 합쳐집니다.

![R을 눌렀다가 다시 누를 때 세 빛이 층층이 나뉘고 다시 겹쳐지는 애니메이션](docs/images/readme/rgb-split.webp)

고른 빛만 남기면 칸마다 그 빛의 세기(`0`~`255`)가, 전체 색에서는 R · G · B 세 숫자가 그 빛의 색으로 적힙니다. 세 숫자가 들어가도록 전체 색은 칸 크기가 24px 아래로 내려가지 않습니다.

![전체 색의 세 숫자와 R의 숫자 확대](docs/images/readme/rgb-numbers.webp)

### 밝기 단계: 크레파스 몇 자루로 그릴까

밝기를 계단처럼 나누고 칸마다 단계 번호를 적습니다. 단계가 많을수록 사진에 가까워집니다.

| 2단계 (`0`·`1`) | 10단계 (`0`~`9`) | 256단계 (`0`~`255`) |
| :---: | :---: | :---: |
| ![2단계 흑백](docs/images/readme/levels-2.webp) | ![10단계 회색](docs/images/readme/levels-10.webp) | ![256단계 회색](docs/images/readme/levels-256.webp) |

2단계에서는 오른쪽 레버로 **흑백 경계값**(`0`~`255`)을 옮깁니다. 경계값보다 밝은 칸은 `1`, 어두운 칸은 `0`입니다.

![흑백 경계값을 40에서 220까지 옮기는 모습](docs/images/readme/threshold.webp)

### 수학 처리: 숫자를 계산하면 사진이 바뀐다

회색 칸의 숫자에 계산을 하나 적용합니다. 같은 버튼을 다시 누르면 원본 숫자로 돌아가고, 오른쪽 레버로 세기를 바꿉니다.

| 계산 | 새 값 | 레버 |
| --- | --- | --- |
| 밝기 | 값 + 더할 수 | −120 ~ +120 |
| 대비 | (값 − 128) × 곱할 수 + 128 | × 0 ~ 3 |
| 블러 | 주변 칸의 **가우시안 무게 평균** (3×3: 모서리 1 · 옆 2 · 가운데 4 ÷ 16) | 3×3 · 5×5 · 7×7 |
| 선명 | 값 + (값 − 3×3 무게 평균) × 세기 | × 0 ~ 3 |

결과는 반올림하고 `0`~`255` 안으로 자릅니다.

![같은 칸의 원본 숫자와 계산 결과](docs/images/readme/math-numbers.webp)

규칙 카드는 계산을 한 줄 공식으로 적고 레버 값을 그대로 넣습니다. 밝기와 대비는 칸 하나만 보고 계산하므로 일차함수 그래프(`y = x + 60`, `y = 2(x − 128) + 128`)로, 블러와 선명은 주변 칸까지 보므로 3×3 예시와 무게로 보여줍니다. 그래프와 예시는 화면과 같은 계산 함수를 씁니다.

![밝기 · 대비 · 블러 · 선명 규칙 카드](docs/images/readme/math-cards.webp)

블러를 고르면 레버 바로 아래에 "① 칸 크기를 12px까지 줄이고 ② 흐림 범위를 바꿔 보세요" 안내가 잠깐 뜹니다. 처음 크기인 24px 칸에서는 숫자가 흐려지는 모습을 가리고, 숫자가 빠지는 12px부터 흐려지는 게 잘 보이기 때문입니다. 안내는 다음에 움직일 레버를 가리키며 그 레버를 빛나게 하고, 10초가 지나거나 작은 칸에서 흐림 범위를 바꾸면 사라집니다. 터치는 막지 않습니다.

## 레버

버튼 아래에 큰 레버 두 개가 나란히 있습니다.

- **왼쪽 · 칸 크기**: 모든 모드에서 8~48px 칸을 고릅니다. 처음에는 24px이고, 숫자가 7px보다 작아지는 칸은 색만 칠합니다.
- **오른쪽 · 지금 화면의 레버**: 밝기 2단계의 흑백 경계값, 수학 처리의 세기처럼 화면마다 바뀝니다. 레버가 없는 화면에서는 같은 자리에 짧은 안내가 있습니다.

![모드별 버튼과 레버](docs/images/readme/controls.webp)

![칸 크기 레버를 8px에서 48px까지 움직이는 모습](docs/images/readme/cell-size.webp)

## 돋보기

작품 화면을 누르고 있으면 손가락 위에 3배 돋보기가 떠서 작은 숫자도 읽을 수 있습니다. 돋보기는 손가락 아래 칸에 네모를 치고, 그 칸의 계산을 돋보기 옆에 적습니다. 블러와 선명에서는 함께 평균 내는 주변 칸과 무게(×1 · ×2 · ×4)도 표시합니다. 누르고 있는 동안 손가락을 따라 움직이고, 떼면 사라집니다. 마지막으로 누른 칸은 표시한 칸으로 남습니다.

![누르고 끌면 돋보기가 따라오며 그 칸의 계산을 적는 모습](docs/images/readme/magnifier.webp)

## 설명

여러 나이의 관람객이 짧게 머무는 전시라서, 처음 화면에는 꼭 필요한 것만 두고 수학은 관람객이 손을 대는 만큼 더 보여줍니다.

- **한눈에 · 규칙 카드**: 이름, 계산 규칙 한 줄, 그림 하나만 둡니다. 용어 칩과 긴 문장은 없습니다.
- **내 숫자로 · 표시한 칸**: 네모 친 칸의 실제 숫자를 규칙에 넣은 계산을 레버 바로 아래에 보여줍니다. 레버를 움직이면 계산이 같이 바뀝니다.
- **누르면 · 돋보기**: 누른 칸의 계산이 손가락 옆에 뜹니다.

![미디어 아트 · 색 RGB · R · 밝기 단계 규칙 카드](docs/images/readme/cards.webp)

![레버를 움직이면 표시한 칸의 계산과 그래프가 같이 바뀌는 모습](docs/images/readme/marked-cell.webp)

미디어 아트에서는 AI가 칸마다 계산한 사람일 확률이 63% 이상이면 1이 됩니다. 표시한 칸 자리에는 화면에서 1인 칸의 비율이, 돋보기에는 누른 칸의 확률이 나옵니다.

## 조작

| 하고 싶은 것 | 터치 | 키보드 |
| --- | --- | --- |
| 모드 고르기 | `미디어 아트` / `색 RGB` / `밝기 단계` / `수학 처리` | `1` / `2` / `3` / `4` |
| 빛 하나 고르기 · 풀기 | `R` / `G` / `B` (한 번 더 누르면 전체 색) | |
| 밝기 단계 고르기 | `2단계` / `10단계` / `256단계` | |
| 계산 고르기 · 풀기 | `밝기` / `대비` / `블러` / `선명` (한 번 더 누르면 원본) | |
| 칸 크기 · 세기 바꾸기 | 레버 | |
| 크게 보기 · 칸 계산 보기 | 작품 화면을 꾹 누르기 | |
| 한국어 / English | 버튼 묶음 첫 줄의 `한국어` / `English` | |
| 종료 | | `Esc` |

## 실행

```bash
npm install
npm start
```

## 개발

```bash
npm test
npm run lint
```

- **문구 고치기**: 규칙 카드 문구는 [src/renderer/data/modeExplanations.js](src/renderer/data/modeExplanations.js), 표시한 칸과 돋보기의 계산식은 [src/renderer/core/cellReadout.js](src/renderer/core/cellReadout.js), 모드 · 세부 버튼 · 레버는 [src/renderer/data/modeOptions.js](src/renderer/data/modeOptions.js)에 있습니다.
- **칸 크기**: 처음 크기는 [src/renderer/config.js](src/renderer/config.js)의 `FONT_SIZE`(`24px`), 레버의 단계는 `CELL_SIZES`입니다.
- **카메라 해상도**: [src/renderer/core/camera.js](src/renderer/core/camera.js)에서 `640×480`을 요청합니다.
- **숨은 모드**: 키보드 `5`~`9`는 예전 모드(부산 수학문화관, 픽셀 수치, RGB, 8비트 회색, 4비트 컬러)입니다.
- **배포**: `package.json` 버전을 올리는 bump 커밋과 [CHANGELOG.md](CHANGELOG.md) 새 항목을 함께 `main`에 병합하면 배포됩니다. 자세한 순서는 [docs/windows-distribution.md](docs/windows-distribution.md)에 있습니다.
- **소개 사이트**: [site/](site/)의 페이지와 README 스크린샷, `CHANGELOG.md`(영어는 `CHANGELOG.en.md`)로 만든 패치노트를 `npm run site`가 `_site/`에 묶습니다. 한국어 / English와 밝은 / 어두운 화면을 고를 수 있습니다. `main`에 병합하면 `.github/workflows/pages.yml`이 GitHub Pages에 올립니다.

### 코드 구조

| 위치 | 하는 일 |
| --- | --- |
| `src/renderer/renderer.js` | 상태, 버튼, 레버, 돋보기, 카메라 시작을 묶는 진입점 |
| `src/renderer/core/frameLoop.js` | 매 프레임 카메라를 칸으로 나눠 모드별로 그림 |
| `src/renderer/core/channelOverlay.js` | WebGL로 칸 색과 RGB 레이어를 그림 |
| `src/renderer/core/imageMath.js` | 수학 처리 계산(밝기 · 대비 · 가우시안 블러 · 선명) |
| `src/renderer/core/cellReadout.js` | 표시한 칸 하나를 다시 읽어 계산식으로 적음 |
| `src/renderer/modes/` | 모드별 칸 · 숫자 그리기와 RGB 전환 애니메이션 |
| `src/renderer/ui/` | 규칙 카드, 표시한 칸, 그림 · 그래프, 레버, 블러 안내, 돋보기 |
| `src/renderer/data/` | 모드 · 버튼 · 레버 규칙과 설명 문구 |
| `site/`, `scripts/build-site.js` | 소개 사이트와 패치노트 페이지 |
