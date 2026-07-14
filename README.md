# RAIM 방문객 관리 시스템 (Visitor Management System)

서울로봇인공지능과학관(RAIM) 전시 및 체험 프로그램의 방문객 데이터를 현장에서 수기로 카운팅하고, 이를 실시간으로 집계·시각화·분석하는 풀스택 프로그레시브 웹 애플리케이션(PWA)입니다.

전시장 현장의 불안정한 네트워크를 전제로 한 **오프라인 퍼스트(Offline-First)** 설계, 브라우저 환경에 민감 정보를 노출하지 않는 **경량 프록시 서버** 기반 구조, 그리고 어떠한 장애 상황(네트워크 단절, 외부 API Limit 등)에서도 끊김 없는 사용성을 보장하는 **다층 폴백(Fallback)** 전략을 중심으로 개발되었습니다.

## ✨ 주요 기능 및 특징 (Key Features)

- **오프라인 퍼스트 기반 실시간 카운팅**: 네트워크가 단절되더라도 로컬 캐시(IndexedDB)에 데이터를 저장하고, 복구 시 백그라운드에서 자동 병합합니다. 변경 사항은 OnSnapshot 리스너를 통해 모든 태블릿/PC 모니터에 지연 없이 동기화됩니다.
- **AI 기반 지능형 인사이트 분석**: Gemini 3.5 Flash 모델을 활용하여 다각적인 방문객 통계(시간대 정체, 요일별 흐름 등 5가지 앵글 로테이션)를 분석하고, 운영 방향성을 심층적으로 제시합니다.
- **다층 방어 로직 (Circuit Breaker & Fallback)**: AI API 장애 상황에서도 자체 휴리스틱 알고리즘을 통한 동적 폴백(Dynamic Fallback) 텍스트를 생성하여 무중단 서비스를 제공합니다.
- **관공서 양식 무손실 엑셀(XLSX) 리포트 출력**: 새로운 엑셀을 바닥부터 그리지 않고, 기존 관공서 지정 템플릿(양식.xlsx)을 스트리밍으로 읽어와 서식과 셀 병합을 100% 유지한 채 데이터만 매핑하여 출력합니다.
- **시각화 및 PDF/PNG 내보내기**: Recharts 기반의 통계 시각화 대시보드를 제공하며, 화면 전체를 고해상도 PDF나 PNG 형식의 프레젠테이션 자료로 즉각 추출할 수 있습니다.
- **🤖 과학관 테마 마우스 커서 & 파티클**: 화면에서 로봇 아이콘이 마우스를 따라다니고 클릭/터치 시 파티클이 터지는 특별한 테마 이펙트를 제공합니다.

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript 5.8, Vite 6, Zustand 5, Tailwind CSS 4, Framer Motion 12
- **Backend (Proxy Server)**: Node.js, Express 4, esbuild 단일 번들링
- **Database & Auth**: Firebase Firestore (persistentLocalCache 적용), Firebase Authentication
- **AI Engine**: Google GenAI SDK (gemini-3.5-flash)
- **Data Processing**: Recharts 3, ExcelJS 4, html2canvas, jsPDF

## 🏗 핵심 아키텍처 및 파이프라인 (Architecture Pipelines)

### 1. 실시간 카운팅 및 동기화 파이프라인
현장 운영자가 카운터 화면을 조작하면 Zustand를 통한 Optimistic Update로 즉각 UI에 반영됩니다. 이후 데이터는 Firestore에 기록되며, 오프라인 시 로컬 캐시에 큐잉되었다가 재접속 시 병합됩니다. 모든 데이터 변경은 리스너를 통해 실시간으로 다중 기기에 브로드캐스트됩니다.

### 2. AI 인사이트 분석 프록시 파이프라인
보안을 위해 클라이언트는 직접 AI API를 호출하지 않고 백엔드(`/api/analyze`)를 거칩니다. 백엔드는 **15분 단위 In-Memory 캐싱**을 통해 불필요한 API 호출을 방지하며, 데이터 관점을 5가지(피크 시간 분석, 수요 예측 등)로 로테이션하여 매번 새로운 인사이트를 도출합니다. Gemini 엔진 응답 지연이나 오류 시에는 서버 내장 동적 폴백 함수가 즉시 개입합니다.

### 3. 무손실 엑셀 템플릿 스트리밍 파이프라인
복잡한 보고서 서식 파괴를 막기 위해, 백엔드는 `/api/download-template` 엔드포인트에서 템플릿 엑셀 파일을 무캐시(No-cache) 스트리밍으로 클라이언트에 전달합니다. 클라이언트는 ExcelJS로 ArrayBuffer를 로드하고 통계 데이터만 삽입합니다. (이 과정에서 PWA 서비스 워커가 엑셀 바이너리를 캐싱하여 손상시키는 문제를 방지하기 위한 Workbox 예외 처리가 반영되어 있습니다.)

## 📁 디렉토리 구조 (Directory Structure)

```text
.
├── .github/          # GitHub 배포 액션 
├── dist/             # 빌드된 정적 파일 및 server.cjs
├── src/              # 클라이언트 소스코드
│   ├── components/   # UI 컴포넌트 (레이아웃, 커서 이펙트, 메뉴얼 등)
│   ├── fonts/        # 커스텀 폰트 
│   ├── lib/          # Firebase 초기화 등 유틸리티
│   ├── pages/        # 메인 페이지 (카운터, 대시보드, 기록, 설정)
│   ├── store/        # Zustand 전역 상태 및 Firestore 동기화 훅
│   ├── index.css     # 전역 스타일 (Tailwind)
│   └── main.tsx      # 클라이언트 엔트리포인트 (라우팅 및 PWA)
├── public/           # 정적 에셋
│   └── sheets/       # 무손실 엑셀 템플릿(양식.xlsx)
├── server.ts         # Express 백엔드 (API 프록시, AI 프롬프트)
└── package.json      # 프로젝트 설정 및 스크립트
```

## ⚙️ 로컬 개발 환경 설정 (Getting Started)

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 환경 변수 세팅
# .env.example을 참고하여 .env 파일 생성 및 필요한 시크릿 키(Gemini API Key 등) 기입
cp .env.example .env

# 3. 로컬 개발 서버 실행
npm run dev

# 4. 운영 환경 빌드 (Vite 정적 파일 + esbuild 서버 번들)
npm run build
# -> dist 폴더 내에 정적 에셋과 server.cjs가 생성됩니다.
```

## 🛡 보안 및 데이터 무결성 규칙 (Security & Validation)

- **엄격한 스키마 검증**: `firestore.rules`를 통해 연령, 성별, 관람 유형에 대한 데이터 스키마를 강제합니다. (예: `adult_m/f`, `youth_m/f` 등 8가지 키 누락 및 음수 입력 원천 차단)
- **서버 프록시 처리**: 민감한 서비스 인프라 계정 및 AI 연동 API Key 등은 모두 브라우저를 우회하여 백엔드 서버(Node.js) 안에서만 처리됩니다.
