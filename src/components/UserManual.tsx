import React, { useState } from 'react';
import { 
  BookOpen, KeyRound, LayoutGrid, Users, Zap, BarChart2, 
  FileSpreadsheet, Sparkles, CheckCircle, Smartphone, Info, 
  ShieldAlert, ArrowRight, RefreshCw, Clock, Bot, Check, ShieldCheck, Settings
} from 'lucide-react';

type TabId = 'login' | 'layout' | 'counter' | 'smart' | 'dashboard' | 'excel';

export default function UserManual() {
  const [activeTab, setActiveTab] = useState<TabId>('login');

  const tabs = [
    { id: 'login', label: '1. 로그인 & 보안', icon: KeyRound },
    { id: 'layout', label: '2. 화면 구성', icon: LayoutGrid },
    { id: 'counter', label: '3. 메인 카운터', icon: Users },
    { id: 'smart', label: '4. 편리한 기능', icon: Zap },
    { id: 'dashboard', label: '5. 대시보드 & AI', icon: BarChart2 },
    { id: 'excel', label: '6. 엑셀 & 백업', icon: FileSpreadsheet },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-brand-light/20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-blue/10 via-brand-blue/5 to-transparent p-6 border-b border-white/50">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 mb-2">
              현장 안내 데스크 직원 & 관리자 가이드
            </span>
            <h1 className="text-2xl font-black text-brand-dark tracking-tight font-sans">
              RAIM 방문객 관리 시스템 사용 설명서
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              실시간 인원 카운팅부터 AI 통계 분석, 엑셀 보고서 출력까지 원스톱 가이드
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-brand-muted bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium">실시간 동기화 지원</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="p-4 border-b border-white/50 bg-white/30 overflow-x-auto scrollbar-thin flex space-x-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shrink-0 ${
                isActive
                  ? 'bg-brand-dark text-white shadow-md scale-102'
                  : 'bg-white/60 text-brand-muted hover:text-brand-dark hover:bg-white/90 border border-white/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="p-6 overflow-y-auto flex-1 bg-white/20">
        {activeTab === 'login' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-brand-dark font-bold text-lg">
                <KeyRound className="w-5 h-5 text-brand-blue" />
                <h3>4자리 PIN 코드 로그인</h3>
              </div>
              <p className="text-sm text-brand-muted leading-relaxed">
                보안 유지를 위해 데스크 최초 접속 및 중요 설정을 변경할 때 **4자리 PIN 보안 비밀번호**를 통해 인증해야 합니다.
              </p>
              
              {/* Illustrated mock keypad */}
              <div className="flex justify-center py-4">
                <div className="bg-brand-light/40 border border-white p-4 rounded-2xl w-48 shadow-inner flex flex-col items-center">
                  <div className="flex space-x-2 mb-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-3 h-3 rounded-full bg-brand-blue animate-pulse"></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full text-center text-xs font-bold text-brand-dark">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '⌫'].map((val, idx) => (
                      <div key={idx} className="bg-white/80 py-1.5 rounded-lg border border-brand-light hover:bg-white shadow-xs cursor-pointer">
                        {val}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>로그인 및 PIN 팁</span>
                </div>
                <p className="leading-relaxed text-brand-muted">
                  • 초기 비밀번호는 관리자에게 문의하여 확인 후 설정할 수 있습니다.<br />
                  • 설정에서 PIN 코드를 자유롭게 변경할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="bg-rose-50/40 backdrop-blur-sm rounded-2xl p-6 border border-rose-100 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-rose-900 font-bold">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h4>비밀번호 분실 시 PIN 초기화</h4>
              </div>
              <p className="text-xs text-rose-900/80 leading-relaxed">
                비밀번호를 분실한 경우, 최고 관리자 구글 계정(<span className="font-semibold text-rose-600 underline">wlgns1232356@gmail.com</span>)으로 구글 로그인을 진행하면 잠금 화면 하단에 <span className="font-semibold text-rose-600 bg-rose-100/50 px-1.5 py-0.5 rounded">PIN 초기화 (관리자 전용)</span> 버튼이 활성화되어 복구할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'layout' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-brand-dark font-bold text-lg">
                <LayoutGrid className="w-5 h-5 text-brand-blue" />
                <h3>전체 화면 레이아웃</h3>
              </div>
              <p className="text-sm text-brand-muted">
                상단 글로벌 네비게이션 바와 하단 앱 메뉴를 활용하여 신속하게 조작할 수 있습니다.
              </p>

              {/* Wireframe Mockup */}
              <div className="border border-brand-light bg-brand-light/30 rounded-xl overflow-hidden shadow-xs text-[10px]">
                {/* Simulated Top Bar */}
                <div className="bg-brand-dark text-white p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
                    <span className="font-black">RAIM Manager</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-brand-blue/30 px-1.5 py-0.5 rounded-md text-[8px] text-brand-blue border border-brand-blue/50">체험관 변경 ▾</span>
                    <span className="text-[8px] text-emerald-400">● Online</span>
                  </div>
                </div>
                {/* Simulated Main Body */}
                <div className="p-4 bg-white/40 flex flex-col justify-center items-center min-h-[100px]">
                  <div className="text-brand-muted text-xs font-bold">메인 화면 (Outlet)</div>
                  <div className="text-[10px] text-brand-muted/70">선택된 페이지의 핵심 콘텐츠가 렌더링됩니다.</div>
                </div>
                {/* Simulated Bottom Tabbar */}
                <div className="border-t border-brand-light bg-white/80 p-1.5 flex justify-around text-center font-bold text-brand-muted">
                  <div className="text-brand-dark flex flex-col items-center"><Smartphone className="w-3.5 h-3.5 text-brand-blue" /><span>카운터</span></div>
                  <div className="flex flex-col items-center"><BarChart2 className="w-3.5 h-3.5" /><span>대시보드</span></div>
                  <div className="flex flex-col items-center"><Clock className="w-3.5 h-3.5" /><span>기록</span></div>
                  <div className="flex flex-col items-center"><Settings className="w-3.5 h-3.5" /><span>설정</span></div>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs text-brand-muted">
                <div className="flex items-start space-x-2">
                  <div className="bg-brand-blue/10 text-brand-blue p-1 rounded-md shrink-0 font-bold">1</div>
                  <p className="mt-0.5">**체험관 변경**: 현재 활성화된 전시 프로그램(체험관)을 대시보드 및 카운터 상에서 바로 전환하여 독립적으로 운영할 수 있습니다.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="bg-brand-blue/10 text-brand-blue p-1 rounded-md shrink-0 font-bold">2</div>
                  <p className="mt-0.5">**실시간 네트워크 상태**: 현재 태블릿 및 기기의 인터넷 연결이 양호하면 `Online`으로 표시되며 오프라인 상태에서도 안심하고 데이터를 계속 입력할 수 있습니다.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'counter' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-brand-dark font-bold text-lg">
                <Users className="w-5 h-5 text-brand-blue" />
                <h3>관람 모드 및 실시간 인원 카운팅</h3>
              </div>
              <p className="text-sm text-brand-muted leading-relaxed">
                현재 일자와 시간을 기반으로 시스템이 관람 모드를 지능적으로 자동 변경합니다.
              </p>

              {/* Mode descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-1.5 text-brand-blue font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>자율관람 모드 (상시)</span>
                  </div>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    예약 시간대가 아닌 일반 평시 관람 시간에 가동됩니다. 방문객의 구분을 신속하게 탭하여 현장 자유 관람 인원을 실시간으로 누적 수집합니다.
                  </p>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>예약관람 모드 (자동 동기화)</span>
                  </div>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    예약된 세션 시작 **5분 전**부터 종료 **15분 후**까지 자동으로 작동합니다. 외부 예약 정보와 실시간 연동되며, 실제 방문 인원이 출석 및 노쇼 수치에 자동 산출됩니다.
                  </p>
                </div>
              </div>

              {/* Timeline diagram */}
              <div className="py-2">
                <div className="text-xs font-bold text-brand-dark mb-2">📅 예약관람 모드 자동 전환 타임라인 예시:</div>
                <div className="relative border-l-2 border-brand-blue/30 pl-4 ml-2 space-y-4 text-xs text-brand-muted">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-blue"></div>
                    <span className="font-bold text-brand-dark text-[10px]">예약 시작 5분 전</span>
                    <p className="text-[10px]">자동으로 해당 예약관람 세션 활성화 및 예약수 로드</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="font-bold text-brand-dark text-[10px]">예약 세션 시작 (예: 10:00 ~ 11:00)</span>
                    <p className="text-[10px]">현장 데스크에서 성별, 연령별 관람객 카운팅 수행</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-dark"></div>
                    <span className="font-bold text-brand-dark text-[10px]">예약 종료 15분 후까지</span>
                    <p className="text-[10px]">실제 출석 인원과 불참자(No-show)를 비교해 최종 데이터 자동 마감</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'smart' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-brand-dark font-bold text-lg">
                <Zap className="w-5 h-5 text-brand-blue" />
                <h3>신속하고 정밀한 데스크 편의 유틸리티</h3>
              </div>
              <p className="text-sm text-brand-muted">
                데스크 혼잡 상황에서 오입력을 방지하고 신속한 처리를 도와주는 기능들입니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                <div className="bg-white border border-brand-light/60 p-4 rounded-xl shadow-xs space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue font-bold">
                    단체 입력 모드
                  </span>
                  <p className="text-brand-muted leading-relaxed text-[11px]">
                    관람객이 수십 명 단위의 단체로 도착 시, 카운팅 패널 상단의 **단체 입력** 버튼을 터치한 후 인원을 일괄 기입하여 원터치로 빠르게 카운팅할 수 있습니다.
                  </p>
                </div>

                <div className="bg-white border border-brand-light/60 p-4 rounded-xl shadow-xs space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 font-bold">
                    실시간 입력 취소 (Undo)
                  </span>
                  <p className="text-brand-muted leading-relaxed text-[11px]">
                    카운트를 실수로 더했거나 잘못 입력했을 경우, **30초 동안 화면 하단에 활성화**되는 "방금 입력 취소" 버튼을 원터치로 탭하여 안전하게 원래 상태로 롤백할 수 있습니다.
                  </p>
                </div>

                <div className="bg-white border border-brand-light/60 p-4 rounded-xl shadow-xs space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 font-bold">
                    특이사항 메모
                  </span>
                  <p className="text-brand-muted leading-relaxed text-[11px]">
                    해당 세션 및 시간대에 발생한 특이사항(단체의 기부 방문, 지연 접수, 민원 사항 등)을 기록해 두면 대시보드나 과거 기록 탭에서 다같이 검토할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-brand-dark font-bold text-lg">
                <BarChart2 className="w-5 h-5 text-brand-blue" />
                <h3>실시간 가시성 대시보드</h3>
              </div>
              <p className="text-sm text-brand-muted leading-relaxed">
                현재 날짜의 통계와 데이터를 시각화하여 현재 관람 혼잡도와 분포를 한눈에 모니터링합니다. 연령별, 성별 비율이 인터랙티브 차트로 자동 구현됩니다.
              </p>
            </div>

            <div className="bg-gradient-to-r from-brand-blue/5 to-brand-blue/10 rounded-2xl p-6 border border-brand-blue/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-brand-dark font-bold">
                  <Bot className="w-5 h-5 text-brand-blue" />
                  <h4>Gemini AI 기반 지능형 인사이트 리포트</h4>
                </div>
                <span className="text-[10px] bg-brand-blue/20 text-brand-blue font-bold px-2 py-0.5 rounded-md border border-brand-blue/30">
                  Premium AI
                </span>
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                단순 데이터 집계를 넘어, 축적된 데이터를 활용해 고성능 **Gemini 2.5 Flash 모델**이 직접 분석을 수행합니다. 
              </p>
              <div className="bg-white/90 p-4 rounded-xl border border-brand-blue/10 text-xs space-y-2 text-brand-dark shadow-xs">
                <div className="font-bold flex items-center space-x-1 text-brand-blue">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI 분석이 생성하는 정보:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-brand-muted leading-relaxed">
                  <li>**시간대별 혼잡도 분석**: 방문 피크 타임을 도출하여 효율적인 데스크 근무 조 편성 제안.</li>
                  <li>**프로그램별 선호도 분포**: 프로그램별 방문 성비 및 연령 구성을 연동해 전시 타겟층 정교화.</li>
                  <li>**참석율 및 노쇼(No-show) 패턴**: 요일별/시간대별 예약 미참석 패턴 및 방지 솔루션 추천.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'excel' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-brand-dark font-bold text-lg">
                <FileSpreadsheet className="w-5 h-5 text-brand-blue" />
                <h3>엑셀 연동 및 데이터 다운로드 규칙</h3>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                  <span>수정 금지 - 정밀 엑셀 매핑 규칙 (AGENTS.md 수록)</span>
                </div>
                <p className="leading-relaxed text-brand-muted">
                  • 엑셀 다운로드(`exportToXLSX`)는 완벽한 일치율을 보장하기 위해 새 엑셀 파일을 빈 바탕에서 생성하지 않습니다.<br />
                  • 반드시 서버에 등록된 <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-300 font-mono text-[10px]">public/sheets/양식.xlsx</code> 양식 템플릿 파일을 읽어와 사용합니다.<br />
                  • 관람일자가 **평일(주중)인지 주말인지 자동으로 분류**하여 각 조건에 알맞은 시트를 선택한 후, 예약 수, 취소, 노쇼 정보를 이미지 구조와 100% 동일한 좌표에 정밀 매핑하여 완벽히 안전하게 출력합니다.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-brand-dark">📥 엑셀 내보내기 단계:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
                  <div className="bg-white border border-brand-light p-3 rounded-lg shadow-2xs">
                    <div className="font-bold text-brand-blue mb-1">1. 양식 로드</div>
                    <span className="text-[10px] text-brand-muted">서버에서 공식 서식 자동 Fetch</span>
                  </div>
                  <div className="bg-white border border-brand-light p-3 rounded-lg shadow-2xs">
                    <div className="font-bold text-brand-blue mb-1">2. 데이터 주입</div>
                    <span className="text-[10px] text-brand-muted">성별/연령/노쇼 주중·주말 매핑</span>
                  </div>
                  <div className="bg-white border border-brand-light p-3 rounded-lg shadow-2xs">
                    <div className="font-bold text-brand-blue mb-1">3. 파일 다운로드</div>
                    <span className="text-[10px] text-brand-muted">관람데이터.xlsx 원클릭 저장</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-brand-dark font-bold">
                <RefreshCw className="w-5 h-5 text-brand-blue" />
                <h4>데이터 백업 및 복원 (영구 보존)</h4>
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                네트워크 단절 상태나 캐시 삭제에 대비하기 위해, 설정 메뉴에서 **전체 데이터를 단일 JSON 파일로 안전하게 백업 및 즉각 복원**할 수 있습니다. 기기 변경이나 태블릿 교체 시 매우 유용하게 쓰입니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding info */}
      <div className="bg-white/40 p-4 border-t border-white/50 text-center text-[10px] text-brand-muted flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
        <span>© 2026 RAIM Seoul Robot & AI Museum. All Rights Reserved.</span>
        <span className="font-semibold text-brand-dark">C2PA Content Provenance Signed & Audited</span>
      </div>
    </div>
  );
}
