import { useState, type ComponentType, type ReactNode } from 'react';
import {
  BarChart2,
  Bot,
  BookOpen,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  History,
  Info,
  KeyRound,
  LayoutGrid,
  LogOut,
  Puzzle,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';

/**
 * 시스템 사용 설명서 (헤더의 '설명서' 버튼으로 연다).
 * 화면 문구가 바뀌면 여기 적힌 버튼 이름·숫자도 함께 고친다.
 */

/** 설명서가 기준으로 삼은 앱 버전 (설정 > 앱 정보의 버전과 맞춘다) */
const MANUAL_VERSION = '2.2.5';

type IconType = ComponentType<{ className?: string }>;

const TABS = [
  { id: 'login', label: '1. 로그인 & 보안', icon: KeyRound },
  { id: 'layout', label: '2. 화면 구성', icon: LayoutGrid },
  { id: 'counter', label: '3. 카운터', icon: Users },
  { id: 'smart', label: '4. 편리한 기능', icon: Zap },
  { id: 'dashboard', label: '5. 대시보드 & 보고서', icon: BarChart2 },
  { id: 'history', label: '6. 기록', icon: History },
  { id: 'attendance', label: '7. 출석부', icon: ClipboardList },
  { id: 'extension', label: '8. 크롬 확장', icon: Puzzle },
  { id: 'settings', label: '9. 설정 & 업데이트', icon: Settings },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ───────────────────────── 공통 조각 ─────────────────────────

function Card({ icon: Icon, title, children }: { icon: IconType; title: string; children: ReactNode }) {
  return (
    <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-white shadow-sm space-y-4">
      <h3 className="flex items-center gap-2 text-brand-dark font-bold text-base sm:text-lg">
        <Icon className="w-5 h-5 text-brand-blue shrink-0" />
        <span>{title}</span>
      </h3>
      {children}
    </section>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-sm text-brand-muted leading-relaxed">{children}</p>;
}

/** 번호가 붙은 순서 */
function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2.5 text-xs text-brand-muted leading-relaxed">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className="bg-brand-blue/10 text-brand-blue rounded-md shrink-0 font-bold w-6 h-6 flex items-center justify-center tnum">
            {index + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** 점 목록 */
function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-4 space-y-1.5 text-xs text-brand-muted leading-relaxed">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

const TIP_TONE = {
  info: { box: 'bg-brand-blue/5 border-brand-blue/20', title: 'text-brand-dark', icon: Info, iconColor: 'text-brand-blue' },
  warn: { box: 'bg-amber-50/70 border-amber-200/70', title: 'text-amber-800', icon: ShieldAlert, iconColor: 'text-amber-600' },
  safe: { box: 'bg-emerald-50/60 border-emerald-200/60', title: 'text-emerald-800', icon: ShieldCheck, iconColor: 'text-emerald-600' },
} as const;

function Tip({ tone = 'info', title, children }: { tone?: keyof typeof TIP_TONE; title: string; children: ReactNode }) {
  const style = TIP_TONE[tone];
  const Icon = style.icon;
  return (
    <div className={`border rounded-xl p-4 text-xs space-y-1.5 ${style.box}`}>
      <div className={`flex items-center gap-1.5 font-bold ${style.title}`}>
        <Icon className={`w-4 h-4 shrink-0 ${style.iconColor}`} />
        <span>{title}</span>
      </div>
      <div className="leading-relaxed text-brand-muted space-y-1">{children}</div>
    </div>
  );
}

/** 화면에 보이는 버튼·문구 이름 */
function Ui({ children }: { children: ReactNode }) {
  return (
    <span className="font-bold text-brand-dark bg-brand-blue/5 border border-brand-blue/15 rounded px-1 py-px box-decoration-clone">
      {children}
    </span>
  );
}

/** 이름 + 설명 두 칸 표 */
function Terms({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divide-y divide-brand-blue/10 border border-brand-blue/10 rounded-xl overflow-hidden text-xs bg-white/60">
      {rows.map(([term, description], index) => (
        <div key={index} className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[10rem_1fr] gap-3 px-3 py-2.5">
          <dt className="font-bold text-brand-dark">{term}</dt>
          <dd className="text-brand-muted leading-relaxed">{description}</dd>
        </div>
      ))}
    </dl>
  );
}

// ───────────────────────── 탭별 내용 ─────────────────────────

function LoginTab() {
  return (
    <div className="space-y-6">
      <Card icon={KeyRound} title="로그인 순서">
        <Lead>처음 접속하면 아래 세 단계를 거칩니다. 같은 창을 쓰는 동안에는 다시 묻지 않습니다.</Lead>
        <Steps
          items={[
            <>
              <Ui>관리자 로그인</Ui>을 눌러 구글 계정으로 로그인합니다. 팝업이 막혀 있으면 현재 창에서 로그인이 이어집니다.
            </>,
            <>
              <Ui>보안 비밀번호</Ui> 화면에서 <strong>숫자 6자리 또는 8자리</strong> 비밀번호를 넣고 <Ui>확인</Ui>을 누릅니다. 비밀번호는 모든
              직원이 함께 쓰는 하나입니다.
            </>,
            <>
              <Ui>체험관 선택</Ui>에서 오늘 맡은 체험관(무인자동차 연구소 · 로봇팔 스낵헌터 · 수술로봇 메디봇)을 고릅니다. 고른 체험관은 이
              기기에 기억됩니다.
            </>,
          ]}
        />

        {/* 보안 비밀번호 화면 모형 */}
        <div className="flex justify-center py-2" aria-hidden="true">
          <div className="bg-white/70 border border-white rounded-2xl p-4 w-60 shadow-sm space-y-2 text-center">
            <p className="text-xs font-bold text-brand-dark">보안 비밀번호</p>
            <p className="text-3xs text-brand-muted">숫자 6자리 또는 8자리를 입력해주세요</p>
            <div className="flex justify-center gap-1.5 py-1.5 bg-white/80 border border-brand-blue/15 rounded-lg">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-brand-blue" />
              ))}
            </div>
            <div className="bg-brand-dark text-white text-2xs font-bold rounded-lg py-1.5">확인</div>
          </div>
        </div>
      </Card>

      <Card icon={ShieldCheck} title="비밀번호를 다시 묻는 경우">
        <Bullets
          items={[
            '창(탭)을 닫았다가 다시 열거나, 새 탭으로 접속했을 때',
            <>
              오른쪽 위 <Ui>로그아웃</Ui>을 눌렀을 때 (구글 로그인부터 다시 합니다)
            </>,
            '자리를 비운다고 저절로 잠기지는 않습니다. 공용 PC라면 일을 마친 뒤 꼭 로그아웃해 주세요.',
          ]}
        />
        <Tip tone="warn" title="잘못 입력하면 잠깐 잠깁니다">
          <p>4번까지는 실패 횟수만 알려 줍니다. 5번째부터는 1초 → 5초 → 30초 → 5분 동안 입력이 막힙니다.</p>
          <p>실패 횟수는 기기마다 따로 세고, 비밀번호를 맞게 넣으면 0으로 돌아갑니다.</p>
        </Tip>
      </Card>

      <Card icon={ShieldAlert} title="비밀번호 변경 · 분실">
        <Lead>
          비밀번호를 바꾸거나 초기화하는 일은 <strong>최고 관리자 계정</strong>만 할 수 있습니다. 비밀번호를 잊었다면 시스템 담당자에게
          요청해 주세요.
        </Lead>
        <Terms
          rows={[
            [
              '변경',
              <>
                설정 → <Ui>보안 비밀번호</Ui> → <Ui>비밀번호 변경</Ui> → 새 비밀번호 입력 → <Ui>저장</Ui>
              </>,
            ],
            [
              '분실 시 초기화',
              <>
                최고 관리자 계정으로 로그인하면 비밀번호 화면 아래에 <Ui>비밀번호 초기화 (최고 관리자)</Ui>가 보입니다. 새 비밀번호를 정한 뒤
                그 비밀번호로 다시 들어갑니다.
              </>,
            ],
            [
              '쓸 수 없는 번호',
              '같은 숫자 반복(111111), 연속 숫자(123456), 같은 묶음 반복(121212, 123123), 생년월일 형식(19·20으로 시작하는 날짜)',
            ],
            [
              '다른 계정',
              <>
                계정을 잘못 골랐다면 비밀번호 화면의 <Ui>다른 계정으로 로그인</Ui>을 누릅니다.
              </>,
            ],
          ]}
        />
      </Card>
    </div>
  );
}

function LayoutTab() {
  return (
    <div className="space-y-6">
      <Card icon={LayoutGrid} title="전체 화면 구성">
        <Lead>위쪽 머리글, 가운데 작업 화면, 아래쪽 메뉴 다섯 개로 이루어져 있습니다.</Lead>

        {/* 화면 모형 */}
        <div className="border border-brand-blue/15 bg-white/50 rounded-xl overflow-hidden text-3xs" aria-hidden="true">
          <div className="bg-white/90 p-2.5 flex items-center justify-between border-b border-brand-blue/10">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-brand-light to-brand-blue" />
              <span className="leading-tight">
                <span className="block font-black text-brand-dark">RAIM 무인자동차</span>
                <span className="block text-brand-muted">방문자 카운터</span>
              </span>
              <span className="ml-1 w-5 h-5 rounded-full border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                <RefreshCw className="w-3 h-3" />
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-brand-muted">
              <span className="flex items-center gap-0.5 border border-brand-blue/20 rounded-md px-1 py-0.5">
                <BookOpen className="w-3 h-3" />
                설명서
              </span>
              <span className="flex items-center gap-0.5 text-emerald-600 font-bold">● Online</span>
              <LogOut className="w-3 h-3" />
            </div>
          </div>
          <div className="bg-brand-blue/5 text-brand-muted px-2.5 py-1 border-b border-brand-blue/10">
            (무인자동차) 최근 입력자 : 홍길동 | 14:32:05
          </div>
          <div className="p-4 flex flex-col justify-center items-center min-h-[80px] text-brand-muted">
            <span className="font-bold text-xs">작업 화면</span>
            <span>아래 메뉴에서 고른 화면이 나옵니다.</span>
          </div>
          <div className="border-t border-brand-blue/10 bg-white/90 p-1.5 grid grid-cols-5 text-center font-bold text-brand-muted">
            <span className="flex flex-col items-center text-brand-dark">
              <Smartphone className="w-3.5 h-3.5 text-brand-blue" />
              카운터
            </span>
            <span className="flex flex-col items-center">
              <BarChart2 className="w-3.5 h-3.5" />
              대시보드
            </span>
            <span className="flex flex-col items-center">
              <Clock className="w-3.5 h-3.5" />
              기록
            </span>
            <span className="flex flex-col items-center">
              <ClipboardList className="w-3.5 h-3.5" />
              출석부
            </span>
            <span className="flex flex-col items-center">
              <Settings className="w-3.5 h-3.5" />
              설정
            </span>
          </div>
        </div>

        <Terms
          rows={[
            ['체험관 이름', '지금 집계 중인 체험관입니다. 누르면 카운터 화면으로 돌아갑니다.'],
            [
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> 체험관 변경
              </span>,
              <>
                이름 옆 둥근 버튼입니다. <Ui>변경하기</Ui>를 누르면 체험관 선택 화면으로 갑니다. 마음이 바뀌면{' '}
                <Ui>취소하고 (체험관)(으)로 돌아가기</Ui>를 누릅니다.
              </>,
            ],
            [
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> 설명서
              </span>,
              '지금 보고 있는 이 설명서를 엽니다. 좁은 화면에서는 아이콘만 보입니다.',
            ],
            [
              <span className="flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> Online / Offline
              </span>,
              '인터넷 연결 상태입니다. Offline이어도 계속 입력할 수 있고, 연결되면 자동으로 서버에 보냅니다.',
            ],
            [
              <span className="flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" /> 로그아웃
              </span>,
              '구글 로그인과 비밀번호 확인을 모두 해제합니다.',
            ],
            ['최근 입력자', '이 체험관에 마지막으로 입력한 직원 이름과 시각입니다. 다른 기기에서 입력해도 바로 바뀝니다.'],
          ]}
        />
      </Card>

      <Card icon={Smartphone} title="아래 메뉴">
        <Terms
          rows={[
            ['카운터', '관람객 인원을 세는 기본 화면'],
            ['대시보드', '기간별 통계, AI 분석, 엑셀·PDF 보고서'],
            ['기록', '날짜별로 지금까지 쌓인 기록 보기'],
            ['출석부', '예약현황 엑셀로 출석부·문자발송 명단 만들기'],
            ['설정', '데이터 내보내기·백업, 비밀번호, 동기화 상태, 앱 정보'],
          ]}
        />
      </Card>
    </div>
  );
}

const SESSION_TIMES: [string, string][] = [
  ['무인자동차', '1회차 10:30 · 2회차 13:00 · 3회차 13:30 · 4회차 15:30 · 5회차 16:00'],
  ['스낵헌터', '1회차 11:00 · 2회차 11:30 · 3회차 14:00 · 4회차 14:30 · 5회차 16:30'],
  ['메디봇 (평일)', '1회차 11:00 · 2회차 13:30 · 3회차 14:30 · 4회차 15:30 · 5회차 16:30'],
  ['메디봇 (주말)', '3회차 14:30 · 4회차 15:30만 운영'],
];

function CounterTab() {
  return (
    <div className="space-y-6">
      <Card icon={Users} title="관람 모드">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 space-y-1.5">
            <p className="flex items-center gap-1.5 text-brand-blue font-bold text-xs">
              <Clock className="w-4 h-4" /> 자율관람
            </p>
            <p className="text-xs text-brand-muted leading-relaxed">
              예약 회차가 아닌 시간의 현장 관람입니다. 10시부터 17시까지 <strong>1시간 단위</strong>로 나눠 셉니다.
            </p>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-4 space-y-1.5">
            <p className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
              <RefreshCw className="w-4 h-4" /> 예약관람
            </p>
            <p className="text-xs text-brand-muted leading-relaxed">
              예약 회차 관람입니다. 회차별로 세고, <Ui>취소</Ui>와 <Ui>노쇼 (No-show)</Ui> 인원도 함께 입력합니다. 예약 없이 온 단체는{' '}
              <Ui>단체</Ui> 회차를 직접 골라 입력합니다.
            </p>
          </div>
        </div>
        <Terms rows={SESSION_TIMES} />
      </Card>

      <Card icon={RefreshCw} title="실시간 연동 (회차 자동 전환)">
        <Lead>
          <Ui>관람 모드 및 시간</Ui> 카드 오른쪽 위 버튼이 <Ui>실시간 연동 중</Ui>이면 시각에 맞춰 모드와 회차가 저절로 바뀝니다.
          바뀌면 화면 위에 안내가 뜨니, 입력하기 전에 회차가 맞는지 한 번 확인해 주세요.
        </Lead>
        <div className="relative border-l-2 border-brand-blue/30 pl-4 ml-2 space-y-4 text-xs text-brand-muted">
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-blue" />
            <p className="font-bold text-brand-dark">회차 시작 5분 전</p>
            <p>자율관람 → 예약관람으로 바뀌고 그 회차가 선택됩니다.</p>
          </div>
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <p className="font-bold text-brand-dark">회차 진행 중 (예: 13:00 회차)</p>
            <p>연령·성별로 참여 인원을 세고, 취소·노쇼를 입력합니다.</p>
          </div>
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-dark" />
            <p className="font-bold text-brand-dark">시작 20분 후 + 15분 동안 입력이 없으면</p>
            <p>예약관람 → 자율관람으로 돌아가고 현재 시간대가 선택됩니다.</p>
          </div>
        </div>
        <Bullets
          items={[
            <>
              날짜나 회차를 직접 바꾸면 <Ui>수동 모드 (연동 켜기)</Ui>로 바뀝니다. 지난 날짜를 고칠 때 이렇게 씁니다. 다 고친 뒤 그
              버튼을 눌러 다시 연동을 켜 주세요.
            </>,
            '연동 중에 예약 시간대가 아닌데 예약관람을 누르면 "예약관람은 시작 5분 전부터 전환 가능" 안내만 나옵니다.',
            '예약 시간대에 자율관람을 누르면 연동을 끌지 묻습니다. 예를 누르면 수동 모드가 됩니다.',
          ]}
        />
      </Card>

      <Card icon={Smartphone} title="인원 세기">
        <Steps
          items={[
            <>
              <Ui>성인</Ui> · <Ui>청소년</Ui> · <Ui>어린이</Ui> · <Ui>유아</Ui> 카드에서 남/여 줄의 <strong>+</strong>를 누릅니다. 잘못
              더했으면 <strong>−</strong>를 누릅니다.
            </>,
            <>
              예약관람이면 아래쪽 <Ui>취소</Ui>(예약 취소 인원)와 <Ui>노쇼 (No-show)</Ui>(예약 후 오지 않은 인원)도 입력합니다.
            </>,
            <>
              <Ui>관람 모드 및 시간</Ui> 옆 <Ui>합계 N명</Ui>으로 지금 회차의 인원을 확인합니다. 입력은 바로 서버에 저장되어 다른 기기에도
              나타납니다.
            </>,
          ]}
        />
        <Tip title="예약 수는 따로 입력하지 않습니다">
          <p>보고서의 예약 수는 참여 + 취소 + 노쇼로 저절로 계산됩니다. 그래서 취소·노쇼를 빠짐없이 넣는 것이 중요합니다.</p>
        </Tip>
      </Card>
    </div>
  );
}

function SmartTab() {
  return (
    <div className="space-y-6">
      <Card icon={Users} title="단체 입력 모드">
        <Lead>수십 명이 한꺼번에 왔을 때 한 명씩 누르지 않고 인원을 한 번에 넣습니다.</Lead>
        <Steps
          items={[
            <>
              <Ui>단체 입력 모드 (한 번에 여러 명 입력)</Ui>를 누릅니다. (좁은 화면에서는 <Ui>단체 입력</Ui>)
            </>,
            '연령·성별 칸에 인원을 숫자로 적거나 −/+로 맞춥니다.',
            <>
              필요하면 <Ui>단체명 / 메모 (선택)</Ui>에 "OO초등학교 3학년 1반"처럼 적습니다. 회차 메모에 한 줄로 더해집니다.
            </>,
            <>
              <Ui>일괄 추가</Ui>를 누르면 <strong>지금 선택된 회차</strong>에 더해집니다. 예약 없이 온 단체라면 먼저 <Ui>단체</Ui> 회차를
              고르세요.
            </>,
          ]}
        />
        <p className="text-xs text-brand-muted">취소·노쇼는 단체 입력 창이 아니라 카운터 화면에서 입력합니다.</p>
      </Card>

      <Card icon={RefreshCw} title="방금 입력 취소">
        <Bullets
          items={[
            <>
              +, −, 단체 입력을 하면 화면 아래에 <Ui>방금 입력 취소</Ui>가 <strong>5초 동안</strong> 나타납니다.
            </>,
            '누르면 마지막 입력과 그 직전 10초 안에 한 입력을 한꺼번에 되돌립니다.',
            '1분이 지난 입력은 되돌릴 수 없습니다. 그때는 −로 직접 빼 주세요.',
          ]}
        />
      </Card>

      <Card icon={ClipboardList} title="특이사항 메모">
        <Lead>
          회차마다 메모 칸 하나가 있습니다(<Ui>특이사항 (단체명, 장비 이슈 등)...</Ui>). 입력을 멈추면 잠시 뒤 자동으로 저장됩니다.
        </Lead>
        <Bullets
          items={['기록 화면에서 메모 내용으로 검색할 수 있습니다.', '엑셀 보고서의 비고 칸에 들어갑니다.']}
        />
      </Card>

      <Card icon={ShieldAlert} title="현재 세션 초기화">
        <Lead>
          <Ui>현재 세션 초기화</Ui>는 지금 회차의 인원과 취소·노쇼를 모두 0으로 만듭니다. 메모와 다른 회차는 그대로 둡니다.
        </Lead>
        <Tip tone="warn" title="되돌릴 수 없습니다">
          <p>확인 창에서 회차가 맞는지 꼭 보고 누르세요. 방금 입력 취소로도 되살릴 수 없습니다.</p>
        </Tip>
      </Card>

      <Card icon={Wifi} title="인터넷이 끊겼을 때">
        <Lead>
          머리글이 <Ui>Offline</Ui>으로 바뀌어도 그대로 입력하면 됩니다. 입력은 기기에 보관했다가 연결되면 자동으로 서버에 보냅니다.
        </Lead>
        <p className="text-xs text-brand-muted">
          설정 → <Ui>동기화 상태 (서버 연동)</Ui>의 <Ui>오프라인 대기열</Ui>이 <Ui>모두 전송됨</Ui>이면 전부 올라간 것입니다.
        </p>
      </Card>
    </div>
  );
}

function DashboardTab() {
  return (
    <div className="space-y-6">
      <Card icon={BarChart2} title="통계 보기">
        <Steps
          items={[
            <>
              위쪽에서 체험관(<Ui>전체 통합 데이터</Ui> 또는 체험관 하나), 기간(<Ui>일별</Ui> · <Ui>월별</Ui> · <Ui>연간</Ui>), 날짜를
              고릅니다.
            </>,
            <>
              <Ui>총 방문객</Ui> 카드에서 전체·자율·예약 인원과 남녀 수, 어제(지난달·작년) 대비 증감을 봅니다. 취소·노쇼는 방문객에 들어가지
              않습니다.
            </>,
            <>
              <Ui>상세 방문객 분포 (연령/성별)</Ui>에서 연령·성별 8칸 인원을 보고, 아래 추이 차트에서 흐름을 봅니다. 일별은 시간대별,
              월별은 날짜별, 연간은 월별 합계로 그려집니다.
            </>,
            <>
              추이 차트의 <Ui>관람 유형</Ui>과 <Ui>표시 기준</Ui>(총합계 · 연령별 · 성별 · 상세)으로 보고 싶은 기준을 바꿉니다.
            </>,
          ]}
        />
      </Card>

      <Card icon={Bot} title="AI 데이터 분석 인사이트">
        <Lead>
          대시보드를 열면 Google Gemini가 지금까지 쌓인 전체 데이터를 읽고 운영에 참고할 분석을 보여 줍니다.{' '}
          <Ui>다른 분석 보기</Ui>를 누르면 다른 관점(시간대 혼잡, 요일 흐름 등)으로 바뀝니다.
        </Lead>
        <Tip title="참고용으로 봐 주세요">
          <p>위의 체험관·기간 선택과 관계없이 전체 데이터를 기준으로 분석합니다.</p>
          <p>AI에 연결할 수 없을 때는 기본 안내 문구가 대신 나옵니다. 중요한 판단은 숫자 통계로 확인해 주세요.</p>
        </Tip>
      </Card>

      <Card icon={FileSpreadsheet} title="보고서 내려받기">
        <Terms
          rows={[
            [
              '엑셀 (운영 결과 보고)',
              <>
                <Ui>상세 방문객 분포</Ui> 카드의 엑셀 아이콘(<Ui>엑셀 내보내기</Ui>)을 누릅니다. 일별이면 그날의{' '}
                <strong>일일 운영 결과 보고</strong>, 월별이면 <strong>월간 누계</strong>, 연간이면 <strong>연간 누계</strong>가
                만들어집니다.
              </>,
            ],
            [
              'PDF',
              <>
                위쪽 <Ui>PDF</Ui> 버튼으로 대시보드 화면 전체를 한 파일로 저장합니다.
              </>,
            ],
            ['그래프 (PNG)', '추이 차트 옆 내려받기 아이콘으로 차트만 그림으로 저장합니다.'],
          ]}
        />
        <Tip tone="safe" title="엑셀 보고서는 이렇게 채워집니다">
          <p>
            지정된 보고 양식에 숫자만 넣습니다. 일일 보고는 평일이면 주중 양식, 토·일이면 주말 양식이 자동으로 골라집니다. 월간·연간
            누계는 평일과 주말이 섞이므로 모든 회차가 있는 주중 양식에 담깁니다.
          </p>
          <p>체험관 선택과 관계없이 세 체험관(다목적실 1·2·3)이 모두 들어갑니다. 메모는 비고 칸에 들어갑니다.</p>
          <p>
            예약 수 = 참여 + 취소 + 노쇼입니다. 회차 정원(메디봇 4명, 나머지 10명)을 넘는 인원은 현장예약으로 따로 적힙니다.
          </p>
          <p>
            파일 이름: <code className="font-mono">20261025_교육장_관람인원.xlsx</code> (월간은{' '}
            <code className="font-mono">202610_월간_교육장_관람인원.xlsx</code>, 연간은{' '}
            <code className="font-mono">2026_연간_교육장_관람인원.xlsx</code>)
          </p>
        </Tip>
        <p className="text-xs text-brand-muted">
          일일·월간 보고서는 설정 → <Ui>데이터 내보내기 (XLSX)</Ui>에서도 받을 수 있습니다.
        </p>
      </Card>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="space-y-6">
      <Card icon={History} title="전체 기록 보기">
        <Lead>지금까지 입력한 회차 기록을 날짜별로 모아 보여 줍니다. 최신 날짜가 위에 있고, 오늘은 펼쳐진 채로 나옵니다.</Lead>
        <Steps
          items={[
            <>
              위쪽에서 체험관(<Ui>전체 통합 데이터</Ui> 또는 체험관 하나)을 고릅니다.
            </>,
            <>
              <Ui>메모 내용으로 검색...</Ui>에 단체명 등을 넣으면 그 메모가 있는 회차만 남습니다.
            </>,
            '날짜 머리글을 눌러 펼치면 회차마다 체험관, 관람 유형, 총 인원, 남녀 수, 연령별 표, 메모가 보입니다.',
          ]}
        />
        <p className="text-xs text-brand-muted">
          날짜 머리글의 <Ui>합계</Ui>와 회차의 <Ui>총 N명</Ui>은 실제 방문객 수입니다. 취소·노쇼는 들어가지 않아 대시보드{' '}
          <Ui>총 방문객</Ui>과 같은 기준입니다.
        </p>
        <Tip title="기록 화면에서는 고칠 수 없습니다">
          <p>
            숫자를 고치려면 카운터 화면에서 날짜와 회차를 직접 골라(수동 모드) +/−로 맞춘 뒤, 실시간 연동을 다시 켜 주세요.
          </p>
        </Tip>
      </Card>
    </div>
  );
}

function AttendanceTab() {
  return (
    <div className="space-y-6">
      <Card icon={ClipboardList} title="출석부 만들기">
        <Lead>
          예약 시스템의 <strong>예약현황조회(.xlsx)</strong> 파일로 회차별 출석부, 문자발송 명단, 날짜를 맞춘 문자 내용을 만듭니다.
        </Lead>
        <Steps
          items={[
            <>
              <Ui>예약현황조회 파일 선택</Ui>을 누르거나, 파일·폴더·ZIP을 화면에 끌어다 놓습니다. 여러 프로그램 파일을 한 번에 올려도
              됩니다. 크롬 확장을 쓰면 이 단계 없이 바로 들어옵니다(8번 탭).
            </>,
            '회차(프로그램 + 이용일 + 시간)마다 카드가 생기고, 확정 건수와 인원이 표시됩니다.',
            <>
              <Ui>출력 설정</Ui>을 확인합니다(아래 표).
            </>,
            <>
              회차별로 <Ui>출석부 XLSX</Ui> · <Ui>문자발송 CSV</Ui> · <Ui>문자내용 TXT</Ui>를 받거나,{' '}
              <Ui>전체 ZIP으로 내려받기</Ui>로 모든 회차를 한 파일로 받습니다.
            </>,
          ]}
        />
      </Card>

      <Card icon={Settings} title="출력 설정">
        <Terms
          rows={[
            [
              '제목 문구',
              <>
                출석부 제목과 파일 이름 앞에 붙는 말입니다(예: <code className="font-mono">1024 위크앤드_라임북스 : 움직이는 동화책</code>).
                서비스마다 칸이 따로 있고, 크롬 확장으로 받은 회차는 서비스 이름(위크앤드, BRAIN(브레인) 에듀투어 등)이 자동으로
                들어갑니다. 직접 올린 파일은 '위크앤드'가 기본이니 필요하면 고쳐 주세요.
              </>,
            ],
            ['정렬', '신청일 순 또는 이름 순(가나다)'],
            ['문자발송 파일 인코딩', 'CP949는 문자발송 프로그램용, UTF-8은 엑셀에서 열어 볼 때 고릅니다.'],
            ['취소·미결제 건 포함', '끄면 예약완료 + 결제완료 건만, 켜면 모든 예약 건이 출석부에 들어갑니다.'],
            ['화면에 이름·연락처 표시', '화면에서는 기본으로 가려 둡니다. 내려받는 파일에는 원본이 그대로 들어갑니다.'],
          ]}
        />
        <Tip title="문자 내용 TXT">
          <p>
            프로그램별 문자 양식에서 날짜만 이용일로 바꿔 만듭니다. 양식이 있는 프로그램(위크앤드 수업)만 만들어지고, 예약 시간이 양식
            시간과 다르면 경고가 뜹니다. 카드의 <Ui>문자 내용 미리보기</Ui>로 먼저 확인할 수 있습니다.
          </p>
        </Tip>
      </Card>

      <Card icon={ShieldCheck} title="개인정보 보호">
        <Tip tone="safe" title="예약자 정보는 이 화면 밖으로 나가지 않습니다">
          <p>파일은 브라우저 안에서만 변환되고, 신청자 이름·연락처는 서버나 데이터베이스에 저장되지 않습니다.</p>
          <p>
            다른 화면으로 가거나 <Ui>불러온 정보 지우기</Ui>를 누르면 사라집니다. 내려받은 출석부·명단 파일은 업무가 끝나면 지워 주세요.
          </p>
        </Tip>
      </Card>
    </div>
  );
}

function ExtensionTab() {
  return (
    <div className="space-y-6">
      <Card icon={Puzzle} title="크롬 확장 'RAIM 예약현황 일괄 출력'">
        <Lead>
          공공예약 관리자 화면에서 서비스를 체크하고 버튼 두 번만 누르면, 회차별 예약현황 엑셀이 출석부 화면으로 바로 들어옵니다.
          회차마다 팝업을 열어 엑셀을 받던 일을 대신합니다.
        </Lead>
        <Terms
          rows={[
            [
              '설치',
              <>
                담당자에게 받은 <code className="font-mono">raim-extension-…-dev.zip</code>의 압축을 지우지 않을 폴더에 풉니다 → 크롬 주소창{' '}
                <code className="font-mono">chrome://extensions</code> → 오른쪽 위 <Ui>개발자 모드</Ui> 켜기 →{' '}
                <Ui>압축해제된 확장 프로그램을 로드합니다</Ui> → 그 폴더 선택. 크롬 웹스토어 링크가 생기면 링크에서 설치합니다.
              </>,
            ],
            [
              '연결 확인',
              <>
                출석부 화면 위쪽에 <Ui>✓ 크롬 확장 연결됨</Ui>이 보이면 준비된 것입니다.
              </>,
            ],
          ]}
        />
      </Card>

      <Card icon={ClipboardList} title="사용 순서">
        <Steps
          items={[
            <>
              공공예약 관리자에 로그인 → <strong>예약관리 › 예약현황관리</strong>로 갑니다. 목록 보기는 100개로 두면 편합니다(선택은 한
              페이지 안에서만 유지됩니다).
            </>,
            '서비스 이름 왼쪽에 생긴 체크박스로 출석부를 만들 서비스를 고릅니다. 한 번에 최대 20개까지 됩니다.',
            <>
              오른쪽 아래 <Ui>RAIM 출석부 보내기</Ui> 패널에서 이용일을 고릅니다. <Ui>서비스 이용기간 전체</Ui> 또는 <Ui>기간 지정</Ui>(
              <Ui>오늘</Ui> · <Ui>이번 주말</Ui> · <Ui>다음 주말</Ui>).
            </>,
            <>
              <Ui>다운로드 사유</Ui>를 확인합니다. 기본은 <strong>출석부 작성</strong>입니다.
            </>,
            <>
              <Ui>1. 회차 확인</Ui>으로 서비스별 회차 수를 미리 봅니다. 개인정보 없이 회차 목록만 조회합니다.
            </>,
            <>
              <Ui>2. RAIM으로 보내기</Ui>를 누르면 RAIM 출석부 탭이 열리고 회차별로 들어갑니다. 패널에 "출석부 회차 N개"가 돌아오고, 사이트
              회차 수보다 적으면 ⚠로 알려 줍니다.
            </>,
          ]}
        />
        <Tip title="바로 들어오지 않을 때">
          <p>RAIM에서 로그인·비밀번호·체험관 선택이 남아 있으면 그것을 마친 뒤 출석부 화면을 여세요. 5분 안이면 자동으로 들어옵니다.</p>
          <p>
            그래도 안 되면 패널의 <Ui>ZIP으로 저장</Ui>을 누르고, 받은 ZIP을 출석부 화면에 끌어다 놓으면 똑같이 처리됩니다.
          </p>
        </Tip>
      </Card>

      <Card icon={ShieldAlert} title="알아 둘 점">
        <Bullets
          items={[
            '엑셀은 사이트의 엑셀 출력과 같은 방식으로 받기 때문에, 서비스마다 다운로드 사유가 사이트에 기록됩니다.',
            '받은 파일은 브라우저 메모리에만 잠깐 있다가 RAIM에 넘기는 즉시 지워집니다(넘기지 못하면 5분 뒤 삭제). 다른 곳으로 보내지 않습니다.',
            '툴바의 확장 아이콘을 누르면 기본 다운로드 사유와 요청 간격을 바꿀 수 있습니다.',
            '압축을 푼 확장 폴더를 옮기거나 지우면 확장이 꺼집니다.',
            '공용 PC라면 사용 후 공공예약 관리자에서 로그아웃해 주세요.',
          ]}
        />
      </Card>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card icon={Settings} title="설정 화면">
        <Terms
          rows={[
            [
              '데이터 내보내기 (XLSX)',
              <>
                <Ui>일간</Ui>(하루 전체) 또는 <Ui>월간</Ui>(보고용 통합) 날짜를 고르고 <Ui>내려받기</Ui>. 대시보드의 엑셀 보고서와 같은
                파일입니다.
              </>,
            ],
            [
              '백업과 복구 (JSON)',
              <>
                <Ui>백업 파일 저장</Ui>은 세 체험관의 모든 기록을 파일 하나로 저장합니다(비밀번호·설정은 빠집니다).{' '}
                <Ui>백업 파일 선택</Ui>으로 복구하면 날짜·관람유형·회차·체험관이 같은 기록은 백업 내용으로 덮어쓰고, 나머지는 그대로
                둡니다. 복구한 내용은 서버에 저장되어 모든 기기에 반영됩니다.
              </>,
            ],
            [
              '기존 데이터 가져오기',
              <>
                예전 엑셀·CSV 기록을 <Ui>엑셀 파일 선택</Ui>으로 한 번에 올립니다. 다목적실1·2·3은 무인자동차·스낵헌터·메디봇으로
                연결됩니다.
              </>,
            ],
            ['보안 비밀번호', '최고 관리자 계정만 변경할 수 있습니다(1번 탭 참고).'],
            [
              '동기화 상태 (서버 연동)',
              <>
                <Ui>네트워크 연결</Ui>과 <Ui>오프라인 대기열</Ui>(서버로 아직 못 보낸 기록 수)을 보여 줍니다.
              </>,
            ],
            ['앱 정보', '현재 버전과 버전별 업데이트 내역을 볼 수 있습니다.'],
          ]}
        />
        <Tip tone="warn" title="백업은 정기적으로">
          <p>한 달에 한 번 이상 백업 파일을 저장해 두면, 실수로 지운 기록도 되살릴 수 있습니다. 복구는 덮어쓰기이니 날짜를 확인하고 하세요.</p>
        </Tip>
      </Card>

      <Card icon={RefreshCw} title="새 버전 안내 (업데이트)">
        <Lead>
          새 버전이 나오면 화면 위에 <Ui>새 버전이 준비되었습니다</Ui> 카드가 뜹니다. 화면을 열어 둔 채로도 5분마다, 그리고 이 탭으로
          돌아올 때 새 버전을 확인합니다.
        </Lead>
        <Steps
          items={[
            '집계 중이라면 입력을 먼저 마칩니다. 입력은 이미 서버에 저장되어 있으니 새로고침해도 사라지지 않습니다.',
            <>
              <Ui>새로고침</Ui>을 누르면 "새 버전을 적용하는 중…"이 보인 뒤 새 화면이 열립니다. 지금 바쁘면 <Ui>나중에</Ui>를 누르세요. 탭으로
              돌아오면 다시 알려 줍니다.
            </>,
            '설정 → 앱 정보에서 버전이 올라갔는지 확인할 수 있습니다.',
          ]}
        />
        <Tip title="다른 탭과 화면이 하얗게 보일 때">
          <p>한 탭에서 새로고침해도 다른 탭은 저절로 새로고침하지 않고 안내만 띄웁니다.</p>
          <p>
            화면이 하얗게 비어 보이면 <strong>Ctrl + R</strong>(또는 F5)을 한 번 누르거나 앱 창을 닫았다가 다시 여세요.
          </p>
        </Tip>
      </Card>
    </div>
  );
}

const TAB_CONTENT: Record<TabId, ComponentType> = {
  login: LoginTab,
  layout: LayoutTab,
  counter: CounterTab,
  smart: SmartTab,
  dashboard: DashboardTab,
  history: HistoryTab,
  attendance: AttendanceTab,
  extension: ExtensionTab,
  settings: SettingsTab,
};

export default function UserManual() {
  const [activeTab, setActiveTab] = useState<TabId>('login');
  const Content = TAB_CONTENT[activeTab];

  return (
    // 한글이 글자 중간에서 줄바꿈되지 않도록 낱말 단위로 끊는다
    <div className="flex flex-col h-full bg-brand-light/20 break-keep">
      {/* 머리 배너 */}
      <div className="bg-gradient-to-r from-brand-blue/10 via-brand-blue/5 to-transparent p-5 sm:p-6 border-b border-white/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 mb-2">
              현장 안내 데스크 직원 & 관리자 가이드
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">RAIM 방문객 관리 시스템 사용 설명서</h1>
            <p className="text-sm text-brand-muted mt-1">인원 카운팅부터 통계·보고서, 출석부와 크롬 확장까지 한눈에 보는 안내서</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-brand-muted bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">실시간 동기화 지원</span>
          </div>
        </div>
      </div>

      {/* 탭 (좁은 화면에서도 모두 보이도록 줄바꿈) */}
      <div className="p-4 border-b border-white/50 bg-white/30 flex flex-wrap gap-2" role="tablist" aria-label="설명서 목차">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 min-h-11 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-brand-dark text-white shadow-md'
                  : 'bg-white/60 text-brand-muted hover:text-brand-dark hover:bg-white/90 border border-white/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 내용 */}
      <div className="p-4 sm:p-6 flex-1 bg-white/20" role="tabpanel">
        <Content />
      </div>

      <div className="bg-white/40 p-4 border-t border-white/50 text-center text-3xs text-brand-muted flex flex-col sm:flex-row justify-between items-center gap-1">
        <span>© 2026 RAIM Seoul Robot & AI Museum. All Rights Reserved.</span>
        <span className="font-semibold text-brand-dark">설명서 기준 버전 v{MANUAL_VERSION}</span>
      </div>
    </div>
  );
}
