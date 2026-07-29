# Windows 배포와 자동 업데이트

## 설치 바로가기

이 앱은 Electron Forge의 Squirrel.Windows maker와 `electron-squirrel-startup`을 유지합니다.
`src/main/index.js`가 시작 시 이 패키지를 실행하면 Squirrel 이벤트를 처리합니다.

- 설치와 업데이트(`--squirrel-install`, `--squirrel-updated`)에서는 `Update.exe --createShortcut`을 실행해 바탕화면과 시작 메뉴 바로가기를 만듭니다.
- 제거(`--squirrel-uninstall`)에서는 `Update.exe --removeShortcut`으로 바로가기를 제거합니다.
- 업데이트도 같은 바로가기 대상을 다시 등록하므로 바로가기 상태를 유지합니다.

이 처리는 새 Squirrel 설치/업데이트 이벤트에서만 실행됩니다. 이미 설치되어 있는 앱에는 바탕화면 바로가기가 소급 생성되지 않을 수 있으므로, 이 변경이 포함된 빌드에서는 새로 설치해 확인해야 합니다.

## 자동 업데이트

Windows 패키지 앱은 Electron 기본 `autoUpdater`를 사용합니다. 별도 라이브러리보다 현재 Squirrel.Windows maker와 직접 호환되고, Electron이 제공하는 Squirrel 업데이트 경로를 그대로 사용하기 때문입니다.

업데이트 피드는 공개 저장소 `BSSMAscending/media-art-for-windows-releases`의 GitHub Release만 조회합니다. 앱은 다음 공개 피드를 사용하며 GitHub 토큰을 포함하지 않습니다.

```
https://update.electronjs.org/BSSMAscending/media-art-for-windows-releases/win32-x64/<현재-버전>
```

Electron의 공개 업데이트 서비스는 최신 GitHub Release의 Squirrel `RELEASES` 메타데이터와 `.nupkg`를 반환합니다. 소스 저장소는 이 경로에 포함되지 않습니다.

- 패키징된 Windows 앱에서만, 시작 5초 뒤에 백그라운드 확인합니다.
- 업데이트가 없거나 확인에 실패하면 UI를 표시하지 않고 앱은 계속 실행됩니다.
- 새 버전이 있으면 좌측 상단의 작은 상태 패널이 다운로드 중임을 알리고, 완료되면 `지금 재시작` 또는 `나중에`를 제공합니다.
- `--squirrel-firstrun`, 설치, 업데이트, 삭제, obsolete 이벤트에서는 확인하지 않습니다. 첫 실행에는 Squirrel 파일 잠금이 존재할 수 있기 때문입니다.

공식 참고 문서:

- [Electron autoUpdater API](https://www.electronjs.org/docs/latest/api/auto-updater/)
- [Electron 업데이트 가이드](https://www.electronjs.org/docs/latest/tutorial/updates)
- [Electron 배포 및 업데이트 튜토리얼](https://www.electronjs.org/docs/latest/tutorial/tutorial-publishing-updating)

## 배포 순서

1. `package.json`의 버전을 변경해 `dev`에 병합합니다.
2. `dev`에서 `release: vX.Y.Z` 제목의 PR을 `main`으로 병합합니다.
3. 병합된 `main` 커밋에 `vX.Y.Z` 태그를 푸시합니다.

태그 푸시의 `publish-windows-release.yml`은 Windows에서 `npm install`, `npm run make -- --platform=win32 --arch=x64`를 실행하고 `out/make/squirrel.windows/x64/`의 `Setup.exe`, `.nupkg`, `RELEASES`를 공개 Release에 업로드합니다. 생성되는 Release의 제목은 `vX.Y.Z Busan Mathematical Culture Center – Media Art`이며, 본문은 해당 태그 커밋의 `dev` → `main` release PR 본문을 그대로 사용합니다.

현재 Windows 코드 서명 인증서는 사용하지 않습니다. 따라서 설치 또는 업데이트 실행 시 Microsoft SmartScreen 경고가 표시될 수 있으며, 자동 업데이트 구현만으로 이 경고는 제거되지 않습니다.
