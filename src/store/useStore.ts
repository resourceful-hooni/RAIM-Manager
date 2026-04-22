import { create } from 'zustand';
import { useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDocFromServer, query, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

export type RecordType = 'autonomous' | 'reserved';

export type ActionType = 'increment' | 'decrement' | 'group';

export interface LastAction {
  type: ActionType;
  date: string;
  recordType: RecordType;
  session: string;
  category?: keyof Counts;
  countsToAdd?: Counts;
  timestamp: number;
}

export interface Counts {
  adult_m: number;
  adult_f: number;
  youth_m: number;
  youth_f: number;
  child_m: number;
  child_f: number;
  infant_m: number;
  infant_f: number;
  noShow: number;
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
  pendingSyncCount: number;
  setRecords: (records: VisitorRecord[], pendingCount?: number) => void;
  incrementCount: (date: string, type: RecordType, session: string, category: keyof Counts) => Promise<void>;
  decrementCount: (date: string, type: RecordType, session: string, category: keyof Counts) => Promise<void>;
  addGroupCount: (date: string, type: RecordType, session: string, countsToAdd: Counts, memoToAdd: string) => Promise<void>;
  resetCounts: (date: string, type: RecordType, session: string) => Promise<void>;
  updateMemo: (date: string, type: RecordType, session: string, memo: string) => Promise<void>;
  importRecords: (records: VisitorRecord[]) => Promise<void>;
  getRecord: (date: string, type: RecordType, session: string) => VisitorRecord | undefined;
  getAllRecords: () => VisitorRecord[];
  lastAction: LastAction | null;
  undoLastAction: () => Promise<void>;
}

const createDefaultRecord = (date: string, type: RecordType, session: string): VisitorRecord => ({
  id: `${date}-${type}-${session}`,
  date,
  type,
  session,
  counts: { 
    adult_m: 0, adult_f: 0, 
    youth_m: 0, youth_f: 0, 
    child_m: 0, child_f: 0, 
    infant_m: 0, infant_f: 0,
    noShow: 0
  },
  memo: '',
  updatedAt: Date.now(),
});

export const useStore = create<AppState>((set, get) => ({
  records: [],
  isInitialized: false,
  pendingSyncCount: 0,
  lastAction: null,
  
  setRecords: (records, pendingCount = 0) => set({ records, pendingSyncCount: pendingCount, isInitialized: true }),

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
      
      const nextState: Partial<AppState> = {
        lastAction: { type: 'increment', date, recordType: type, session, category, timestamp: Date.now() }
      };

      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        nextState.records = newRecords;
      } else {
        nextState.records = [...state.records, newRecord];
      }
      return nextState;
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
      return { 
        records: newRecords,
        lastAction: { type: 'decrement', date, recordType: type, session, category, timestamp: Date.now() }
      };
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
          adult_m: current.counts.adult_m + countsToAdd.adult_m,
          adult_f: current.counts.adult_f + countsToAdd.adult_f,
          youth_m: current.counts.youth_m + countsToAdd.youth_m,
          youth_f: current.counts.youth_f + countsToAdd.youth_f,
          child_m: current.counts.child_m + countsToAdd.child_m,
          child_f: current.counts.child_f + countsToAdd.child_f,
          infant_m: current.counts.infant_m + countsToAdd.infant_m,
          infant_f: current.counts.infant_f + countsToAdd.infant_f,
          noShow: current.counts.noShow + (countsToAdd.noShow || 0),
        },
        memo: newMemo,
        updatedAt: Date.now()
      };
      const idx = state.records.findIndex(r => r.id === id);
      
      const nextState: Partial<AppState> = {
        lastAction: { type: 'group', date, recordType: type, session, countsToAdd, timestamp: Date.now() }
      };

      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        nextState.records = newRecords;
      } else {
        nextState.records = [...state.records, newRecord];
      }
      return nextState;
    });

    try {
      if (!existing) {
        const newDoc = createDefaultRecord(date, type, session);
        newDoc.counts = countsToAdd;
        newDoc.memo = memoToAdd;
        await setDoc(doc(db, 'records', id), newDoc);
      } else {
        const updates: any = { updatedAt: Date.now() };
        if (countsToAdd.adult_m > 0) updates['counts.adult_m'] = increment(countsToAdd.adult_m);
        if (countsToAdd.adult_f > 0) updates['counts.adult_f'] = increment(countsToAdd.adult_f);
        if (countsToAdd.youth_m > 0) updates['counts.youth_m'] = increment(countsToAdd.youth_m);
        if (countsToAdd.youth_f > 0) updates['counts.youth_f'] = increment(countsToAdd.youth_f);
        if (countsToAdd.child_m > 0) updates['counts.child_m'] = increment(countsToAdd.child_m);
        if (countsToAdd.child_f > 0) updates['counts.child_f'] = increment(countsToAdd.child_f);
        if (countsToAdd.infant_m > 0) updates['counts.infant_m'] = increment(countsToAdd.infant_m);
        if (countsToAdd.infant_f > 0) updates['counts.infant_f'] = increment(countsToAdd.infant_f);
        if (countsToAdd.noShow > 0) updates['counts.noShow'] = increment(countsToAdd.noShow);
        
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
      counts: { 
        adult_m: 0, adult_f: 0, 
        youth_m: 0, youth_f: 0, 
        child_m: 0, child_f: 0, 
        infant_m: 0, infant_f: 0,
        noShow: 0
      },
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

  importRecords: async (recordsToImport) => {
    // We'll do this in chunks to avoid hitting Firestore limits if many records
    const CHUNK_SIZE = 50;
    for (let i = 0; i < recordsToImport.length; i += CHUNK_SIZE) {
      const chunk = recordsToImport.slice(i, i + CHUNK_SIZE);
      const promises = chunk.map(r => setDoc(doc(db, 'records', r.id), r));
      try {
        await Promise.all(promises);
      } catch (error) {
        console.error('Error importing chunk:', error);
      }
    }
  },

  getRecord: (date, type, session) => {
    return get().records.find(
      (r) => r.date === date && r.type === type && r.session === session
    );
  },
  
  getAllRecords: () => get().records,

  undoLastAction: async () => {
    const action = get().lastAction;
    if (!action) return;
    
    // Clear it immediately to prevent double click
    set({ lastAction: null });

    // Only allow undo within 1 minute
    if (Date.now() - action.timestamp > 60000) {
      return;
    }

    if (action.type === 'increment' && action.category) {
      await get().decrementCount(action.date, action.recordType, action.session, action.category);
      // Clear the lastAction set by decrementCount
      set({ lastAction: null });
    } else if (action.type === 'decrement' && action.category) {
      await get().incrementCount(action.date, action.recordType, action.session, action.category);
      set({ lastAction: null });
    } else if (action.type === 'group' && action.countsToAdd) {
      const negativeCounts = { ...action.countsToAdd };
      for (const key in negativeCounts) {
        negativeCounts[key as keyof Counts] = -negativeCounts[key as keyof Counts];
      }
      await get().addGroupCount(action.date, action.recordType, action.session, negativeCounts, '');
      set({ lastAction: null });
    }
  }
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
          unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const records: VisitorRecord[] = [];
            let pendingWritesCount = 0;
            snapshot.forEach(doc => {
              records.push(doc.data() as VisitorRecord);
              if (doc.metadata.hasPendingWrites) {
                pendingWritesCount++;
              }
            });
            setRecords(records, pendingWritesCount);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'records');
          });
        } else {
          if (unsubscribe) unsubscribe();
          setRecords([], 0);
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
