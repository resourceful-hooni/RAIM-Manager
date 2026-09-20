# 프로젝트 핵심 규칙 (Project Rules)

1. **엑셀 출력 양식 유지**:
   - `exportToXLSX` 함수 구현 시, 절대로 새로운 워크북을 바닥부터 생성해서는 안 됩니다.
   - 반드시 `public/sheets/양식.xlsx` 템플릿 파일을 `fetch`로 불러와서 `exceljs`의 `workbook.xlsx.load(arrayBuffer)`로 읽어들여 사용해야 합니다.
   - 주중/주말에 따라 적절한 시트를 선택하고 데이터를 채워넣는 방식을 엄격하게 유지하십시오. 출력 양식을 임의로 변경하지 마세요.

2. **데이터 매핑**:
   - '예약 수', '취소', '노쇼' 등의 데이터는 사용자가 첨부한 이미지 UI와 동일하게 UI 상에서 입력받고 엑셀에도 정확히 매핑해야 합니다.
   - AI 인사이트는 단순히 텍스트만 넣지 말고 대시보드의 다양한 데이터(totalRecords, sessionAverages, programTotals 등)를 prompt에 넘겨서 다양하고 깊이있는 분석 결과를 반환하도록 합니다.

3. **예약자 개인정보 취급 (출석부 변환 기능)**:
   - 예약현황조회 업로드로 들어온 **신청자 이름·휴대폰번호는 어떤 경우에도 서버에 남기지 않습니다.** Firestore 저장, `/api/*` 전송, 콘솔 출력, localStorage·IndexedDB 저장 모두 금지입니다.
   - 관련 코드(`src/lib/reservationUtils.ts`, `attendanceExport.ts`, `attendanceDownload.ts`, `src/pages/AttendancePage.tsx`)에는 `fetch`·`@/lib/firebase`·`useStore`·`console.*`를 넣지 마십시오. 데이터는 페이지의 로컬 상태에만 두고, 오류 메시지·토스트에는 건수만 노출합니다.
   - `exportUtils.ts`의 `showDiagnosticsModal`은 파일 원본 바이트를 화면과 클립보드에 노출하므로 이 기능에서 절대 재사용하지 마십시오.
   - 출석부 양식도 1번 규칙과 같은 이유로 `src/lib/attendanceTemplateBase64.ts`에 인라인되어 있습니다. 양식을 고쳤다면 `public/sheets/출석부양식.xlsx`를 수정한 뒤 `node scripts/generate-attendance-template.mjs`로 다시 생성하십시오. (서비스 워커가 이진 xlsx를 손상시키는 문제 때문에 `fetch` 방식으로 되돌리면 안 됩니다.)
   - 문자발송 CSV는 문자발송 프로그램 규격에 맞춰 **CP949 인코딩·CRLF·헤더 없음**을 유지해야 합니다. UTF-8 BOM을 넣으면 안 됩니다.
   - `public/sheets/출석부양식.xlsx`는 **엑셀이나 ExcelJS로만 편집**하십시오. openpyxl(파이썬)로 저장한 양식을 쓰면 그 양식으로 만든 출석부를 엑셀이 복구하려 듭니다. 양식을 고친 뒤에는 반드시 실제 엑셀에서 결과물을 열어 확인하십시오.

4. **GitHub Push 및 배포 규칙**:
   - Agent가 코드를 Github에 직접 Push할 때 `fatal: could not read Username for 'https://github.com': No such device or address`와 같은 인증 에러가 빈번하게 발생할 수 있습니다.
   - 사용자가 Github Push를 요청하면, 반드시 환경변수에 등록된 `GITHUB_TOKEN`을 이용하여 인증을 포함한 URL로 Push를 수행해야 합니다.
   - 명령어 예시: `sh -c 'git push "https://oauth2:${GITHUB_TOKEN}@github.com/resourceful-hooni/RAIM-Manager.git" master:main --force'`
