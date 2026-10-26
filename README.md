# Binary Media Art

웹캠으로 포착한 사람의 실루엣을 실시간으로 분석해 여러 미디어 아트 모드로 표현하는 Electron 설치 작품입니다.

## 실행

```bash
npm install
npm start
```

## 모드

오른쪽 아래의 큰 버튼으로 모드를 고르고, 그 아래 버튼으로 세부 보기를 고릅니다. 키보드 `1`~`3`도 같은 모드를 선택합니다.

- `원본`: 인공지능이 찾은 사람 영역을 0과 1로 표현합니다.
- `색 RGB`: 카메라 화면 전체를 빨강·초록·파랑 빛 세 장으로 보여줍니다. `R`/`G`/`B`를 누르면 세 장이 벌어진 뒤 고른 빛만 남고, 칸마다 0~255 값이 표시됩니다.
- `밝기 단계`: 카메라 화면 전체의 밝기를 `2`/`10`/`256`단계로 나누고 칸마다 단계 번호를 표시합니다.

오른쪽 설명 카드는 모드마다 비유와 짧은 애니메이션으로 원리를 보여줍니다. 문구는 [src/renderer/data/modeExplanations.js](src/renderer/data/modeExplanations.js)에서 고칩니다.

## 문자 크기 조절

문자 크기 선택 UI는 제거되어 있으며, 기본 문자 크기는 `16px`입니다. 크기를 변경하려면 [src/renderer/config.js](src/renderer/config.js)의 `FONT_SIZE` 값을 수정합니다.

```js
const FONT_SIZE = 16;
```

예를 들어 `const FONT_SIZE = 12;`로 바꾸면 더 촘촘하게, `const FONT_SIZE = 20;`으로 바꾸면 더 크게 렌더링됩니다. 변경 후 앱을 다시 실행해야 적용됩니다.

## 검사

```bash
npm test
npm run lint
```
