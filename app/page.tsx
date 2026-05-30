'use client';
import React, { useState } from 'react';
import { useEcoOps } from './core/context';
import TechnicianView from './views/technician';
import DispatchView from './views/dispatch';
import SupervisorView from './views/supervisor';
import ProjectsView from './views/projects';
import OMView from './views/om';
import CEOView from './views/ceo';
import { UserProfile } from './core/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hexagon, Home, Activity, Wallet, Layers, Zap, Search, Bell, 
  ArrowUpRight, Box, MoreHorizontal, Users, ShieldAlert, LogOut, CheckCircle2,
  Calendar, FileText, Plus, Command, Sparkles, HelpCircle, Menu, X
} from 'lucide-react';
import { GlobalStyles, FrostCard, NavItem, LoadingOverlay } from './core/frostUi';

// Dynamically resolves the perfect premium Lucide icon for each workspace tab
const getTabIcon = (tabName: string) => {
  switch (tabName) {
    case 'Work Orders':
    case 'Dispatch Queue':
    case 'Active Projects':
    case 'Manage Projects':
    case 'Oversight Metrics':
    case 'Executive Console':
      return Home;
    case 'Log Materials':
      return Zap;
    case 'Material Requests':
      return Plus;
    case 'Salary Advances':
    case 'Advance Requests':
      return Wallet;
    case 'Attendance Log':
      return Calendar;
    case 'Client Onboarding':
      return Users;
    case 'CAD File Center':
    case 'Project Blueprints':
    case 'Project Portfolio':
    case 'Network GIS Map':
    case 'Field Dispatch Map':
      return Layers;
    case 'Team Performance':
    case 'Leaderboard':
      return Users;
    case 'Verify Logistics':
    case 'Material Approvals':
    case 'Approvals Desk':
      return CheckCircle2;
    case 'Daily Field Logs':
      return FileText;
    case 'Payroll Simulator':
      return Activity;
    default:
      return HelpCircle;
  }
};

