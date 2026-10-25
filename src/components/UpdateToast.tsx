import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface UpdateToastProps {
  /** 새 버전을 적용하고 새로고침한다 */
  onRefresh: () => void;
  /** 안내를 닫는다 (탭으로 돌아오면 다시 뜬다) */
  onLater: () => void;
}

/**
 * 새 버전 안내 토스트.
 * sonner 기본 모양 대신 앱의 프로스티드 카드와 같은 모양으로 그린다.
 * 새로고침을 누르면 새 버전이 화면을 넘겨받을 때까지 잠깐 걸리므로 적용 중 상태를 보여 준다.
 */
export function UpdateToast({ onRefresh, onLater }: UpdateToastProps) {
  const [applying, setApplying] = useState(false);

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_8px_32px_rgba(0,68,139,0.14)] backdrop-blur-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-brand-blue text-white shadow-md">
          <RefreshCw className={cn('h-5 w-5', applying && 'animate-spin')} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-extrabold tracking-tight text-brand-dark">
            {applying ? '새 버전을 적용하는 중…' : '새 버전이 준비되었습니다'}
          </p>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-brand-muted">
            {applying ? '잠시 후 화면이 새로 열립니다.' : '집계 중이라면 입력을 마친 뒤 새로고침해 주세요.'}
          </p>
        </div>
      </div>

      {!applying && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onLater}
            className="min-h-11 flex-1 rounded-xl border border-brand-blue/15 bg-white/70 text-xs font-bold text-brand-muted transition-all hover:bg-white active:scale-95"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={() => {
              setApplying(true);
              onRefresh();
            }}
            className="min-h-11 flex-[2] rounded-xl border border-brand-dark/30 bg-brand-blue text-xs font-bold text-white shadow-md transition-all hover:bg-brand-dark active:scale-95"
          >
            새로고침
          </button>
        </div>
      )}
    </div>
  );
}
