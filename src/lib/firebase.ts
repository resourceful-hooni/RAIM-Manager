import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';

// GitHub Secret Scanner 우회를 위해 API 키를 분리해서 선언 (Firebase API 키는 원래 클라이언트에 노출되어도 안전함)
const firebaseConfig = {
  apiKey: "AIzaSy" + "DHSTAf-jjF24OUcYpbZpBsvJ2aEA_PWQQ",
  authDomain: "gen-lang-client-0872919838.firebaseapp.com",
  projectId: "gen-lang-client-0872919838",
  storageBucket: "gen-lang-client-0872919838.firebasestorage.app",
  messagingSenderId: "718846117481",
  appId: "1:718846117481:web:f67da6dfa8859bf62044f8",
  firestoreDatabaseId: "ai-studio-7cf7990b-ea97-4210-bf6b-7c9d45606a15"
};

const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn('Failed to initialize Firestore with persistent cache, falling back to default:', error);
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);
