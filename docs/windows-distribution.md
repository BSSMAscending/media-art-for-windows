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
   ```

   `--no-git-tag-version`을 빼면 npm이 로컬 태그와 `1.0.3` 메시지 커밋을 만들고, 이 메시지는 commitlint를 통과하지 못합니다. 태그는 배포 워크플로가 붙입니다.
2. `CHANGELOG.md`에 새 버전 항목을 씁니다. **이 항목이 Release 제목과 본문이 됩니다.** 쓰는 법은 아래 [변경 기록 쓰기](#변경-기록-쓰기)에 있습니다.
3. 두 변경을 `chore: bump version to v1.0.3`로 함께 커밋하고 `main`으로 PR을 엽니다. `Validate version bump` 검사가 다음을 확인하고, 배포될 Release 제목을 알려줍니다.
   - 버전 형식(`X.Y.Z`)
   - `package-lock.json` 버전 일치
   - 기존 태그보다 높은 버전인지
   - `CHANGELOG.md` 항목이 있는지
4. PR을 병합하면 `publish-windows-release.yml`이 배포합니다.

`publish-windows-release.yml`은 `main`에 푸시될 때마다 실행되지만, 배포 여부는 커밋 메시지가 아니라 버전으로 판단합니다. `package.json` 버전의 `vX.Y.Z` 태그가 이미 있으면 아무것도 하지 않고, 없을 때만 다음을 진행합니다.

1. `CHANGELOG.md`에서 그 버전 항목을 읽습니다. 없거나 비어 있으면 빌드 전에 멈춥니다.
2. Windows에서 `npm install`, `npm run make -- --platform=win32 --arch=x64`를 실행합니다.
3. `out/make/squirrel.windows/x64/`의 `Setup.exe`, `.nupkg`, `RELEASES`를 공개 Release에 업로드합니다.
4. 마지막으로 그 커밋에 `vX.Y.Z` 태그를 붙입니다.

태그를 업로드가 끝난 뒤에 붙이므로, 중간에 실패하면 태그가 남지 않습니다. Actions의 `Publish Windows release`에서 다시 실행하거나 다음 `main` 푸시 때 다시 배포를 시도합니다.

`v*` 태그는 손으로 푸시하지 않습니다. 워크플로는 태그가 있는 버전을 이미 배포된 것으로 보므로, 배포 전에 태그를 먼저 붙이면 그 버전은 배포되지 않습니다.

## 변경 기록 쓰기

[`CHANGELOG.md`](../CHANGELOG.md)는 버전마다 바뀐 점을 최신 버전부터 적는 파일입니다. [Keep a Changelog](https://keepachangelog.com/) 형식을 따릅니다.

- **평소**: 기능 PR을 병합할 때 `## [Unreleased]` 아래에 한 줄씩 적어 둡니다. 배포 직전에 한꺼번에 써도 됩니다.
- **배포할 때**: `## [Unreleased]` 바로 아래에 새 버전 제목 줄을 넣습니다. 그러면 그동안 적은 내용이 그 버전 항목이 되고, `## [Unreleased]`는 빈 채로 남습니다.

```markdown
## [Unreleased]

## [1.1.0] - 2026-10-28 - 설명 모드 개편

### 새 기능

- 색 RGB 모드를 추가했습니다.

### 고친 점

- 모드를 바꿀 때 버튼이 움직이던 문제를 고쳤습니다.
```

- **제목 줄**: `## [버전] - 날짜` 형식입니다. 끝에 ` - 제목`을 붙이면 Release 제목이 `v1.1.0 설명 모드 개편`이 됩니다. 붙이지 않으면 `v1.1.0 Busan Mathematical Culture Center – Media Art`가 됩니다.
- **본문**: 제목 줄 아래부터 다음 `## ` 제목 전까지가 그대로 Release 본문이 됩니다. 항목 안의 소제목은 `###`로 씁니다. `##`를 쓰면 거기서 항목이 끝납니다.
- **소제목**: 자유롭게 정해도 되지만 `새 기능`, `바뀐 점`, `고친 점`으로 나누면 읽기 쉽습니다.
- **이미 배포한 항목**: 고쳐도 이미 만들어진 Release 본문은 바뀌지 않습니다. 필요하면 Release 페이지에서 직접 고칩니다.
- **영문 패치노트 (선택)**: [`CHANGELOG.en.md`](../CHANGELOG.en.md)에 같은 형식으로 영어 항목을 적으면 사이트를 영어로 볼 때 그 내용이 나옵니다. 영어 항목이 없는 버전은 한국어 내용이 그대로 보입니다. Release 본문과 배포 검사는 `CHANGELOG.md`만 씁니다.
- **패치노트 페이지**: [소개 사이트의 패치노트](https://bssmascending.github.io/media-art-for-windows/patch-notes.html)는 이 파일로 만들어지고, `main`에 병합할 때마다 다시 올라갑니다. `## [Unreleased]`에 적은 내용은 "다음 버전 · 준비 중"으로 보입니다.

`npm test`도 현재 `package.json` 버전의 항목이 있는지 확인합니다. 버전만 올리고 커밋하려 하면 pre-commit에서 바로 알려줍니다.

현재 Windows 코드 서명 인증서는 사용하지 않습니다. 따라서 설치 또는 업데이트 실행 시 Microsoft SmartScreen 경고가 표시될 수 있으며, 자동 업데이트 구현만으로 이 경고는 제거되지 않습니다.
