# RAIM 방문자 관리 시스템 - 기술 아키텍처 및 파이프라인 명세서

## 1. 시스템 개요 (System Overview)
RAIM 방문자 관리 시스템은 모바일 및 데스크톱 환경을 완벽하게 지원하는 오프라인 퍼스트(Offline-First) 프로그레시브 웹 앱(PWA)입니다. 실시간 방문객 카운팅, 데이터 시각화, Gemini AI 기반 지능형 인사이트 분석, 엑셀/PDF 정형화된 리포트 출력 기능을 모두 통합한 풀스택(Full-Stack) 애플리케이션입니다.

---

## 2. 전체 시스템 아키텍처 (System Architecture Layer)

### 2.1 프론트엔드 (Client-Side Layer)
* **Core Framework**: React 18 + Vite + TypeScript (SPA 기반)
* **Styling & UI**: Tailwind CSS (반응형 유틸리티 클래스 적용), Framer Motion (부드러운 인터랙션 애니메이션), Lucide React (확장형 아이콘 라이브러리)
* **Data Visualization**: Recharts (대시보드의 도넛 파이 차트, 바 차트, 라인 차트 동적 렌더링)
* **PWA & Offline Capability**: Vite PWA Plugin, Workbox 기술을 활용해 네트워크 연결이 끊긴 상태에서도 캐시된 에셋으로 작동을 보장

### 2.2 백엔드 (Server-Side Layer)
* **Runtime & Framework**: Node.js + Express
* **Role**: 
  * API 라우팅 및 빌드된 프론트엔드 정적 파일 서빙을 담당합니다.
  * **보안 계층(Security Layer)**: Gemini API Key와 같은 민감한 시크릿 키가 브라우저에 노출되지 않도록, 프록시 역할을 수행하는 `/api/*` 엔드포인트를 제공합니다.

### 2.3 데이터베이스 및 인증 (Data & Auth Layer)
* **Database (Firebase Firestore)**: 
  * `initializeFirestore`와 `persistentLocalCache` 전략을 사용하여, 기기가 오프라인 상태일 때는 IndexedDB에 로컬로 데이터를 쌓고, 온라인 상태로 전환 시 Firestore 백엔드와 백그라운드에서 데이터를 병합(Sync)합니다.
  * 실시간 리스너 설정을 통해 카운터에서 입력한 데이터가 대시보드를 띄워둔 모든 모니터에 즉각 반영됩니다.
* **Authentication (Firebase Auth)**: 이메일/비밀번호 기반 로그인 시스템과 함께 특정 계정(`wlgns1232356@gmail.com`)에 최고 관리자 권한을 부여해 보안 PIN 초기화 등을 관리합니다.

---

## 3. 핵심 데이터 파이프라인 (Core Data Pipelines)

### 3.1 실시간 카운팅 파이프라인 (Real-time Counting Flow)
1. **Input**: 관리자가 카운터 화면에서 방문객 유형(자율/예약), 성별, 연령별 증감 버튼을 클릭합니다.
2. **Local State & UI**: 로컬 상태가 즉시 업데이트되어 UI에 반영됩니다(Optimistic Update 로직 적용 및 햅틱 진동 피드백).
3. **Persistence**: Firestore 서버에 데이터를 기록합니다. 네트워크 단절 시 브라우저 내부 캐시(IndexedDB)에 임시 보관됩니다.
4. **Broadcast**: 데이터 변경 사항이 실시간 리스너를 통해 연결된 모든 클라이언트 기기로 전파됩니다.

### 3.2 Gemini AI 데이터 분석 파이프라인 (AI Insight Flow)
1. **Data Aggregation**: 프론트엔드 대시보드 컴포넌트가 `totalRecords`(방문 총합), `sessionAverages`(시간대별 평균), `programTotals`(프로그램별 합계) 등의 원시 데이터를 종합합니다.
2. **API Proxying**: 클라이언트에서 백엔드(`/api/ai-insight`)로 종합된 JSON 통계 데이터를 전송합니다.
3. **Prompt Engineering**: 백엔드는 전달받은 다각적 데이터를 기반으로 "단순 텍스트 요약이 아닌 심층적인 운영 방향을 제시하라"는 시스템 프롬프트 규칙을 삽입하여 LLM에 질문을 구성합니다.
4. **LLM Processing**: Google GenAI(`gemini-1.5-flash` 등) 모델이 가장 붐비는 시간대, 타겟 연령층의 쏠림 현상 등을 분석하여 텍스트를 추론합니다.
5. **Output Delivery**: 생성된 AI 인사이트를 클라이언트가 수신하여 대시보드 최상단 위젯에 자연스러운 타이핑 애니메이션으로 출력합니다.

### 3.3 엑셀(XLSX) 리포트 파이프라인 (Report Generation Flow)
1. **Trigger**: 관리자가 대시보드에서 '엑셀 내보내기'를 클릭합니다.
2. **Template Fetching**: **[핵심 규칙 준수]** 새로운 엑셀을 밑바닥부터 생성하지 않고, 서버에 위치한 `public/sheets/양식.xlsx` 정적 파일을 `fetch`하여 ArrayBuffer 형태로 가져옵니다.
3. **Buffer Parsing**: `exceljs` 모듈의 `workbook.xlsx.load()` 기능을 활용해 원본 템플릿의 서식, 병합된 셀, 스타일을 100% 유지하며 메모리 상에 적재합니다.
4. **Data Mapping**: 평일/주말 등 분석 조건에 따라 적절한 템플릿 시트를 선택하고, 카운터에서 입력받은 방문자 데이터(예약, 자율, 취소, 노쇼 등)를 UI 상의 위치와 동일하게 지정된 셀(Cell) 좌표에 맵핑합니다.
5. **Download Trigger**: 완성된 워크북 객체를 브라우저 Blob 데이터로 변환 후 사용자 PC에 다운로드를 실행합니다.

---

## 4. 인프라 배포 파이프라인 (Build & Deploy Pipeline)
1. **Frontend Build**: `vite build`를 실행하여 React 코드와 에셋을 최적화된 정적 파일 묶음(`dist/` 폴더)으로 컴파일합니다.
2. **Backend Bundle**: `esbuild`를 사용하여 `server.ts`와 Express 로직을 단일 의존성 파일인 `dist/server.cjs`로 압축 번들링합니다.
3. **Containerization**: 완성된 `dist/` 빌드 폴더를 기반으로 Google Cloud Run 컨테이너에 탑재(Deploy)되어 트래픽 변동에 따라 자동으로 스케일링(Scale-to-Zero 지원) 되며 전 세계로 서빙됩니다.
