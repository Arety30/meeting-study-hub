import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Radio, 
  Tv, 
  BookOpen, 
  MessageSquare, 
  FileText, 
  CheckSquare, 
  HelpCircle,
  Share2,
  Settings,
  Users,
  Video,
  Mic,
  Smile,
  LogOut,
  Sliders,
  Sparkle,
  Calendar as CalendarIcon,
  Plus,
  Lock,
  Mail,
  UserPlus,
  Shield,
  Clock,
  ArrowRight,
  User as UserIcon,
  CalendarRange
} from "lucide-react";
import MeetingStage from "./components/MeetingStage";
import NotebookLM, { PRESET_DOCUMENTS } from "./components/NotebookLM";
import MeetingChat from "./components/MeetingChat";
import NotesPanel from "./components/NotesPanel";
import ObsidianWorkspace from "./components/ObsidianWorkspace";
import { Document, Participant, ChatMessage, TranscriptEntry } from "./types";

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  invites: string[];
  organizer: string;
}

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; email: string } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // --- App View State ---
  const [activeViewTab, setActiveViewTab] = useState<"lounge" | "obsidian" | "calendar">("lounge");
  const [aiConsentGiven, setAiConsentGiven] = useState<boolean>(false);

  // --- Notebook & Source States ---
  const [documents, setDocuments] = useState<Document[]>(PRESET_DOCUMENTS);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(PRESET_DOCUMENTS[0]?.id || null);

  // --- Scheduling Meetings State ---
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDate, setScheduleDate] = useState("2026-06-26");
  const [scheduleTime, setScheduleTime] = useState("14:00");
  const [scheduleDuration, setScheduleDuration] = useState("60");
  const [scheduleInvites, setScheduleInvites] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  // Initialize participants
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "local-user",
      name: "Sarah Miller",
      isAI: false,
      activeSpeaker: false,
      cameraOn: true,
      micOn: true,
      isLocal: true,
      color: "from-orange-500 to-amber-600",
      role: "Lead Student",
      avatarIcon: "👩‍🎓"
    },
    {
      id: "ai-lumina",
      name: "Lumina",
      isAI: true,
      activeSpeaker: false,
      cameraOn: false,
      micOn: true,
      isLocal: false,
      color: "from-indigo-600 to-violet-700",
      role: "Warm Study Buddy",
      avatarIcon: "✨"
    },
    {
      id: "ai-keith",
      name: "Dr. Keith",
      isAI: true,
      activeSpeaker: false,
      cameraOn: false,
      micOn: false,
      isLocal: false,
      color: "from-emerald-600 to-teal-700",
      role: "Critical Advisor",
      avatarIcon: "🔬"
    },
    {
      id: "lecturer-aris",
      name: "Dr. Aris Thorne",
      isAI: false,
      activeSpeaker: true,
      cameraOn: false,
      micOn: true,
      isLocal: false,
      color: "from-blue-600 to-indigo-700",
      role: "Guest Lecturer",
      avatarIcon: "👨‍🏫"
    }
  ]);

  // Messages log
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Live Spoken Transcript log (simulating verbal contributions)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      id: "tr-init-1",
      speaker: "Dr. Aris Thorne",
      text: "The Transformer is revolutionary because it discards sequential recurrent loops entirely, allowing multi-head self-attention to run completely in parallel.",
      timestamp: "14:19",
      isAI: false
    },
    {
      id: "tr-init-2",
      speaker: "Lumina",
      text: "Absolutely! That is what allows us to scale these models to billions of parameters without running into training memory bottlenecks.",
      timestamp: "14:21",
      isAI: true
    }
  ]);

  // Audio streams & presentation
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(true); // Start with presentation screen share active!

  // Right-hand notebook tabs: "notebook" (NotebookLM Sources + Q&A) vs "synthesis" (Study guides + Flashcards)
  const [notebookTab, setNotebookTab] = useState<"notebook" | "synthesis">("notebook");

  // --- Session Restoration ---
  useEffect(() => {
    const token = localStorage.getItem("studysync_token");
    if (token) {
      setAuthLoading(true);
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Expired session");
        })
        .then(user => {
          setCurrentUser(user);
          localStorage.setItem("studysync_user", JSON.stringify(user));
          // Update local participant name matching authenticated user
          setParticipants(prev => prev.map(p => p.isLocal ? { ...p, name: user.username } : p));
        })
        .catch(() => {
          localStorage.removeItem("studysync_token");
          localStorage.removeItem("studysync_user");
        })
        .finally(() => setAuthLoading(false));
    }
    fetchMeetings();
  }, []);

  const fetchMeetings = () => {
    fetch("/api/meetings")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMeetings(data);
      })
      .catch(err => console.warn("Error fetching meetings:", err));
  };

  // Switch active AI partner speaker manually from the lobby list
  function toggleSpeakerActive(participantId: string) {
    setParticipants(prev => prev.map(p => {
      if (p.id === participantId) {
        return { ...p, activeSpeaker: true };
      }
      if (p.isAI) {
        return { ...p, activeSpeaker: false };
      }
      return p;
    }));
  }

  // --- Auth Handlers ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword || !authUsername) {
      setAuthError("All registration fields are required.");
      return;
    }
    setAuthLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, username: authUsername })
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Registration failed.");
      } else {
        localStorage.setItem("studysync_token", data.token);
        localStorage.setItem("studysync_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setParticipants(prev => prev.map(p => p.isLocal ? { ...p, name: data.user.username } : p));
      }
    } catch (err: any) {
      setAuthError(err.message || "Something went wrong.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError("Please input your email and password.");
      return;
    }
    setAuthLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Login credentials invalid.");
      } else {
        localStorage.setItem("studysync_token", data.token);
        localStorage.setItem("studysync_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setParticipants(prev => prev.map(p => p.isLocal ? { ...p, name: data.user.username } : p));
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred during authentication.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("studysync_token");
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem("studysync_token");
    localStorage.removeItem("studysync_user");
    setCurrentUser(null);
  };

  // --- Meeting Scheduler Handler ---
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);
    setScheduleSuccess(false);

    if (!scheduleTitle || !scheduleDate || !scheduleTime) {
      setScheduleError("Please complete all required fields (Title, Date, Time).");
      return;
    }

    const token = localStorage.getItem("studysync_token");
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          title: scheduleTitle,
          date: scheduleDate,
          time: scheduleTime,
          duration: scheduleDuration,
          invites: scheduleInvites
        })
      });

      if (!response.ok) {
        throw new Error("Unable to schedule meeting.");
      }

      setScheduleSuccess(true);
      setScheduleTitle("");
      setScheduleInvites("");
      fetchMeetings();
      setTimeout(() => setScheduleSuccess(false), 4000);
    } catch (err: any) {
      setScheduleError(err.message);
    }
  };

  // --- Month Calendar Generation Helpers ---
  // Simple June 2026 Monthly Calendar (since local time is June 25, 2026)
  const currentMonthName = "June 2026";
  const daysInJune = 30;
  const startDayOffset = 1; // June 1st, 2026 is Monday (offset 1 in standard calendar start)
  const calendarDays = Array.from({ length: daysInJune }, (_, i) => i + 1);

  const getMeetingsForDay = (day: number) => {
    const dateStr = `2026-06-${String(day).padStart(2, "0")}`;
    return meetings.filter(m => m.date === dateStr);
  };

  return (
    <div className="w-full min-h-screen bg-neutral-950 text-slate-100 flex flex-col overflow-x-hidden relative font-sans selection:bg-emerald-800/35 selection:text-white">
      
      {/* --- Frosted Glass Aesthetic Glow Orbs --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-950/20 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-950/20 rounded-full blur-[140px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* --- Auth Gate Overlay --- */}
      <AnimatePresence>
        {!currentUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -15 }}
              className="w-full max-w-md bg-neutral-900/85 border border-emerald-900/40 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Subtle accent glow inside card */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex flex-col items-center text-center mb-6 relative z-10">
                <div className="w-12 h-12 bg-emerald-950 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-800/40 shadow-inner mb-4">
                  <Sparkles className="w-6 h-6 animate-pulse text-sky-400" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white font-display italic">
                  StudySync <span className="font-light text-slate-400 not-italic">Lounge</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  Join a high-contrast advanced workspace for peer study groups, live recording, and real-time NotebookLM integrations.
                </p>
              </div>

              {/* Tab Toggles */}
              <div className="flex p-0.5 bg-black/40 rounded-xl border border-emerald-900/20 mb-6 relative z-10">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(null); }}
                  className={`flex-1 py-2 text-xs font-semibold font-mono rounded-lg transition-all ${
                    authMode === "login" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shadow-inner" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthError(null); }}
                  className={`flex-1 py-2 text-xs font-semibold font-mono rounded-lg transition-all ${
                    authMode === "register" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shadow-inner" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {authError && (
                <div className="mb-4 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium leading-relaxed">
                  {authError}
                </div>
              )}

              <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4 relative z-10">
                {authMode === "register" && (
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. sarah_miller"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        className="w-full bg-white/5 border border-emerald-900/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-700 transition-colors"
                      />
                      <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="you@university.edu"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-white/5 border border-emerald-900/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-700 transition-colors"
                    />
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Secure Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-white/5 border border-emerald-900/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-700 transition-colors"
                    />
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 mt-2 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 border border-emerald-600/30 text-white font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {authLoading ? "Synchronizing..." : authMode === "login" ? "Enter study lounge" : "Complete Registration"}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-emerald-900/20 text-center">
                <span className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Your academic credentials are encrypted locally
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main Application Frame (Only visible if logged in) --- */}
      {currentUser && (
        <>
          {/* --- Header Navigation --- */}
          <nav className="relative z-10 h-16 border-b border-white/10 backdrop-blur-md bg-white/5 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-950 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-800/35">
                <Sparkles className="w-5 h-5 text-sky-300 animate-pulse" />
              </div>
              <div>
                <h1 className="text-md font-bold tracking-tight text-white font-display italic flex items-center gap-2">
                  StudySync <span className="font-normal text-slate-400 not-italic">|</span> 
                  <span className="font-medium text-emerald-400 not-italic text-sm hidden sm:inline">Advanced AI Study Room</span>
                </h1>
              </div>
            </div>

            {/* Middle Nav Switches for Applet Modes */}
            <div className="flex p-0.5 bg-black/40 rounded-xl border border-emerald-900/30">
              <button
                type="button"
                onClick={() => setActiveViewTab("lounge")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeViewTab === "lounge"
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shadow-inner"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Lounge Stage</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("obsidian")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeViewTab === "obsidian"
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shadow-inner"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Obsidian Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab("calendar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeViewTab === "calendar"
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 shadow-inner"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Scheduler</span>
                {meetings.length > 0 && (
                  <span className="bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {meetings.length}
                  </span>
                )}
              </button>
            </div>

            {/* Right hand Side: User Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-emerald-900/25 rounded-full py-1.5 px-3 text-xs">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-sky-300">
                  {currentUser.username}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out of workspace"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-rose-950/40 text-rose-300 border border-rose-900/30 hover:bg-rose-900/30 hover:text-rose-200 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>

          {/* --- VIEW 1: Active Lounge Study Room (The Core Interactive App) --- */}
          {activeViewTab === "lounge" && (
            <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
              
              {/* LEFT COLUMN: Video Meeting & Interactive Communication Panels (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Main Stage Panel (webcams & screen presentation) */}
                <div className="flex-1 min-h-[350px]">
                  <MeetingStage
                    participants={participants}
                    setParticipants={setParticipants}
                    localStream={localStream}
                    setLocalStream={setLocalStream}
                    isScreenSharing={isScreenSharing}
                    setIsScreenSharing={setIsScreenSharing}
                    aiConsentGiven={aiConsentGiven}
                    setAiConsentGiven={setAiConsentGiven}
                  />
                </div>

                {/* Real-time Meeting Chat & Voice dictation simulator panel */}
                <div className="h-[380px]">
                  <MeetingChat
                    messages={messages}
                    setMessages={setMessages}
                    transcript={transcript}
                    setTranscript={setTranscript}
                    documents={documents}
                    participants={participants}
                    setParticipants={setParticipants}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: NotebookLM Knowledge Base & Synthesis (4 cols) */}
              <div className="lg:col-span-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
                
                {/* Notebook Header */}
                <div className="p-5 border-b border-white/10 bg-slate-950/40">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-display">NotebookLM Dashboard</h2>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      Auto-Syncing
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="flex p-0.5 bg-black/40 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setNotebookTab("notebook")}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono transition-all duration-200 ${
                        notebookTab === "notebook"
                          ? "bg-white/15 text-white shadow-lg"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      Sources & Reader
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotebookTab("synthesis")}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold font-mono transition-all duration-200 ${
                        notebookTab === "synthesis"
                          ? "bg-white/15 text-white shadow-lg"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      AI Study Guides
                    </button>
                  </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <AnimatePresence mode="wait">
                    {notebookTab === "notebook" ? (
                      <motion.div
                        key="notebook"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 flex flex-col overflow-hidden"
                      >
                        <NotebookLM
                          documents={documents}
                          setDocuments={setDocuments}
                          selectedDocId={selectedDocId}
                          setSelectedDocId={setSelectedDocId}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="synthesis"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 flex flex-col overflow-hidden"
                      >
                        <NotesPanel
                          documents={documents}
                          transcript={transcript}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-3 bg-black/30 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Primary AI Speaker:</span>
                  <span className="text-indigo-400 font-bold">
                    {participants.find(p => p.isAI && p.activeSpeaker)?.name || "Lumina"}
                  </span>
                </div>
              </div>
            </main>
          )}

          {/* --- VIEW 3: Obsidian Knowledge Base & Local Workspace --- */}
          {activeViewTab === "obsidian" && (
            <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 overflow-hidden flex flex-col min-h-[600px]">
              <ObsidianWorkspace
                transcript={transcript}
                messages={messages}
                meetings={meetings.map(m => ({ id: m.id, title: m.title }))}
                onOpenMeeting={() => {
                  setActiveViewTab("lounge");
                }}
              />
            </main>
          )}

          {/* --- VIEW 2: Scheduler, Invites & Interactive Monthly Calendar --- */}
          {activeViewTab === "calendar" && (
            <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Interactive Month Grid View (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-slate-900/60 border border-white/10 backdrop-blur-md rounded-3xl p-6 shadow-xl">
                  
                  {/* Calendar Title Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                        University Study Schedules
                      </span>
                      <h2 className="text-2xl font-bold font-display italic text-white flex items-center gap-2">
                        <CalendarRange className="w-6 h-6 text-indigo-400" />
                        {currentMonthName}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                      <span className="text-xs font-mono text-slate-400">Scheduled Sessions</span>
                    </div>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-white/5 pb-2">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-2.5">
                    {/* Padding cells for start day offset */}
                    {Array.from({ length: startDayOffset }).map((_, i) => (
                      <div key={`offset-${i}`} className="aspect-square bg-white/0 rounded-xl" />
                    ))}

                    {/* Day Cells */}
                    {calendarDays.map((day) => {
                      const dayMeetings = getMeetingsForDay(day);
                      const isToday = day === 25; // Pre-seeded local date day is June 25
                      const isSelected = selectedCalendarDay === day;

                      return (
                        <div
                          key={`day-${day}`}
                          onClick={() => setSelectedCalendarDay(isSelected ? null : day)}
                          className={`aspect-square p-2.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                            isSelected
                              ? "bg-indigo-600/40 border-indigo-400 shadow-lg shadow-indigo-500/10 scale-105"
                              : isToday
                              ? "bg-white/10 border-white/20 hover:bg-white/15"
                              : "bg-white/5 border-white/5 hover:bg-white/10"
                          }`}
                        >
                          {/* Day number */}
                          <span className={`text-xs font-mono font-semibold ${
                            isToday ? "text-indigo-300 font-bold underline decoration-indigo-400 decoration-2 underline-offset-4" : "text-slate-300"
                          }`}>
                            {day}
                          </span>

                          {/* Dots / Mini indicators for meetings */}
                          <div className="flex flex-col gap-1 mt-1">
                            {dayMeetings.map((meet, mIdx) => (
                              <div
                                key={meet.id}
                                title={meet.title}
                                className={`h-1.5 rounded-full ${
                                  mIdx === 0 ? "bg-indigo-400" : mIdx === 1 ? "bg-teal-400" : "bg-amber-400"
                                }`}
                              />
                            ))}
                          </div>

                          {/* Hover tooltip */}
                          {dayMeetings.length > 0 && (
                            <span className="absolute bottom-1 right-1.5 text-[9px] font-bold font-mono text-indigo-300 opacity-60 group-hover:opacity-100">
                              {dayMeetings.length}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar footer tip */}
                  <p className="text-[10px] text-slate-500 font-mono text-center mt-6">
                    Click on any numbered day card to filter and inspect specific scheduled study meetings.
                  </p>
                </div>

                {/* Selected Day Meetings Panel */}
                <div className="bg-slate-900/40 border border-white/5 backdrop-blur-md rounded-3xl p-6 shadow-lg">
                  <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    {selectedCalendarDay 
                      ? `Schedules for June ${selectedCalendarDay}, 2026` 
                      : "Chronological Study Calendar & Lineup"}
                  </h3>

                  <div className="space-y-4">
                    {(selectedCalendarDay ? getMeetingsForDay(selectedCalendarDay) : meetings).map((meet) => (
                      <div 
                        key={meet.id} 
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-300 shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                              {meet.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono mt-1">
                              <span className="text-indigo-300">Organized by {meet.organizer}</span>
                              <span className="text-slate-500">•</span>
                              <span>Date: {meet.date}</span>
                              <span className="text-slate-500">•</span>
                              <span>Time: {meet.time} ({meet.duration} min)</span>
                            </div>
                          </div>
                        </div>

                        {/* Invited lists tags */}
                        {meet.invites && meet.invites.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-w-xs shrink-0">
                            {meet.invites.map((user, uIdx) => (
                              <span 
                                key={uIdx} 
                                className="px-2.5 py-0.5 bg-indigo-950/40 border border-indigo-800/40 text-[9px] font-bold text-indigo-300 rounded-md font-mono"
                              >
                                {user}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {(selectedCalendarDay ? getMeetingsForDay(selectedCalendarDay) : meetings).length === 0 && (
                      <div className="text-center py-8 text-slate-500 font-mono text-xs">
                        No custom study meetings scheduled for this filter. Utilize the scheduler to book one!
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Dynamic Scheduler Form (4 cols) */}
              <div className="lg:col-span-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-5 sm:p-6 flex flex-col shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="mb-6">
                  <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest">
                    Study Booking Engine
                  </span>
                  <h3 className="text-lg font-bold text-white font-display mt-1">
                    Schedule New Lounge
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Set up future study sessions, designate topics, and invite fellow peer students or custom advisor bots.
                  </p>
                </div>

                {scheduleSuccess && (
                  <div className="mb-4 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs font-semibold">
                    ✓ Study Lounge scheduled and synchronized perfectly.
                  </div>
                )}

                {scheduleError && (
                  <div className="mb-4 px-4 py-2.5 bg-rose-500/15 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-medium">
                    {scheduleError}
                  </div>
                )}

                <form onSubmit={handleScheduleMeeting} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Meeting Title / Topic *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Transformers & Self-Attention"
                      value={scheduleTitle}
                      onChange={(e) => setScheduleTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Choose Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Duration (Minutes)
                    </label>
                    <select
                      value={scheduleDuration}
                      onChange={(e) => setScheduleDuration(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      <option className="bg-slate-900" value="30">30 Minutes</option>
                      <option className="bg-slate-900" value="45">45 Minutes</option>
                      <option className="bg-slate-900" value="60">1 Hour</option>
                      <option className="bg-slate-900" value="90">1.5 Hours</option>
                      <option className="bg-slate-900" value="120">2 Hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Invite Participants
                    </label>
                    <textarea
                      placeholder="Enter emails or usernames (comma-separated, e.g. Lumina, Dr. Keith, user@example.com)"
                      value={scheduleInvites}
                      onChange={(e) => setScheduleInvites(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 mt-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold text-xs font-mono uppercase tracking-widest rounded-xl transition shadow active:scale-95"
                  >
                    Schedule Lounge Room
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/5 text-center">
                  <p className="text-[10px] text-slate-500 font-mono">
                    All invitations will automatically be notified on the dashboard timeline with quick session join access links.
                  </p>
                </div>
              </div>
            </main>
          )}

          {/* --- Bottom Shared Stage Floating Dock --- */}
          <footer className="py-4 text-center border-t border-white/5 bg-slate-950/80 backdrop-blur-md relative z-10 flex flex-col md:flex-row md:justify-between items-center px-6 gap-3">
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">
              StudySync Advanced Learning Workspace • Powered by Local Llama 3.2, OpenAI Whisper, & Piper TTS
            </p>
            <span className="text-[10px] text-indigo-400 font-mono">
              Role: Lead Student • Environment Secure
            </span>
          </footer>
        </>
      )}

    </div>
  );
}
