import { create } from 'zustand';
import { useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDocFromServer, query, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreUtils';

export type RecordType = 'autonomous' | 'reserved';
export type ProgramType = '무인자동차' | '스낵헌터' | '메디봇';

export type ActionType = 'increment' | 'decrement' | 'group';

export interface LastAction {
  type: ActionType;
  date: string;
  recordType: RecordType;
  session: string;
  program: ProgramType;
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
  cancelled: number;
}

export interface OmitIdRecord {
  date: string;
  type: RecordType;
  session: string;
  program: ProgramType; // Added program
}

export interface VisitorRecord {
  id: string; // date-type-session-program
  date: string; // YYYY-MM-DD
  type: RecordType;
  session: string;
  program?: ProgramType; // Optional for backward compatibility, defaults to 무인자동차
  counts: Counts;
  memo: string;
  updatedAt: number;
}

export interface GlobalActionInfo {
  user: string;
  time: number;
}

interface AppState {
  activeProgram: ProgramType;
  setActiveProgram: (program: ProgramType) => void;
  records: VisitorRecord[];
  isInitialized: boolean;
  pendingSyncCount: number;
  globalRecentActions: Record<string, GlobalActionInfo>;
  setGlobalRecentActions: (actions: Record<string, GlobalActionInfo>) => void;
  updateGlobalRecentAction: (program: string) => void;
  setRecords: (records: VisitorRecord[], pendingCount?: number) => void;
  incrementCount: (date: string, type: RecordType, session: string, program: ProgramType, category: keyof Counts, skipHistory?: boolean) => Promise<void>;
  decrementCount: (date: string, type: RecordType, session: string, program: ProgramType, category: keyof Counts, skipHistory?: boolean) => Promise<void>;
  addGroupCount: (date: string, type: RecordType, session: string, program: ProgramType, countsToAdd: Counts, memoToAdd: string, skipHistory?: boolean) => Promise<void>;
  resetCounts: (date: string, type: RecordType, session: string, program: ProgramType) => Promise<void>;
  updateMemo: (date: string, type: RecordType, session: string, program: ProgramType, memo: string) => Promise<void>;
  importRecords: (records: VisitorRecord[]) => Promise<void>;
  setAllRecords: (records: VisitorRecord[]) => Promise<void>;
  getRecord: (date: string, type: RecordType, session: string, program: ProgramType) => VisitorRecord | undefined;
  getAllRecords: () => VisitorRecord[];
  lastAction: LastAction | null;
  actionHistory: LastAction[];
  undoLastAction: () => Promise<void>;
  appPin: string;
  setAppPinAction: (pin: string) => void;
  updateAppPin: (pin: string) => Promise<void>;
}

const getRecordProgram = (record: VisitorRecord): ProgramType => record.program || '무인자동차';

const createDefaultRecord = (date: string, type: RecordType, session: string, program: ProgramType): VisitorRecord => ({
  id: `${date}-${type}-${session}-${program}`,
  date,
  type,
  session,
  program,
  counts: { 
    adult_m: 0, adult_f: 0, 
    youth_m: 0, youth_f: 0, 
    child_m: 0, child_f: 0, 
    infant_m: 0, infant_f: 0,
    noShow: 0, cancelled: 0
},
  memo: '',
  updatedAt: Date.now(),
});

const getStoredLocalActionInfo = (): GlobalActionInfo | null => {
  try {
    const stored = localStorage.getItem('localActionInfo');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useStore = create<AppState>((set, get) => ({
  activeProgram: (localStorage.getItem('activeProgram') as ProgramType) || '무인자동차',
  setActiveProgram: (activeProgram) => {
    localStorage.setItem('activeProgram', activeProgram);
    set({ activeProgram });
  },
  records: [],
  isInitialized: false,
  pendingSyncCount: 0,
  lastAction: null,
  actionHistory: [],
  appPin: '430000', // Default PIN
  
  globalRecentActions: {},
  setGlobalRecentActions: (actions) => set({ globalRecentActions: actions }),
  
  updateGlobalRecentAction: async (program) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDisplay = currentUser.displayName || currentUser.email?.split('@')[0] || 'Unknown User';
      const info = { user: userDisplay, time: Date.now() };
      
      // Update local state optimisticially
      set((state) => ({
        globalRecentActions: {
          ...state.globalRecentActions,
          [program]: info
        }
      }));

      // Update Firestore
      try {
        await setDoc(doc(db, 'settings', 'app'), { 
          recentActions: {
            [program]: info
          }
        }, { merge: true });
      } catch (error) {
        console.error("Failed to update global recent action:", error);
      }
    }
  },

  setAppPinAction: (pin) => set({ appPin: pin }),
  
  updateAppPin: async (pin) => {
    // Optimistic update
    set({ appPin: pin });
    try {
      await setDoc(doc(db, 'settings', 'app'), { pin });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/app');
    }
  },

  setRecords: (records, pendingCount = 0) => set({ records, pendingSyncCount: pendingCount, isInitialized: true }),

  incrementCount: async (date, type, session, program, category, skipHistory = false) => {
    const id = `${date}-${type}-${session}-${program}`;
    const legacyId = `${date}-${type}-${session}`; // Backward compatibility
    
    // First try to find by exact ID, then by legacy ID if program is '무인자동차'
    let existing = get().records.find(r => r.id === id);
    if (!existing && program === '무인자동차') {
      existing = get().records.find(r => r.id === legacyId);
    }
    
    const targetId = existing ? existing.id : id;
    
    // Optimistic update
    set(state => {
      const current = state.records.find(r => r.id === targetId) || createDefaultRecord(date, type, session, program);
      const newRecord = {
        ...current,
        counts: { ...current.counts, [category]: current.counts[category] + 1 },
        updatedAt: Date.now()
      };
      const idx = state.records.findIndex(r => r.id === targetId);
      
      const nextState: Partial<AppState> = {};
      
      if (!skipHistory) {
        const action: LastAction = { type: 'increment', date, recordType: type, session, program, category, timestamp: Date.now() };
        nextState.lastAction = action;
        nextState.actionHistory = [...state.actionHistory, action].filter(a => Date.now() - a.timestamp < 60000);
      }

      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        nextState.records = newRecords;
      } else {
        nextState.records = [...state.records, newRecord];
      }
      return nextState;
    });

    get().updateGlobalRecentAction(program);

    try {
      if (!existing) {
        const newDoc = createDefaultRecord(date, type, session, program);
        newDoc.counts[category] = 1;
        await setDoc(doc(db, 'records', targetId), newDoc);
      } else {
        await updateDoc(doc(db, 'records', targetId), {
          [`counts.${category}`]: increment(1),
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${targetId}`);
    }
  },

  decrementCount: async (date, type, session, program, category, skipHistory = false) => {
    const id = `${date}-${type}-${session}-${program}`;
    const legacyId = `${date}-${type}-${session}`;
    
    let existing = get().records.find(r => r.id === id);
    if (!existing && program === '무인자동차') {
      existing = get().records.find(r => r.id === legacyId);
    }
    
    if (!existing || existing.counts[category] <= 0) return;
    const targetId = existing.id;

    // Optimistic update
    set(state => {
      const current = state.records.find(r => r.id === targetId)!;
      const newRecord = {
        ...current,
        counts: { ...current.counts, [category]: current.counts[category] - 1 },
        updatedAt: Date.now()
      };
      const idx = state.records.findIndex(r => r.id === targetId);
      const newRecords = [...state.records];
      newRecords[idx] = newRecord;
      const nextState: Partial<AppState> = { records: newRecords };
      
      if (!skipHistory) {
        const action: LastAction = { type: 'decrement', date, recordType: type, session, program, category, timestamp: Date.now() };
        nextState.lastAction = action;
        nextState.actionHistory = [...state.actionHistory, action].filter(a => Date.now() - a.timestamp < 60000);
      }
      
      return nextState;
    });

    get().updateGlobalRecentAction(program);

    try {
      await updateDoc(doc(db, 'records', targetId), {
        [`counts.${category}`]: increment(-1),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${targetId}`);
    }
  },

  addGroupCount: async (date, type, session, program, countsToAdd, memoToAdd, skipHistory = false) => {
    const id = `${date}-${type}-${session}-${program}`;
    const legacyId = `${date}-${type}-${session}`;
    
    let existing = get().records.find(r => r.id === id);
    if (!existing && program === '무인자동차') {
      existing = get().records.find(r => r.id === legacyId);
    }
    const targetId = existing ? existing.id : id;

    // Optimistic update
    set(state => {
      const current = state.records.find(r => r.id === targetId) || createDefaultRecord(date, type, session, program);
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
          cancelled: (current.counts.cancelled || 0) + (countsToAdd.cancelled || 0),
        },
        memo: newMemo,
        updatedAt: Date.now()
      };
      const idx = state.records.findIndex(r => r.id === targetId);
      
      const nextState: Partial<AppState> = {};
      
      if (!skipHistory) {
        const action: LastAction = { type: 'group', date, recordType: type, session, program, countsToAdd, timestamp: Date.now() };
        nextState.lastAction = action;
        nextState.actionHistory = [...state.actionHistory, action].filter(a => Date.now() - a.timestamp < 60000);
      }

      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        nextState.records = newRecords;
      } else {
        nextState.records = [...state.records, newRecord];
      }
      return nextState;
    });

    get().updateGlobalRecentAction(program);

    try {
      if (!existing) {
        const newDoc = createDefaultRecord(date, type, session, program);
        newDoc.counts = countsToAdd;
        newDoc.memo = memoToAdd;
        await setDoc(doc(db, 'records', targetId), newDoc);
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
        
        await updateDoc(doc(db, 'records', targetId), updates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${targetId}`);
    }
  },

  resetCounts: async (date, type, session, program) => {
    const id = `${date}-${type}-${session}-${program}`;
    const legacyId = `${date}-${type}-${session}`;
    
    let existing = get().records.find(r => r.id === id);
    if (!existing && program === '무인자동차') {
      existing = get().records.find(r => r.id === legacyId);
    }
    
    if (!existing) return;
    const targetId = existing.id;

    const newRecord = {
      ...existing,
      counts: { 
        adult_m: 0, adult_f: 0, 
        youth_m: 0, youth_f: 0, 
        child_m: 0, child_f: 0, 
        infant_m: 0, infant_f: 0,
        noShow: 0, cancelled: 0
      },
      updatedAt: Date.now()
    };

    set(state => {
      const idx = state.records.findIndex(r => r.id === targetId);
      const newRecords = [...state.records];
      newRecords[idx] = newRecord;
      return { records: newRecords };
    });

    get().updateGlobalRecentAction(program);

    try {
      await updateDoc(doc(db, 'records', targetId), {
        counts: newRecord.counts,
        updatedAt: newRecord.updatedAt
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${targetId}`);
    }
  },

  updateMemo: async (date, type, session, program, memo) => {
    const id = `${date}-${type}-${session}-${program}`;
    const legacyId = `${date}-${type}-${session}`;
    
    let existing = get().records.find(r => r.id === id);
    if (!existing && program === '무인자동차') {
      existing = get().records.find(r => r.id === legacyId);
    }
    const targetId = existing ? existing.id : id;
    
    const baseRecord = existing || createDefaultRecord(date, type, session, program);
    
    const newRecord = {
      ...baseRecord,
      memo,
      updatedAt: Date.now()
    };

    set(state => {
      const idx = state.records.findIndex(r => r.id === targetId);
      if (idx >= 0) {
        const newRecords = [...state.records];
        newRecords[idx] = newRecord;
        return { records: newRecords };
      }
      return { records: [...state.records, newRecord] };
    });

    get().updateGlobalRecentAction(program);

    try {
      if (existing) {
        await updateDoc(doc(db, 'records', targetId), {
          memo,
          updatedAt: Date.now()
        });
      } else {
        await setDoc(doc(db, 'records', targetId), newRecord);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `records/${targetId}`);
    }
  },

  importRecords: async (recordsToImport) => {
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

  setAllRecords: async (recordsToRestore) => {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < recordsToRestore.length; i += CHUNK_SIZE) {
      const chunk = recordsToRestore.slice(i, i + CHUNK_SIZE);
      const promises = chunk.map(r => setDoc(doc(db, 'records', r.id), r));
      try {
        await Promise.all(promises);
      } catch (error) {
        console.error('Error restoring records chunk:', error);
      }
    }
  },

  getRecord: (date, type, session, program) => {
    // Exact match
    let record = get().records.find(
      (r) => r.date === date && r.type === type && r.session === session && getRecordProgram(r) === program
    );
    return record;
  },
  
  getAllRecords: () => get().records,

  undoLastAction: async () => {
    const state = get();
    const actionHistory = state.actionHistory;
    const latestAction = state.lastAction;
    
    if (!latestAction || actionHistory.length === 0) return;
    
    // We want to undo all actions that occurred within 10 seconds of the LATEST action
    const latestTimestamp = latestAction.timestamp;
    
    // Check if the latest action is too old to undo (1 minute)
    if (Date.now() - latestTimestamp > 60000) {
      set({ lastAction: null });
      return;
    }

    const threshold = latestTimestamp - 10000; // 10 seconds window
    
    const actionsToUndo = actionHistory.filter(a => a.timestamp >= threshold && a.timestamp <= latestTimestamp);
    
    // Clear lastAction and remove these from actionHistory immediately
    set({ 
      lastAction: null, 
      actionHistory: actionHistory.filter(a => !(a.timestamp >= threshold && a.timestamp <= latestTimestamp)) 
    });
    
    // Process undo
    for (const action of actionsToUndo.reverse()) { // reverse to undo backwards!
      if (action.type === 'increment' && action.category) {
        await get().decrementCount(action.date, action.recordType, action.session, action.program, action.category, true);
      } else if (action.type === 'decrement' && action.category) {
        await get().incrementCount(action.date, action.recordType, action.session, action.program, action.category, true);
      } else if (action.type === 'group' && action.countsToAdd) {
        const negativeCounts = { ...action.countsToAdd };
        for (const key in negativeCounts) {
          negativeCounts[key as keyof Counts] = -(negativeCounts[key as keyof Counts] || 0);
        }
        await get().addGroupCount(action.date, action.recordType, action.session, action.program, negativeCounts as Counts, '', true);
      }
    }
  },
}));

// Initialize listener
export function useFirestoreSync() {
  const setRecords = useStore(state => state.setRecords);
  const setAppPinAction = useStore(state => state.setAppPinAction);
  const setGlobalRecentActions = useStore(state => state.setGlobalRecentActions);

  useEffect(() => {
    let unsubscribeRecords: () => void;
    let unsubscribeSettings: () => void;

    // Test connection without blocking the main listener setup
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // Listen to records if authenticated
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        const q = query(collection(db, 'records'));
        unsubscribeRecords = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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

        unsubscribeSettings = onSnapshot(doc(db, 'settings', 'app'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.pin) {
              setAppPinAction(data.pin);
            }
            if (data.recentActions) {
              setGlobalRecentActions(data.recentActions);
            }
          }
        }, (error) => {
          console.error("Error fetching settings:", error);
        });
      } else {
        if (unsubscribeRecords) unsubscribeRecords();
        if (unsubscribeSettings) unsubscribeSettings();
        setRecords([], 0);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRecords) unsubscribeRecords();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, [setRecords, setAppPinAction, setGlobalRecentActions]);
}
