import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';

/**
 * 팝업을 띄울 수 없는 환경(팝업 차단, 인앱 브라우저 등)에서 나오는 오류 코드.
 * auth/cancelled-popup-request 는 여기에 넣으면 안 된다. 그 코드는 팝업이 막힌 게 아니라
 * 사용자가 로그인 버튼을 연달아 눌러 앞선 팝업이 취소됐다는 뜻이고,
 * 두 번째 팝업은 정상 동작 중이다. 리디렉션으로 넘기면 그 팝업까지 날아간다.
 */
const POPUP_UNAVAILABLE_CODES = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsAuthorized(true);
      setUser(currentUser);
      setLoading(false);
    });

    // 팝업 대신 리디렉션으로 로그인한 경우, 돌아왔을 때 실패 사유를 알려준다
    getRedirectResult(auth).catch((error: any) => {
      toast.error(`로그인에 실패했습니다. (${error?.code ?? 'unknown'})`);
    });

    return unsubscribe;
  }, []);

  // 로그인 버튼 연타로 팝업이 서로를 취소하지 않도록 한 번에 하나만 진행한다
  const signInInFlight = React.useRef(false);

  const signIn = async () => {
    if (signInInFlight.current) return;
    signInInFlight.current = true;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      const code: string = error?.code ?? '';
      console.error('Sign in error', code);

      // 팝업이 막히면 같은 창에서 이어서 로그인한다 (브라우저 팝업 차단 설정 대응)
      if (POPUP_UNAVAILABLE_CODES.includes(code)) {
        try {
          toast.info('팝업이 차단되어 현재 창에서 로그인을 이어갑니다.');
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: any) {
          toast.error(`로그인 창을 열지 못했습니다. (${redirectError?.code ?? 'unknown'})`);
          return;
        }
      }

      if (code === 'auth/popup-closed-by-user') {
        toast.warning('로그인 창이 닫혔습니다. 다시 시도해 주세요.');
        return;
      }

      // 버튼을 연달아 눌러 앞선 팝업이 취소된 경우. 새 팝업이 살아 있으므로 조용히 넘긴다.
      if (code === 'auth/cancelled-popup-request') return;

      toast.error(`로그인에 실패했습니다. (${code || 'unknown'})`);
    } finally {
      signInInFlight.current = false;
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out error', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthorized, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
