import { create } from 'zustand';
import { useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDocFromServer, query, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

export type RecordType = 'autonomous' | 'reserved';

export interface Counts {
  adult: number;
  youth: number;
  child: number;
  infant: number;
}

export interface VisitorRecord {
  id: string;
  date: string; // YYYY-MM-DD
  type: RecordType;
  session: string;
  counts: Counts;
  memo: string;
  updatedAt: number;
}

interface AppState {
  records: VisitorRecord[];
  isInitialized: boolean;
  setRecords: (records: VisitorRecord[]) => void;
  incrementCount: (date: string, type: RecordType, session: string, category: keyof Counts) => Promise<void>;
  decrementCount: (date: string, type: RecordType, session: string, category: keyof Counts) => Promise<void>;
  addGroupCount: (date: string, type: RecordType, session: string, countsToAdd: Counts, memoToAdd: string) => Promise<void>;
  resetCounts: (date: string, type: RecordType, session: string) => Promise<void>;
  updateMemo: (date: string, type: RecordType, session: string, memo: string) => Promise<void>;
  getRecord: (date: string, type: RecordType, session: string) => VisitorRecord | undefined;
  getAllRecords: () => VisitorRecord[];
}

const createDefaultRecord = (date: string, type: RecordType, session: string): VisitorRecord => ({
  id: `${date}-${type}-${session}`,
  date,
  type,
  session,
  counts: { adult: 0, youth: 0, child: 0, infant: 0 },
  memo: '',
  updatedAt: Date.now(),
});

export const useStore = create<AppState>((set, get) => ({
  records: [],
  isInitialized: false,
  
  setRecords: (records) => set({ records, isInitialized: true }),

  incrementCount: async (date, type, session, category) => {
    const id = `${date}-${type}-${session}`;
    const existing = get().records.find(r => r.id === id);
    
    // Optimistic update
    set(state => {
      const current = state.records.find(r => r.id === id) || createDefaultRecord(date, type, session);
      const newRecord = {
        ...current,
        counts: { ...current.counts, [category]: current.counts[category] + 1 },
        updatedAt: Date.now()
      };
      const idx = state.records.findIndex(r => r.id === id);
      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        return { records: newRecords };
      }
      return { records: [...state.records, newRecord] };
    });

    try {
      if (!existing) {
        const newDoc = createDefaultRecord(date, type, session);
        newDoc.counts[category] = 1;
        await setDoc(doc(db, 'records', id), newDoc);
      } else {
        await updateDoc(doc(db, 'records', id), {
          [`counts.${category}`]: increment(1),
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${id}`);
    }
  },

  decrementCount: async (date, type, session, category) => {
    const id = `${date}-${type}-${session}`;
    const existing = get().records.find(r => r.id === id);
    
    if (!existing || existing.counts[category] <= 0) return;

    // Optimistic update
    set(state => {
      const current = state.records.find(r => r.id === id)!;
      const newRecord = {
        ...current,
        counts: { ...current.counts, [category]: current.counts[category] - 1 },
        updatedAt: Date.now()
      };
      const idx = state.records.findIndex(r => r.id === id);
      const newRecords = [...state.records];
      newRecords[idx] = newRecord;
      return { records: newRecords };
    });

    try {
      await updateDoc(doc(db, 'records', id), {
        [`counts.${category}`]: increment(-1),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${id}`);
    }
  },

  addGroupCount: async (date, type, session, countsToAdd, memoToAdd) => {
    const id = `${date}-${type}-${session}`;
    const existing = get().records.find(r => r.id === id);

    // Optimistic update
    set(state => {
      const current = state.records.find(r => r.id === id) || createDefaultRecord(date, type, session);
      const newMemo = memoToAdd ? (current.memo ? `${current.memo}\n${memoToAdd}` : memoToAdd) : current.memo;
      const newRecord = {
        ...current,
        counts: {
          adult: current.counts.adult + countsToAdd.adult,
          youth: current.counts.youth + countsToAdd.youth,
          child: current.counts.child + countsToAdd.child,
          infant: current.counts.infant + countsToAdd.infant,
        },
        memo: newMemo,
        updatedAt: Date.now()
      };
      const idx = state.records.findIndex(r => r.id === id);
      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        return { records: newRecords };
      }
      return { records: [...state.records, newRecord] };
    });

    try {
      if (!existing) {
        const newDoc = createDefaultRecord(date, type, session);
        newDoc.counts = countsToAdd;
        newDoc.memo = memoToAdd;
        await setDoc(doc(db, 'records', id), newDoc);
      } else {
        const updates: any = { updatedAt: Date.now() };
        if (countsToAdd.adult > 0) updates['counts.adult'] = increment(countsToAdd.adult);
        if (countsToAdd.youth > 0) updates['counts.youth'] = increment(countsToAdd.youth);
        if (countsToAdd.child > 0) updates['counts.child'] = increment(countsToAdd.child);
        if (countsToAdd.infant > 0) updates['counts.infant'] = increment(countsToAdd.infant);
        
        if (memoToAdd) {
          updates['memo'] = existing.memo ? `${existing.memo}\n${memoToAdd}` : memoToAdd;
        }
        
        await updateDoc(doc(db, 'records', id), updates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${id}`);
    }
  },

  resetCounts: async (date, type, session) => {
    const id = `${date}-${type}-${session}`;
    const existing = get().records.find(r => r.id === id);
    if (!existing) return;

    const newRecord = {
      ...existing,
      counts: { adult: 0, youth: 0, child: 0, infant: 0 },
      updatedAt: Date.now()
    };

    set(state => {
      const idx = state.records.findIndex(r => r.id === id);
      const newRecords = [...state.records];
      newRecords[idx] = newRecord;
      return { records: newRecords };
    });

    try {
      await setDoc(doc(db, 'records', id), newRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${id}`);
    }
  },

  updateMemo: async (date, type, session, memo) => {
    const id = `${date}-${type}-${session}`;
    const existing = get().records.find(r => r.id === id) || createDefaultRecord(date, type, session);
    
    const newRecord = {
      ...existing,
      memo,
      updatedAt: Date.now()
    };

    set(state => {
      const idx = state.records.findIndex(r => r.id === id);
      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        return { records: newRecords };
      }
      return { records: [...state.records, newRecord] };
    });

    try {
      await setDoc(doc(db, 'records', id), newRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${id}`);
    }
  },

  getRecord: (date, type, session) => {
    return get().records.find(
      (r) => r.date === date && r.type === type && r.session === session
    );
  },
  
  getAllRecords: () => get().records,
}));

// Initialize listener
export function useFirestoreSync() {
  const setRecords = useStore(state => state.setRecords);

  useEffect(() => {
    let unsubscribe: () => void;

    const setup = async () => {
      // Test connection
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }

      // Listen to records if authenticated
      const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if (user) {
          const q = query(collection(db, 'records'));
          unsubscribe = onSnapshot(q, (snapshot) => {
            const records: VisitorRecord[] = [];
            snapshot.forEach(doc => {
              records.push(doc.data() as VisitorRecord);
            });
            setRecords(records);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'records');
          });
        } else {
          if (unsubscribe) unsubscribe();
          setRecords([]);
        }
      });

      return () => {
        unsubscribeAuth();
        if (unsubscribe) unsubscribe();
      };
    };

    setup();
  }, [setRecords]);
}
