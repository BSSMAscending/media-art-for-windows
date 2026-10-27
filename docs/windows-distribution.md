# Windows 배포와 자동 업데이트

## 설치 바로가기

이 앱은 Electron Forge의 Squirrel.Windows maker와 `electron-squirrel-startup`을 유지합니다.
`src/main/index.js`가 시작 시 이 패키지를 실행하면 Squirrel 이벤트를 처리합니다.

- 설치와 업데이트(`--squirrel-install`, `--squirrel-updated`)에서는 `Update.exe --createShortcut`을 실행해 바탕화면과 시작 메뉴 바로가기를 만듭니다.
- 제거(`--squirrel-uninstall`)에서는 `Update.exe --removeShortcut`으로 바로가기를 제거합니다.
- 업데이트도 같은 바로가기 대상을 다시 등록하므로 바로가기 상태를 유지합니다.

이 바로가기 처리는 자동 업데이트 기능을 도입하기 전부터 있던 Squirrel 이벤트 처리입니다. 이 문서는 그 기존 동작을 설명하며, 이미 설치된 앱에 바로가기를 소급 생성하는 별도 기능은 제공하지 않습니다.

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

## 브랜치와 배포 순서

작업 브랜치는 `main`에서 만들고 `main`으로 PR을 보냅니다. 병합해도 `package.json` 버전이 그대로면 배포되지 않고, `build-windows-development.yml`이 확인용 설치 파일만 Actions 아티팩트로 만듭니다.

배포는 버전을 올리는 **bump 커밋**으로 합니다.

1. `main`에서 브랜치를 만들고 버전을 올립니다. `package.json`과 `package-lock.json`이 함께 바뀝니다.

   ```bash
   npm version patch --no-git-tag-version   # 1.0.2 → 1.0.3 (minor, major도 가능)
   git commit -am "chore: bump version to v1.0.3"
   ```

   `--no-git-tag-version`을 빼면 npm이 로컬 태그와 `1.0.3` 메시지 커밋을 만들고, 이 메시지는 commitlint를 통과하지 못합니다. 태그는 배포 워크플로가 붙입니다.
2. `main`으로 PR을 엽니다. **PR 본문이 Release 본문이 됩니다.** `Validate version bump` 검사가 버전 형식(`X.Y.Z`), `package-lock.json` 일치, 기존 태그보다 높은지 확인합니다.
3. PR을 병합하면 `publish-windows-release.yml`이 배포합니다.

`publish-windows-release.yml`은 `main`에 푸시될 때마다 실행되지만, 배포 여부는 커밋 메시지가 아니라 버전으로 판단합니다. `package.json` 버전의 `vX.Y.Z` 태그가 이미 있으면 아무것도 하지 않고, 없을 때만 다음을 진행합니다.

1. Windows에서 `npm install`, `npm run make -- --platform=win32 --arch=x64`를 실행합니다.
2. `out/make/squirrel.windows/x64/`의 `Setup.exe`, `.nupkg`, `RELEASES`를 공개 Release `vX.Y.Z Busan Mathematical Culture Center – Media Art`에 업로드합니다. 본문은 bump 커밋을 병합한 PR 본문이고, PR 없이 직접 푸시했으면 GitHub이 이전 태그 이후 병합된 PR 목록으로 만든 노트입니다.
3. 마지막으로 그 커밋에 `vX.Y.Z` 태그를 붙입니다.

태그를 업로드가 끝난 뒤에 붙이므로, 중간에 실패하면 태그가 남지 않습니다. Actions의 `Publish Windows release`에서 다시 실행하거나 다음 `main` 푸시 때 다시 배포를 시도합니다.

`v*` 태그는 손으로 푸시하지 않습니다. 워크플로는 태그가 있는 버전을 이미 배포된 것으로 보므로, 배포 전에 태그를 먼저 붙이면 그 버전은 배포되지 않습니다.

현재 Windows 코드 서명 인증서는 사용하지 않습니다. 따라서 설치 또는 업데이트 실행 시 Microsoft SmartScreen 경고가 표시될 수 있으며, 자동 업데이트 구현만으로 이 경고는 제거되지 않습니다.
