'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchTable, insertRow, updateRow } from './store';
import { UserProfile, getCurrentUser, setCurrentUser } from './auth';

interface BatchOperation {
  type: 'insert' | 'update';
  table: string;
  id?: string;
  data: any;
}

interface EcoOpsContextType {
  currentUser: UserProfile | null;
  users: any[];
  connections: any[];
  work_orders: any[];
  daily_construction_reports: any[];
  material_logs: any[];
  salary_advances: any[];
  projects: any[];
  inventory: any;
  signIn: (user: UserProfile) => void;
  signOut: () => void;
  refreshDb: () => void;
  insertTable: (table: string, data: any) => void;
  updateTable: (table: string, id: string, data: any) => void;
  batchOp: (message: string, operations: BatchOperation[]) => void;
  isInitialized: boolean;
  isPending: boolean;
  pendingMessage: string;
}

const EcoOpsContext = createContext<EcoOpsContextType | undefined>(undefined);

export const EcoOpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserState, setCurrentUserState] = useState<UserProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [materialLogs, setMaterialLogs] = useState<any[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any>({});
  const [isPending, setIsPending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("Processing securely...");

  const loadData = () => {
    try {
      const profiles = fetchTable('users_profiles');
      setUsers(profiles);
      setConnections(fetchTable('connections'));
      setWorkOrders(fetchTable('work_orders'));
      setDailyReports(fetchTable('daily_construction_reports'));
      setMaterialLogs(fetchTable('material_logs'));
      setSalaryAdvances(fetchTable('salary_advances'));
      setProjects(fetchTable('projects'));
      setInventory(fetchTable('inventory'));

      // Dynamically sync session profile status with latest database records
      const sessionUser = getCurrentUser();
      if (sessionUser) {
        const dbUser = profiles.find(
          (u: any) => u.id === sessionUser.id || (u.name === sessionUser.name && u.role === sessionUser.role)
        );
        if (dbUser) {
          setCurrentUserState(dbUser);
        } else {
          setCurrentUserState(sessionUser);
        }
      } else {
        setCurrentUserState(null);
      }
    } catch (e) {
      console.error("EcoOpsProvider: Error loading data", e);
    }
  };

  useEffect(() => {
    console.log("EcoOpsProvider: loading data");
    try {
      loadData();
      setCurrentUserState(getCurrentUser());
    } catch (e) {
      console.error("EcoOpsProvider: Error in useEffect", e);
    } finally {
      setIsInitialized(true);
      console.log("EcoOpsProvider: initialized");
    }
    
    const onStateUpdate = () => loadData();
    const onAuthChange = () => setCurrentUserState(getCurrentUser());

    if (typeof window !== 'undefined') {
      window.addEventListener('ecoops-state-update', onStateUpdate);
      window.addEventListener('ecoops-auth-change', onAuthChange);
      window.addEventListener('storage', onStateUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ecoops-state-update', onStateUpdate);
        window.removeEventListener('ecoops-auth-change', onAuthChange);
        window.removeEventListener('storage', onStateUpdate);
      }
    };
  }, []);

  const showLoading = (message: string, callback: () => void) => {
    setIsPending(true);
    setPendingMessage(message);
    setTimeout(() => {
      callback();
      setIsPending(false);
    }, 700);
  };

  const signIn = (user: UserProfile) => {
    // Generate a stable, deterministic ID from name+role so the same user
    // never creates duplicate rows even across multiple sign-in attempts.
    const stableId = user.id || `user-${(user.name + user.role).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const userWithId: UserProfile = { ...user, id: stableId };
    showLoading("Authenticating contractor credentials...", () => {
      setCurrentUser(userWithId);
      const existing = fetchTable('users_profiles').find(
        (u: any) => u.id === stableId || (u.name === userWithId.name && u.role === userWithId.role)
      );
      if (!existing) {
        insertRow('users_profiles', userWithId);
      }
    });
  };

  const signOut = () => {
    showLoading("Securing workspace & signing out...", () => {
      setCurrentUser(null);
    });
  };

  const batchOpWithDelay = (message: string, operations: BatchOperation[]) => {
    showLoading(message, () => {
      operations.forEach(op => {
        if (op.type === 'insert') {
          insertRow(op.table, op.data);
        } else if (op.type === 'update' && op.id !== undefined) {
          updateRow(op.table, op.id, op.data);
        }
      });
    });
  };

  const insertTableWithDelay = (table: string, data: any) => {
    let msg = "Registering record...";
    if (table === 'material_logs') msg = "Submitting material allocation requisition...";
    if (table === 'salary_advances') msg = "Filing cash advance audit request...";
    if (table === 'attendance_ledger') msg = "Logging attendance verification...";
    if (table === 'projects') msg = "Deploying construction project blueprint...";
    if (table === 'connections') msg = "Onboarding client into dispatch CRM...";

    showLoading(msg, () => {
      insertRow(table, data);
    });
  };

  const updateTableWithDelay = (table: string, id: string, data: any) => {
    let msg = "Updating database...";
    if (table === 'users_profiles' && data.status === 'Approved') msg = "Authorizing user credentials & daily rate...";
    if (table === 'work_orders' && data.status === 'Completed') msg = "Logging splicing completions & optical diagnostics...";
    if (table === 'work_orders' && data.supervisor_audited) msg = "Verifying logistics splicing parameters...";
    if (table === 'daily_construction_reports' && data.supervisor_verified) msg = "Signing off segment laid report & updating inventory...";
    if (table === 'material_logs' && data.status === 'Approved') msg = "Deducting inventory & allocating materials...";
    if (table === 'salary_advances' && data.status === 'Approved') msg = "Approving cash advance payout transaction...";

    showLoading(msg, () => {
      updateRow(table, id, data);
    });
  };

  return (
    <EcoOpsContext.Provider
      value={{
        currentUser: currentUserState,
        users,
        connections,
        work_orders: workOrders,
        daily_construction_reports: dailyReports,
        material_logs: materialLogs,
        salary_advances: salaryAdvances,
        projects,
        inventory,
        signIn,
        signOut,
        refreshDb: loadData,
        insertTable: insertTableWithDelay,
        updateTable: updateTableWithDelay,
        batchOp: batchOpWithDelay,
        isInitialized,
        isPending,
        pendingMessage
      }}
    >
      {children}
    </EcoOpsContext.Provider>
  );
};

export const useEcoOps = () => {
  const context = useContext(EcoOpsContext);
  if (context === undefined) {
    throw new Error('useEcoOps must be used within an EcoOpsProvider');
  }
  return context;
};
