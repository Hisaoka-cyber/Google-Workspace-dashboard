import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DashboardLayout } from './components/DashboardLayout'
import { useAuth } from './contexts/AuthContext'
import { Calendar, CheckSquare, FileText, AlertCircle, Loader2, BarChart3, ExternalLink, BookOpen, ClipboardList } from 'lucide-react'
import { CalendarWidget } from './components/CalendarWidget'
import { TasksWidget } from './components/TasksWidget'
import { DriveWidget } from './components/DriveWidget'

// --- Layout & Guard ---

function AppContent() {
  const { isLoaded, clientId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-zinc-500 font-medium">Initializing Google Palette...</p>
      </div>
    );
  }

  if (!clientId) {
    const isIpAccess = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-6">
        <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl">
          <AlertCircle className="w-16 h-16 text-blue-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black">Ready to sync?</h2>
          <p className="text-zinc-500">Connect your Google account to start managing your schedule, tasks, and documents from one place.</p>
        </div>
        {isIpAccess && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-left">
            <h4 className="text-xs font-bold text-red-600 uppercase mb-1">Warning: IP Access detected</h4>
            <p className="text-[11px] text-red-500">Google OAuth only works on <strong>localhost</strong>. Please access via <a href={`http://localhost:${window.location.port}`} className="underline font-bold">http://localhost:{window.location.port}</a></p>
          </div>
        )}
        <div className="p-6 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl w-full border border-dashed border-zinc-300 dark:border-zinc-700">
          <p className="text-sm font-semibold mb-2">Step 1: Setup API Keys</p>
          <p className="text-xs text-zinc-500 italic">"Go to Settings and enter your OAuth Client ID to begin."</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DashboardOverview />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/notebooklm" element={<NotebookLMPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/colab" element={<ColabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

// --- Page Components ---

function AttendancePage() {
  const { isSignedIn } = useAuth();
  const [fileId, setFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      fetchLatestAttendancePdf();
    }
  }, [isSignedIn]);

  const fetchLatestAttendancePdf = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Find the '勤務表' folder
      const folderResponse = await (gapi.client as any).drive.files.list({
        q: "name = '勤務表' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name)',
      });

      const folders = folderResponse.result.files;
      if (!folders || folders.length === 0) {
        throw new Error("Folder '勤務表' not found in your Google Drive.");
      }

      const folderId = folders[0].id;

      // 2. Find the latest PDF in that folder
      const fileResponse = await (gapi.client as any).drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`,
        orderBy: 'modifiedTime desc',
        pageSize: 1,
        fields: 'files(id, name, modifiedTime)',
      });

      const files = fileResponse.result.files;
      if (!files || files.length === 0) {
        throw new Error("No PDF files found in the '勤務表' folder.");
      }

      setFileId(files[0].id);
    } catch (err: any) {
      console.error('Error fetching attendance PDF:', err);
      setError(err.message || "Failed to load the attendance sheet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-emerald-600">
            <ClipboardList className="w-8 h-8" />
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">勤務表</h2>
          </div>
          <p className="text-zinc-500">Automatically displaying the latest attendance sheet from your '勤務表' folder.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchLatestAttendancePdf}
            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            title="Refresh"
          >
            <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Drive</span>
          </a>
        </div>
      </header>

      <div className="flex-1 min-h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-sm font-medium text-zinc-500">Searching for the latest attendance sheet...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-full text-red-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">Couldn't load attendance sheet</p>
              <p className="text-sm text-zinc-500 max-w-sm">{error}</p>
            </div>
            <button
              onClick={fetchLatestAttendancePdf}
              className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm"
            >
              Try Again
            </button>
          </div>
        ) : fileId ? (
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            style={{ border: 0 }}
            width="100%"
            height="100%"
            frameBorder="0"
            className="w-full h-full"
            title="Attendance PDF"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 italic">
            Please sign in to view your attendance sheet.
          </div>
        )}
      </div>
    </div>
  );
}

function NotebookLMPage() {
  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-purple-600">
            <BookOpen className="w-8 h-8" />
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">NotebookLM</h2>
          </div>
          <p className="text-zinc-500">Analyze your documents with AI-powered insights.</p>
        </div>
        <a
          href="https://notebooklm.google.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all transform hover:-translate-y-0.5"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Full Site</span>
        </a>
      </header>

      <div className="flex-1 min-h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm relative group">
        <iframe
          src="https://notebooklm.google.com"
          style={{ border: 0 }}
          width="100%"
          height="100%"
          frameBorder="0"
          className="w-full h-full"
          title="NotebookLM"
        />
        {/* Helper overlay for when iframe might be blocked */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/80 dark:bg-zinc-900/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300">
          <p className="text-sm font-medium text-zinc-500 mb-4">Click "Open Full Site" if the view doesn't load.</p>
        </div>
      </div>
    </div>
  );
}

function DashboardOverview() {
  const { isSignedIn } = useAuth();
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h2 className="text-3xl font-black">Workplace Overview</h2>
        <p className="text-zinc-500 mt-1">Everything you need to stay productive today.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <ModuleCard
          title="Upcoming Schedule"
          icon={<Calendar className="text-blue-500" />}
          description="Your Google Calendar events"
          status={isSignedIn ? "online" : "offline"}
        >
          <CalendarWidget />
        </ModuleCard>

        <ModuleCard
          title="Active Tasks"
          icon={<CheckSquare className="text-emerald-500" />}
          description="Google Tasks integration"
          status={isSignedIn ? "online" : "offline"}
        >
          <TasksWidget />
        </ModuleCard>

        <ModuleCard
          title="Recent Documents"
          icon={<FileText className="text-amber-500" />}
          description="Drive & Colab files"
          status={isSignedIn ? "online" : "offline"}
        >
          <DriveWidget />
        </ModuleCard>

        <ModuleCard
          title="勤務表"
          icon={<ClipboardList className="text-emerald-500" />}
          description="Latest attendance sheet"
          status={isSignedIn ? "online" : "offline"}
        >
          <div className="h-[200px] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-full text-emerald-500">
              <ClipboardList className="w-8 h-8" />
            </div>
            <p className="text-xs text-zinc-500">Automatically syncs with your '勤務表' Drive folder.</p>
            <Link
              to="/attendance"
              className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
            >
              View Latest Sheet
            </Link>
          </div>
        </ModuleCard>
      </div>
    </div>
  );
}

function CalendarPage() {
  const { user, isSignedIn } = useAuth();
  const [calendarIds, setCalendarIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      fetchCalendarList();
    }
  }, [isSignedIn]);

  const fetchCalendarList = async () => {
    setIsSyncing(true);
    try {
      const response = await (gapi.client as any).calendar.calendarList.list();
      const items = response.result.items || [];
      // Filter for selected calendars and get their IDs
      const ids = items
        .filter((item: any) => item.selected)
        .map((item: any) => item.id);

      // If none selected, fallback to primary email
      if (ids.length === 0 && user) {
        ids.push(user.getEmail());
      }

      setCalendarIds(ids);
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      if (user) setCalendarIds([user.getEmail()]);
    } finally {
      setIsSyncing(false);
    }
  };

  const baseUrl = "https://calendar.google.com/calendar/embed";
  const params = new URLSearchParams();

  calendarIds.forEach(id => {
    params.append('src', id);
  });

  params.append('ctz', 'Asia/Tokyo');
  // Optional: add styling parameters
  params.append('showTitle', '0');
  params.append('showNav', '1');
  params.append('showPrint', '0');
  params.append('showTabs', '1');
  params.append('showCalendars', '1');

  const calendarUrl = calendarIds.length > 0 ? `${baseUrl}?${params.toString()}` : null;

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-600">
            <Calendar className="w-8 h-8" />
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">Calendar</h2>
          </div>
          <p className="text-zinc-500">Manage all your calendars and meetings in one view.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchCalendarList}
            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            title="Refresh Calendar List"
          >
            <Loader2 className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open in New Tab</span>
          </a>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 pb-6">
        {/* Left: Quick Actions Widget */}
        <div className="lg:w-[400px] shrink-0">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 h-full overflow-y-auto">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-6">Quick Management</h3>
            <CalendarWidget />
          </div>
        </div>

        {/* Right: Full Embedded Calendar */}
        <div className="flex-1 min-h-[500px] lg:min-h-0">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden h-full shadow-sm relative">
            {isSyncing && calendarIds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-zinc-500 font-medium">Syncing calendars...</p>
              </div>
            ) : calendarUrl ? (
              <iframe
                src={calendarUrl}
                style={{ border: 0 }}
                width="100%"
                height="100%"
                className="dark:invert dark:hue-rotate-180 dark:contrast-75 opacity-90 transition-opacity hover:opacity-100"
                title="Google Calendar"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 italic">
                Sign in to view the interactive calendar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksPage() {
  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3 text-emerald-600 mb-2">
          <CheckSquare className="w-8 h-8" />
          <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">To-Do</h2>
        </div>
        <p className="text-zinc-500">Stay on top of your tasks.</p>
      </header>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 min-h-[500px]">
        <TasksWidget />
      </div>
    </div>
  );
}

function DocumentsPage() {
  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-amber-600">
            <FileText className="w-8 h-8" />
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">Documents</h2>
          </div>
          <p className="text-zinc-500">Browse your recent Google Drive files and manage your storage.</p>
        </div>
        <a
          href="https://drive.google.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">Open Full Drive</span>
        </a>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 pb-6">
        {/* Left: Recent Files Widget */}
        <div className="lg:w-[400px] shrink-0">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 h-full overflow-y-auto">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-6">Recent Activity</h3>
            <DriveWidget />
          </div>
        </div>

        {/* Right: Full Drive Interface */}
        <div className="flex-1 min-h-[500px] lg:min-h-0">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden h-full shadow-sm relative group">
            <iframe
              src="https://drive.google.com"
              style={{ border: 0 }}
              width="100%"
              height="100%"
              frameBorder="0"
              className="w-full h-full"
              title="Google Drive"
            />
            {/* Overlay disclaimer since Drive often blocks iframes */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/80 dark:bg-zinc-900/80 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 p-8 text-center">
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mb-2">Google Drive Interface</p>
              <p className="text-xs text-zinc-500">If the drive view doesn't load here due to security settings, please use the <strong>"Open Full Drive"</strong> button above.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColabPage() {
  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3 text-indigo-600 mb-2">
          <BarChart3 className="w-8 h-8" />
          <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">Google Colab</h2>
        </div>
        <p className="text-zinc-500">Quick access to your AI & Data notebooks.</p>
      </header>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 min-h-[500px]">
        <DriveWidget />
      </div>
    </div>
  );
}

// --- Shared Components ---

function ModuleCard({ title, icon, description, children, status = "offline" }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
            {React.cloneElement(icon, { size: 24 })}
          </div>
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
          }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
          {status}
        </div>
      </div>
      {children}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
