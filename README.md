# Binary Media Art

웹캠으로 포착한 사람의 실루엣을 실시간으로 분석해 여러 미디어 아트 모드로 표현하는 Electron 설치 작품입니다.

## 실행

```bash
npm install
npm start
```

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
