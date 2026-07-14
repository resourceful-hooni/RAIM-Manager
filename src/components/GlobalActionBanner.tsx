import { useStore } from '@/store/useStore';

export default function GlobalActionBanner() {
  const activeProgram = useStore(state => state.activeProgram);
  const currentProgramAction = useStore(state => state.globalRecentActions[state.activeProgram]);

  if (!currentProgramAction) return null;

  return (
    <div className="bg-brand-dark/90 backdrop-blur-md text-white/90 text-xs py-1.5 px-4 text-center relative z-10 flex justify-center items-center space-x-2 w-full font-medium shadow-sm border-b border-brand-dark/20 overflow-hidden">
       <div className="absolute inset-0 w-[50%] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer pointer-events-none"></div>
       <span className="font-bold text-white tracking-tight relative z-10">({activeProgram}) 최근 입력자 :</span>
       <span className="text-brand-light relative z-10">{currentProgramAction.user}</span>
       <span className="opacity-40 relative z-10">|</span>
       <span className="relative z-10">{new Date(currentProgramAction.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
  );
}
