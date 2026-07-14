# 프로젝트 핵심 규칙 (Project Rules)

1. **엑셀 출력 양식 유지**:
   - `exportToXLSX` 함수 구현 시, 절대로 새로운 워크북을 바닥부터 생성해서는 안 됩니다.
   - 반드시 `public/sheets/양식.xlsx` 템플릿 파일을 `fetch`로 불러와서 `exceljs`의 `workbook.xlsx.load(arrayBuffer)`로 읽어들여 사용해야 합니다.
   - 주중/주말에 따라 적절한 시트를 선택하고 데이터를 채워넣는 방식을 엄격하게 유지하십시오. 출력 양식을 임의로 변경하지 마세요.

2. **데이터 매핑**:
   - '예약 수', '취소', '노쇼' 등의 데이터는 사용자가 첨부한 이미지 UI와 동일하게 UI 상에서 입력받고 엑셀에도 정확히 매핑해야 합니다.
   - AI 인사이트는 단순히 텍스트만 넣지 말고 대시보드의 다양한 데이터(totalRecords, sessionAverages, programTotals 등)를 prompt에 넘겨서 다양하고 깊이있는 분석 결과를 반환하도록 합니다.

3. **GitHub Push 및 배포 규칙**:
   - Agent가 코드를 Github에 직접 Push할 때 `fatal: could not read Username for 'https://github.com': No such device or address`와 같은 인증 에러가 빈번하게 발생할 수 있습니다.
   - 사용자가 Github Push를 요청하면, 반드시 환경변수에 등록된 `GITHUB_TOKEN`을 이용하여 인증을 포함한 URL로 Push를 수행해야 합니다.
   - 명령어 예시: `sh -c 'git push "https://oauth2:${GITHUB_TOKEN}@github.com/resourceful-hooni/RAIM-Manager.git" master:main --force'`
