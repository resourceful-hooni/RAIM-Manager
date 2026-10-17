# 크롬 웹스토어 등록 자료

개발자 대시보드(https://chrome.google.com/webstore/devconsole)에 그대로 옮겨 적을 내용입니다.
이 폴더(`extension/store/`)는 확장 zip에 들어가지 않습니다.

## 올릴 파일

- 패키지: `npm run ext:pack` → `release/raim-extension-<버전>-store.zip` (manifest의 `key`를 뺀 zip)
- 스토어 아이콘 128×128: `extension/icons/icon-128.png`
- 스크린샷 1280×800 (가짜 데이터): `screenshot-1-preview.png`, `screenshot-2-result.png`, `screenshot-3-attendance.png`
- 작은 프로모션 타일 440×280: `promo-small-440x280.png`

## 스토어 등록정보 (Store listing)

- **이름**: RAIM 예약현황 일괄 출력
- **요약** (manifest description과 같음):
  서울시 공공예약 관리자 화면에서 고른 서비스의 예약현황 엑셀을 한 번에 받아 RAIM Manager 출석부 탭으로 넘깁니다.
- **상세 설명**:

  ```
  서울로봇인공지능과학관 직원용 업무 도구입니다.

  공공예약 관리자(예약관리 › 예약현황관리)에서 회차마다 팝업을 열어 엑셀을 출력하던 일을
  "서비스 체크 → 회차 확인 → 보내기" 세 번의 클릭으로 줄입니다.

  • 서비스당 엑셀 1건 (기간 안의 모든 회차를 한 파일로), 이용일 범위 지정(오늘·이번 주말·다음 주말)
  • 사이트의 엑셀 출력과 같은 방식이라 다운로드 사유가 그대로 기록됩니다 (기본: 출석부 작성)
  • 받은 파일은 RAIM Manager 출석부 화면으로 바로 넘어가 회차별 출석부·문자발송 명단이 됩니다
  • 개발자나 제3자 서버로 아무것도 보내지 않습니다. 파일은 브라우저 메모리에만 잠깐 두고, 넘기면 즉시 지웁니다.

  공공예약 관리자 계정이 있어야 쓸 수 있습니다.
  ```

- **카테고리**: 생산성 (Productivity / Workflow & Planning)
- **언어**: 한국어
- **공개 범위(Visibility)**: **비공개 링크(Unlisted)** — 링크를 아는 사람만 설치. 링크는 직원끼리만 공유합니다.

## 개인정보 보호 관행 (Privacy practices)

- **단일 목적 (Single purpose)**:
  공공예약 관리자 화면에서 고른 서비스의 예약현황 엑셀을 받아 RAIM Manager 출석부 화면으로 넘긴다.
  (Export reservation spreadsheets for services the administrator selects on the Seoul public reservation admin page and hand them to the RAIM Manager attendance page in the same browser.)

- **권한 사유 (Permission justification)**:

  | 권한 | 사유 |
  | --- | --- |
  | `storage` | 설정(기본 다운로드 사유·요청 간격) 저장, 넘길 파일을 브라우저 메모리(storage.session)에 잠깐 보관 / Store settings; hold exported files briefly in session (memory) storage until the RAIM tab picks them up. |
  | `alarms` | 넘기지 못한 파일을 5분 뒤 자동 삭제 / Delete unclaimed files after 5 minutes. |
  | 호스트 권한 `https://raim.kimjihoon.me/*` | RAIM Manager 출석부 탭을 찾아 열기 (tabs.query) / Find and focus the RAIM Manager attendance tab. |
  | 콘텐츠 스크립트 `https://yeyak.seoul.go.kr/management/reserv/selectPageListReservSvc.do*` | 예약현황관리 목록에 선택 상자·패널 표시, 같은 사이트의 엑셀 출력 요청 / Add selection checkboxes and a panel to the admin list page and request the site's own export. |
  | `externally_connectable` (`https://raim.kimjihoon.me/*`) | 출석부 화면과 1:1로 파일을 주고받기 / One-to-one hand-off to the RAIM Manager page. |

- **원격 코드 (Remote code)**: 사용하지 않음 (No, I am not using remote code).

- **데이터 사용 (Data usage)** — 아래 두 항목에 체크하고, 세 가지 인증에 모두 동의:
  - [x] 개인 식별 정보 (Personally identifiable information): 예약자 이름·연락처 (관리자 화면의 예약현황 엑셀)
  - [x] 웹사이트 콘텐츠 (Website content): 예약현황 목록·엑셀
  - [x] 승인된 사용 사례 외 제3자에게 판매·전송하지 않음
  - [x] 단일 목적과 무관한 용도로 사용·전송하지 않음
  - [x] 신용도 판단·대출 목적으로 사용·전송하지 않음

  ※ 정보는 브라우저 밖으로 나가지 않지만, 확장이 다루는 정보이므로 보수적으로 표시합니다.

- **개인정보처리방침 URL**: https://raim.kimjihoon.me/extension-privacy.html
  (RAIM Manager를 배포하면 `public/extension-privacy.html`이 이 주소로 올라갑니다. 등록 전에 열리는지 확인하세요.)

## 심사 안내 (Test instructions, 영문 권장)

```
This extension only works for administrators of the Seoul public reservation system
(yeyak.seoul.go.kr/management), which requires a government-issued admin account,
so we cannot provide test credentials. The screenshots show the full flow with test data.

What it does:
1. On the admin page "예약현황관리" it adds a checkbox to each service row and a panel.
2. "1. 회차 확인" reads the session list (no personal data) for the selected services.
3. "2. RAIM으로 보내기" requests the site's own reservation export (the same request as the
   site's "엑셀 출력" button, including the required download reason) once per service,
   keeps the files in chrome.storage.session, opens https://raim.kimjihoon.me/#/attendance,
   and hands the files over through externally_connectable. Files are deleted immediately.
No data is sent anywhere else. No remote code.
```

## 게시 후 할 일

1. 대시보드 **패키지(Package)** 탭 → **공개 키 보기** → 줄바꿈을 지운 한 줄을 `extension/manifest.json`의 `key`로 바꿉니다.
   (개발용 압축해제 설치도 스토어와 같은 ID가 됩니다)
2. 스토어 **항목 ID**를 `src/lib/extensionBridge.ts`의 `RAIM_EXTENSION_IDS`에 넣고,
   스토어 주소를 `RAIM_EXTENSION_STORE_URL`에 넣은 뒤 RAIM Manager를 배포합니다.
   → 출석부 화면에 "크롬 웹스토어에서 설치하기" 링크가 나타납니다.
3. 직원들에게는 스토어 링크만 공유합니다. 업데이트는 새 버전 zip을 올리면 자동으로 퍼집니다
   (manifest의 `version`을 올려야 합니다).
