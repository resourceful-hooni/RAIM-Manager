import { useStore } from '@/store/useStore';

export default function GlobalActionBanner() {
  const activeProgram = useStore(state => state.activeProgram);
  const currentProgramAction = useStore(state => state.globalRecentActions[state.activeProgram]);

  if (!currentProgramAction) return null;

  return (
    // 색과 글자 크기는 원래대로 두고, 360px에서 두 줄로 접히며 아래 내용을 밀어내던 것만 막는다.
    // (한 줄 고정 + 이름만 말줄임)
    <div className="bg-brand-dark/90 backdrop-blur-md text-white/90 text-xs py-1.5 px-4 text-center relative z-10 flex flex-nowrap justify-center items-center space-x-2 w-full font-medium shadow-sm border-b border-brand-dark/20 overflow-hidden whitespace-nowrap">
       {/* 움직임 줄이기를 켠 기기에서는 셔머가 멈춘 채 밝은 띠로 남아 글자를 가려서 숨긴다 */}
       <div className="absolute inset-0 w-[50%] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer pointer-events-none motion-reduce:hidden"></div>
       <span className="font-bold text-white tracking-tight relative z-10 shrink-0">({activeProgram}) 최근 입력자 :</span>
       <span className="text-brand-light relative z-10 min-w-0 truncate">{currentProgramAction.user}</span>
       <span className="opacity-40 relative z-10 shrink-0">|</span>
       <span className="relative z-10 shrink-0 tnum">{new Date(currentProgramAction.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
  );
}