export default function MainApp() {
  const { 
    isInitialized, 
    currentUser, 
    signIn, 
    signOut, 
    users, 
    connections, 
    work_orders, 
    daily_construction_reports, 
    material_logs, 
    salary_advances,
    isPending,
    pendingMessage
  } = useEcoOps();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserProfile['role']>('Technician');
  
  // State for active tabs of each role view
  const [activeTabs, setActiveTabs] = useState<{ [role: string]: string }>({
    'Technician': 'Work Orders',
    'Dispatch': 'Client Onboarding',
    'Supervisor': 'Team Performance',
    'Project Manager': 'Manage Projects',
    'Operations Manager': 'Oversight Metrics',
    'CEO': 'Executive Console'
  });

  const getRoleTabs = (role: string): string[] => {
    switch (role) {
      case 'Technician':
        return ['Work Orders', 'Log Materials', 'Material Requests', 'Salary Advances', 'Attendance Log'];
      case 'Dispatch':
        return ['Client Onboarding', 'Dispatch Queue', 'CAD File Center'];
      case 'Supervisor':
        return ['Team Performance', 'Verify Logistics', 'Active Projects', 'Field Dispatch Map'];
      case 'Project Manager':
        return ['Manage Projects', 'Daily Field Logs', 'Project Blueprints'];
      case 'Operations Manager':
        return ['Oversight Metrics', 'Payroll Simulator', 'Material Approvals', 'Advance Requests'];
      case 'CEO':
        return ['Executive Console', 'Leaderboard', 'Project Portfolio', 'Network GIS Map', 'Approvals Desk'];
      default:
        return [];
    }
  };

  const getActiveTab = (): string => {
    if (!currentUser) return '';
    return activeTabs[currentUser.role] || getRoleTabs(currentUser.role)[0];
  };

  const setActiveTab = (tab: string) => {
    if (!currentUser) return;
    setActiveTabs(prev => ({
      ...prev,
      [currentUser.role]: tab
    }));
  };

  const getTabBadgeCount = (tab: string): number | undefined => {
    if (!currentUser) return undefined;
    
    switch (tab) {
      // --- Technician Tabs ---
      case 'Work Orders': {
        const count = work_orders.filter(
          (wo: any) => wo.assigned_tech_id === currentUser.id && wo.status === 'Assigned'
        ).length;
        return count > 0 ? count : undefined;
      }
      case 'Material Requests': {
        const count = material_logs.filter(
          (ml: any) => ml.tech_id === currentUser.id && ml.status === 'Pending Approval'
        ).length;
        return count > 0 ? count : undefined;
      }
      case 'Salary Advances': {
        const count = salary_advances.filter(
          (sa: any) => sa.tech_id === currentUser.id && sa.status === 'Pending OM Approval'
        ).length;
        return count > 0 ? count : undefined;
      }
      case 'Attendance Log': {
        const today = new Date().toISOString().split('T')[0];
        try {
          const db = JSON.parse(localStorage.getItem('ecoops_db') || '{}');
          const hasCheckedIn = (db.attendance_ledger || []).some(
            (a: any) => a.tech_id === currentUser.id && a.date === today
          );
          return hasCheckedIn ? undefined : 1;
        } catch (e) {
          return undefined;
        }
      }

      // --- Dispatch Tabs ---
      case 'Dispatch Queue': {
        const count = connections.filter((c: any) => c.ticket_status === 'Pending').length;
        return count > 0 ? count : undefined;
      }

      // --- Supervisor Tabs ---
      case 'Verify Logistics': {
        const unverifiedWOs = work_orders.filter(
          (wo: any) => wo.status === 'Completed' && !wo.supervisor_audited
        ).length;
        const unverifiedPMs = daily_construction_reports.filter(
          (r: any) => !r.supervisor_verified
        ).length;
        const total = unverifiedWOs + unverifiedPMs;
        return total > 0 ? total : undefined;
      }

      // --- Operations Manager (OM) Tabs ---
      case 'Material Approvals': {
        const count = material_logs.filter((ml: any) => ml.status === 'Pending Approval').length;
        return count > 0 ? count : undefined;
      }
      case 'Advance Requests': {
        const count = salary_advances.filter((sa: any) => sa.status === 'Pending OM Approval').length;
        return count > 0 ? count : undefined;
      }

      // --- CEO Tabs ---
      case 'Approvals Desk': {
        const count = users.filter((u: any) => u.status === 'Pending Approval').length;
        return count > 0 ? count : undefined;
      }

      default:
        return undefined;
    }
  };

  if (!isInitialized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white font-sans text-slate-500 selection:bg-indigo-100">
        <GlobalStyles />
        <div className="noise-bg" />
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/30 mb-4"
        >
          <Hexagon className="h-8 w-8 text-white" />
        </motion.div>
        <p className="font-bold tracking-wider text-sm animate-pulse text-indigo-900 uppercase">Booting EcoOps Lumina...</p>
      </div>
    );
  }

  // Unauthenticated Login Portal with premium Uilora Lumina card visual styling
  if (!currentUser) {
    return (
      <div className="min-h-screen font-sans text-slate-800 selection:bg-indigo-500/30 flex items-center justify-center p-4 bg-white relative">
        <GlobalStyles />
        <div className="noise-bg" />
        <LoadingOverlay show={isPending} message={pendingMessage} />
        
        {/* Ambient Background Lights */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md relative z-10"
        >
          <FrostCard beam className="p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20 mb-4 hover:rotate-12 transition-transform duration-300">
                <Hexagon className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white font-outfit">EcoOps Suite</h1>
              <p className="text-xs font-semibold text-indigo-300 mt-1 uppercase tracking-widest">Enterprise Role Access Portal</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2 px-1">Full Contractor Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sarah Mushi" 
                  value={regName} 
                  onChange={e => setRegName(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 text-white font-semibold rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500" 
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2 px-1">Functional Workspace Role</label>
                <select 
                  value={regRole} 
                  onChange={e => setRegRole(e.target.value as any)} 
                  className="w-full bg-white/5 border border-white/10 text-white font-bold rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="Technician">Technician (FIT Field Force)</option>
                  <option value="Dispatch">Dispatch Officer</option>
                  <option value="Supervisor">Field Operations Supervisor</option>
                  <option value="Project Manager">Infrastructure Project Manager</option>
                  <option value="Operations Manager">Operations Manager (OM)</option>
                  <option value="CEO">Chief Executive Officer (CEO)</option>
                </select>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (regName.trim()) {
                    signIn({ 
                      name: regName.trim(), 
                      phone: '000-000', 
                      role: regRole, 
                      status: (regRole === 'CEO' || regRole === 'Operations Manager') ? 'Approved' : 'Pending Approval' 
                    } as any);
                  }
                }} 
                className="w-full bg-white text-slate-900 font-bold rounded-2xl py-3.5 shadow-xl hover:bg-slate-50 transition-colors mt-4 font-outfit"
              >
                Authenticate & Enter System
              </motion.button>
            </div>
          </FrostCard>
        </motion.div>
      </div>
    );
  }

  // Pending Approval portal with exact matching design
  if (currentUser.status === 'Pending Approval') {
    return (
      <div className="min-h-screen font-sans text-slate-800 selection:bg-indigo-500/30 flex items-center justify-center p-4 bg-white relative">
        <GlobalStyles />
        <div className="noise-bg" />
        <LoadingOverlay show={isPending} message={pendingMessage} />
        
        {/* Ambient Background Lights */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <FrostCard beam className="p-8 text-left shadow-2xl">
            {/* Squircle warning container with red shield alarm */}
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/25 text-rose-500 rounded-[18px] flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(239,68,68,0.08)]">
              <ShieldAlert className="w-6 h-6 stroke-[1.8]" />
            </div>
            
            {/* Header Block */}
            <div className="mb-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">Verification Required</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">Access Control System</p>
            </div>
            
            {/* Description */}
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Administrator approval is required before access can be granted.
            </p>

            {/* Pending Review Badge */}
            <div className="mb-6">
              <span className="bg-[#1c212b] text-white font-semibold text-xs px-4 py-1.5 rounded-lg inline-block">
                Pending Review
              </span>
            </div>

            {/* Active Authorization Progress Capsule */}
            <div className="w-full bg-[#0e1422] border border-[#1d273a] rounded-xl py-3 px-4 flex items-center gap-2.5 mb-8">
              <span className="text-orange-500 text-xs font-mono">⚡</span>
              <span className="text-slate-400 text-xs font-semibold">Authorization in progress...</span>
            </div>

            {/* Pure White Sign Out Capsule Button */}
            <button 
              onClick={signOut} 
              className="w-full bg-white hover:bg-slate-100 text-black font-semibold py-3.5 rounded-full shadow-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <LogOut className="h-4 w-4 stroke-[2.2]" /> Sign Out
            </button>
          </FrostCard>
        </motion.div>
      </div>
    );
  }

  // Approved! Render unified Lumina Dashboard Layout
  const roleTabs = getRoleTabs(currentUser.role);
  const activeTab = getActiveTab();

  const renderDashboardContent = () => {
    switch (currentUser.role) {
      case 'Technician': 
        return <TechnicianView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Dispatch': 
        return <DispatchView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Supervisor': 
        return <SupervisorView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Project Manager': 
        return <ProjectsView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'Operations Manager': 
        return <OMView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'CEO': 
        return <CEOView activeTab={activeTab} setActiveTab={setActiveTab} />;
      default: 
        return <p>Unknown Role View</p>;
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 selection:bg-indigo-500/30 selection:text-indigo-950 relative font-sans overflow-hidden">
      <GlobalStyles />
      <div className="noise-bg" />
      <LoadingOverlay show={isPending} message={pendingMessage} />
      
      {/* Ambient Background Lights - soft glowing on white layout bg */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">

        {/* Sidebar - w-64 matching Lumina layout exactly with dark slate theme */}
        <aside className={`${isSidebarOpen ? 'flex' : 'hidden'} fixed inset-y-0 z-50 w-64 flex-col gap-8 border-r border-white/5 bg-gradient-to-b from-[#181b40] to-[#0d0e28] p-6 backdrop-blur-xl lg:flex lg:relative lg:inset-auto text-white h-screen`}>
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
                <Hexagon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">EcoOps</span>
            </div>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}><X className="h-5 w-5 text-slate-400"/></button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Menu</p>
            {roleTabs.map((tab) => (
              <NavItem
                key={tab}
                icon={getTabIcon(tab)}
                label={tab}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                badge={getTabBadgeCount(tab)}
              />
            ))}
          </div>

        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 flex flex-col min-w-0 h-full">

          {/* Header - Dark, matching Lumina layout with height 20 */}
          <header className="flex h-16 md:h-20 items-center justify-between border-b border-white/5 bg-[#0d0e28] px-4 md:px-8 backdrop-blur-md text-white z-10">
            <div className="flex items-center gap-4">
              <button className="lg:hidden" onClick={() => setIsSidebarOpen(true)}><Menu className="h-6 w-6 text-slate-400 hover:text-white"/></button>
              <div className="hidden md:flex items-center gap-2 bg-indigo-500/10 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-indigo-500/20 text-xs md:text-sm font-bold text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <span>{currentUser.role.toUpperCase()} DASHBOARD</span>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
              {/* Green indicator matching screenshot */}
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-2 md:px-3 py-1 md:py-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-[9px] md:text-[10px] font-semibold text-slate-400">Healthy</span>
              </div>

              {/* Notification bell */}
              <button className="relative">
                <Bell className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              </button>

              {/* User Avatar with DiceBear Micah seed matching exact Lumina mockup */}
              <div className="flex items-center gap-3 border-l border-white/10 pl-3 md:pl-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white leading-none">{currentUser.name}</p>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest">{currentUser.salary_grade || 'Approved Fit'}</p>
                </div>
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full border border-white/10 bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5">
                  <img 
                    src={`https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(currentUser.name)}`} 
                    className="h-full w-full rounded-full bg-slate-950" 
                    alt="User Micah Avatar"
                  />
                </div>
              </div>

              {/* Quick Logout Button */}
              <button 
                onClick={signOut}
                title="Sign Out"
                className="flex items-center justify-center p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Viewport Scrollable Area with solid pure white background and soft padding */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white scrollbar-thin scrollbar-track-transparent">
            <div className="mx-auto max-w-7xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentUser.role}-${activeTab}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderDashboardContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
