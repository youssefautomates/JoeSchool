"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Search, BookOpen, Clock, Award, CheckCircle2, 
  ShieldAlert, Edit, Trash2, X, ShieldCheck, Loader2, RefreshCw, 
  Laptop, Globe, Key, AlertCircle, Ban, ArrowLeftRight, Plus, Sparkles
} from "lucide-react";
import { 
  getEnrollmentsForAdmin, 
  getCoursesList, 
  getCourseProgressPercent, 
  updateStudentProfile, 
  removeStudentFromCourse, 
  updateEnrollmentStatus,
  getActiveSessions,
  getUserStatus,
  toggleUserSuspension,
  type LmsEnrollment, 
  type LmsCourse 
} from "@/lib/coursesDb";
import { supabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StudentRow extends LmsEnrollment {
  courseTitle: string;
  percent: number;
  completedCount: number;
  totalCount: number;
  isFinished: boolean;
  totalWatchSeconds?: number;
  lastActivityDate?: string | null;
  streak?: number;
}

export default function AdminStudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  // Add Student Modal States
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    courseId: ""
  });
  const [addingLoading, setAddingLoading] = useState(false);

  // CRM Action Modal States
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [modalTab, setModalTab] = useState<"profile" | "devices" | "security" | "progress">("profile");
  
  // Profile Tab States
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Active Sessions States
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Security / Suspension States
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    let enrolls = await getEnrollmentsForAdmin();
    const lmsCourses = await getCoursesList();
    setCourses(lmsCourses);
    if (lmsCourses.length > 0) {
      setNewStudent(prev => ({ ...prev, courseId: prev.courseId || lmsCourses[0].id }));
    }

    if (enrolls.length === 0 && lmsCourses.length > 0) {
      // Seed beautiful demonstration students for first load
      const { enrollUser } = await import("@/lib/coursesDb");
      await enrollUser("usr-student-1", lmsCourses[0].id, { email: "ahmed.ali@gmail.com", name: "Ahmed Ali" });
      await enrollUser("usr-student-2", lmsCourses[0].id, { email: "yassine.automates@outlook.com", name: "Yassine Abdelrahman" });
      if (lmsCourses[1]) {
        await enrollUser("usr-student-3", lmsCourses[1].id, { email: "m.nour@yahoo.com", name: "Mohamed Nour" });
      }
      
      const { toggleLessonCompleted, getCourseBySlug } = await import("@/lib/coursesDb");
      const { sections: sec1 } = await getCourseBySlug(lmsCourses[0].slug);
      if (sec1.length > 0 && sec1[0].lessons.length > 0) {
        await toggleLessonCompleted("usr-student-1", sec1[0].lessons[0].id, lmsCourses[0].id, "Ahmed Ali");
        if (sec1[0].lessons[1]) {
          await toggleLessonCompleted("usr-student-1", sec1[0].lessons[1].id, lmsCourses[0].id, "Ahmed Ali");
        }
        
        for (const sec of sec1) {
          for (const les of sec.lessons) {
            await toggleLessonCompleted("usr-student-2", les.id, lmsCourses[0].id, "Yassine Abdelrahman");
          }
        }
      }

      enrolls = await getEnrollmentsForAdmin();
    }

    const populated: StudentRow[] = [];
    for (const e of enrolls) {
      const c = lmsCourses.find(course => course.id === e.course_id);
      const courseTitle = c?.title || "Unknown Course Path";
      const { percent, completedCount, totalCount, isFinished } = await getCourseProgressPercent(e.user_id, e.course_id);
      
      let totalWatchSeconds = 0;
      let lastActivityDate = null;
      let streak = 0;
      try {
        const pRes = await fetch(`/api/students/${e.user_id}/progress`);
        if (pRes.ok) {
          const pData = await pRes.json();
          totalWatchSeconds = pData.totalWatchSeconds;
          lastActivityDate = pData.lastActivityDate;
          streak = pData.streak;
        }
      } catch (err) {}

      populated.push({
        ...e,
        courseTitle,
        percent,
        completedCount,
        totalCount,
        isFinished,
        totalWatchSeconds,
        lastActivityDate,
        streak
      });
    }

    setRows(populated);
    setLoading(false);
  };

  // Open Manage Modal & pre-load dynamic device sessions & global user statuses
  const handleOpenActionModal = async (student: StudentRow) => {
    setSelectedStudent(student);
    setModalTab("profile");
    setEditName(student.user_name || "");
    setEditEmail(student.user_email || "");
    
    // Load device sessions
    setLoadingSessions(true);
    try {
      const sessionsList = await getActiveSessions(student.user_id);
      setActiveSessions(sessionsList);
    } catch (e) {}
    setLoadingSessions(false);

    // Load Suspension details
    try {
      const status = await getUserStatus(student.user_id);
      if (status) {
        setIsSuspended(status.is_suspended);
        setSuspensionReason(status.suspension_reason || "");
      } else {
        setIsSuspended(false);
        setSuspensionReason("");
      }
    } catch (e) {}
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSaving(true);

    try {
      const success = await updateStudentProfile(selectedStudent.user_id, editName, editEmail);
      if (success) {
        toast.success("Student profile updated successfully! ✨");
        setSelectedStudent(null);
        await loadData();
      } else {
        toast.error("Failed to update student profile");
      }
    } catch (err) {
      toast.error("An error occurred while saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSavingSecurity(true);

    try {
      const success = await toggleUserSuspension(selectedStudent.user_id, isSuspended, suspensionReason);
      if (success) {
        toast.success("Student security and suspension state updated successfully! 🛡️");
        setSelectedStudent(null);
        await loadData();
      } else {
        toast.error("Failed to update suspension state");
      }
    } catch (err) {
      toast.error("An error occurred while saving security details");
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabaseClient
        .from("active_sessions")
        .update({ is_active: false })
        .eq("id", sessionId);

      if (error) throw error;
      
      toast.success("Session terminated and connection severed from active device! 🔌");
      
      // Reload sessions
      if (selectedStudent) {
        const updated = await getActiveSessions(selectedStudent.user_id);
        setActiveSessions(updated);
      }
    } catch (err) {
      toast.error("Failed to terminate the selected session");
    }
  };

  const handleDisenroll = async () => {
    if (!selectedStudent) return;
    if (!confirm("Are you sure you want to disenroll this student and permanently delete their learning progress? This action is irreversible.")) return;

    try {
      const success = await removeStudentFromCourse(selectedStudent.user_id, selectedStudent.course_id);
      if (success) {
        toast.success("Student disenrolled and their progress successfully deleted!");
        setSelectedStudent(null);
        await loadData();
      } else {
        toast.error("Failed to disenroll student");
      }
    } catch (err) {
      toast.error("An error occurred while disenrolling the student");
    }
  };

  const handleCreateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.email || !newStudent.password || !newStudent.firstName || !newStudent.lastName || !newStudent.courseId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setAddingLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create student account");

      toast.success("Student account created and successfully enrolled in the course! 🎉");
      setIsAddingStudent(false);
      
      // Reset form
      setNewStudent({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        courseId: courses[0]?.id || ""
      });

      // Reload list
      await loadData();

    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setAddingLoading(false);
    }
  };

  const filteredRows = rows.filter(r => {
    const matchSearch = 
      (r.user_name?.toLowerCase().includes(search.toLowerCase())) || 
      (r.user_email?.toLowerCase().includes(search.toLowerCase()));
    const matchCourse = selectedCourseId === "all" || r.course_id === selectedCourseId;
    return matchSearch && matchCourse;
  });

  return (
    <div className="space-y-8 font-sans text-left" dir="ltr">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Students & CRM Panel</h1>
          <p className="text-zinc-400 text-sm mt-1">Track student progress, completion ratios, and enforce session security policies to prevent account sharing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddingStudent(true)}
            className="h-11 px-5 rounded-xl bg-[#D6004B] hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Student</span>
          </button>
          <div className="w-12 h-12 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0a0a0f] border border-white/5 p-4 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:flex-1 group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search students by name or email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-xs font-sans focus:outline-none focus:border-rose-500/50 transition-all text-white text-left"
          />
        </div>

        {/* Filter Course */}
        <select
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
          className="w-full md:w-64 bg-[#0f0f15] border border-white/5 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300"
        >
          <option value="all">All Courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <button 
          onClick={loadData}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:text-rose-500 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center text-zinc-400"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Students Data Grid/Table */}
      <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[11px] font-black text-zinc-400 uppercase tracking-widest font-sans">
                <th className="p-5 text-left">Student Name</th>
                <th className="p-5 text-left">Enrolled Path</th>
                <th className="p-5 text-center">Completion Progress</th>
                <th className="p-5 text-left">Learning Hours & Activity</th>
                <th className="p-5 text-left">Account Status</th>
                <th className="p-5 text-center">Manage</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-white/5">
                    <td colSpan={6} className="p-8">
                      <div className="h-6 bg-white/5 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-zinc-500 font-bold text-xs">
                    <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    No registered students match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr 
                    key={row.id} 
                    className="border-b border-white/5 hover:bg-white/[0.01] transition-all font-sans text-xs"
                  >
                    {/* Student Identity */}
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{row.user_name || "JoeSchool Student"}</span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{row.user_email}</span>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="p-5 font-medium text-zinc-300">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                        <span className="max-w-xs line-clamp-1">{row.courseTitle}</span>
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="p-5">
                      <div className="flex flex-col items-center justify-center space-y-1.5 max-w-xs mx-auto">
                        <div className="flex items-center justify-between w-full text-[10px] font-bold">
                          <span className="text-zinc-500">
                            ({row.completedCount} of {row.totalCount} lessons)
                          </span>
                          <span className={cn(
                            "font-mono font-black",
                            row.isFinished ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {row.percent}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              row.isFinished 
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                                : "bg-gradient-to-r from-rose-500 to-orange-400"
                            )}
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Date & Watch Time */}
                    <td className="p-5 text-zinc-400 font-mono text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-sans">{(row.totalWatchSeconds ? row.totalWatchSeconds / 3600 : 0).toFixed(1)} hrs</span>
                        <span className="text-[9px] text-zinc-500">Active: {row.lastActivityDate || "-"}</span>
                        <span className="text-[9px] text-zinc-600">Enrolled: {new Date(row.enrolled_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                      </div>
                    </td>

                    {/* Account status */}
                    <td className="p-5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1",
                        row.status === "suspended"
                          ? "bg-red-950/40 text-red-400 border-red-900/20"
                          : row.isFinished
                          ? "bg-emerald-950 text-emerald-400 border-emerald-900/30"
                          : "bg-rose-950/40 text-rose-400 border-rose-900/20"
                      )}>
                        {row.status === "suspended" ? (
                          <>
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            <span>Suspended</span>
                          </>
                        ) : row.isFinished ? (
                          <>
                            <Award className="w-3 h-3 text-emerald-400" />
                            <span>Completed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-rose-400" />
                            <span>Active</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Quick Action controls */}
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleOpenActionModal(row)}
                        className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-400 font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CONTROL & EDIT MODAL ──────────────────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-left">
            
            {/* Close */}
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <div>
              <h3 className="font-bold text-white text-base">Student CRM & Enrollment Control</h3>
              <p className="text-zinc-500 text-xs mt-1">Update profile information, terminate active sessions, or configure security suspension.</p>
            </div>

            {/* Tab Headers inside modal */}
            <div className="flex border-b border-white/5 pb-1 gap-2">
              <button 
                onClick={() => setModalTab("profile")}
                className={cn(
                  "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  modalTab === "profile" ? "border-rose-500 text-rose-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Personal Info
              </button>
              <button 
                onClick={() => setModalTab("progress")}
                className={cn(
                  "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  modalTab === "progress" ? "border-rose-500 text-rose-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Clock className="w-4 h-4" />
                <span>Learning Progress</span>
              </button>
              <button 
                onClick={() => setModalTab("devices")}
                className={cn(
                  "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  modalTab === "devices" 
                    ? "border-[#D6004B] text-white" 
                    : "border-transparent text-zinc-500 hover:text-white"
                )}
              >
                <span>Active Devices</span>
                {activeSessions.length > 0 && (
                  <span className="bg-rose-500/20 text-[#D6004B] text-[9px] px-1.5 rounded-full font-bold">
                    {activeSessions.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setModalTab("security")}
                className={cn(
                  "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  modalTab === "security" 
                    ? "border-[#D6004B] text-white" 
                    : "border-transparent text-zinc-500 hover:text-white"
                )}
              >
                <span>Account Security</span>
              </button>
            </div>

            {/* Modal Body Tabs */}
            
            {/* TAB 1: Profile Details */}
            {modalTab === "profile" && (
              <form onSubmit={handleUpdateDetails} className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-4 text-xs font-bold text-zinc-400">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Enrolled Course:</span>
                    <span className="text-white mt-1 block truncate">{selectedStudent.courseTitle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Completion Progress:</span>
                    <span className="text-rose-400 mt-1 block font-mono">{selectedStudent.percent}% ({selectedStudent.completedCount} of {selectedStudent.totalCount} lessons)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">Student Full Name</label>
                  <input 
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">Email Address</label>
                  <input 
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-mono text-zinc-300 w-full"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={handleDisenroll}
                    className="h-10 px-4 bg-red-950/20 hover:bg-red-950 hover:text-red-400 hover:border-red-900/30 border border-red-900/20 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Revoke Enrollment & Delete Progress</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 1.5: Progress Stats */}
            {modalTab === "progress" && selectedStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                    <Clock className="w-6 h-6 text-rose-500 mb-2" />
                    <span className="text-xs text-zinc-400 mb-1 font-bold">Total Learning Time</span>
                    <span className="text-xl text-white font-black font-mono">
                      {(selectedStudent.totalWatchSeconds ? selectedStudent.totalWatchSeconds / 3600 : 0).toFixed(1)} <span className="text-sm font-sans">hrs</span>
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                    <Sparkles className="w-6 h-6 text-emerald-500 mb-2" />
                    <span className="text-xs text-zinc-400 mb-1 font-bold">Current Learning Streak</span>
                    <span className="text-xl text-white font-black font-mono">
                      {selectedStudent.streak || 0} <span className="text-sm font-sans">days</span>
                    </span>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl mt-4">
                  <h4 className="text-white text-xs font-bold mb-3">Enrolled Course Details: {selectedStudent.courseTitle}</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400">Completed Lessons</span>
                    <span className="text-xs text-white font-bold">{selectedStudent.completedCount} of {selectedStudent.totalCount}</span>
                  </div>
                  <div className="w-full bg-black h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-rose-500 to-orange-400"
                      style={{ width: `${selectedStudent.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Active Device Sessions */}
            {modalTab === "devices" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold p-3 bg-rose-600/5 border border-rose-500/10 rounded-xl leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    Maximum allowed limit is 3 concurrent devices. Once you terminate any active device session, the student will be instantly logged out from that browser upon their next action.
                  </span>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {loadingSessions ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-bold">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                      <span>Loading active devices connected to the account...</span>
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs font-bold">
                      <Laptop className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                      <span>No active device sessions registered in the database.</span>
                    </div>
                  ) : (
                    activeSessions.map((session) => (
                      <div 
                        key={session.id}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-4 text-xs font-bold text-zinc-300"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white text-[13px]">{session.browser.split(" ")[0] || "Browser Session"}</span>
                              <span className="text-[9px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{session.device_id.substring(0, 10)}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                              <span className="flex items-center gap-0.5">
                                <Globe className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="font-mono">{session.ip_address}</span>
                              </span>
                              <span>•</span>
                              <span>Country: {session.country || "Unknown"}</span>
                              <span>•</span>
                              <span>Activity: {new Date(session.last_activity).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleTerminateSession(session.id)}
                          className="h-8 px-3 rounded-lg bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-transparent text-[#D6004B] hover:text-white transition-all text-[10px] font-bold cursor-pointer"
                        >
                          Terminate Session
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Security & Suspension */}
            {modalTab === "security" && (
              <form onSubmit={handleUpdateSecurity} className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold p-3 bg-zinc-950/60 border border-white/5 rounded-xl leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-[#D6004B] shrink-0" />
                  <span>
                    When a student is suspended, they will be completely blocked from streaming videos or accessing educational materials, while remaining enrolled in the course.
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-400 font-bold">Student Account Access Level</span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSuspended(false)}
                      className={cn(
                        "flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                        !isSuspended 
                          ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400" 
                          : "bg-white/5 border-transparent text-zinc-500 hover:text-white"
                      )}
                    >
                      <ShieldCheck className="w-4.5 h-4.5" />
                      <span>Active (Allow Learning & Streaming)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSuspended(true)}
                      className={cn(
                        "flex-1 h-11 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                        isSuspended 
                          ? "bg-red-950/40 border-red-500/30 text-red-400" 
                          : "bg-white/5 border-transparent text-zinc-500 hover:text-white"
                      )}
                    >
                      <Ban className="w-4.5 h-4.5" />
                      <span>Suspended (Block video streaming)</span>
                    </button>
                  </div>
                </div>

                {isSuspended && (
                  <div className="flex flex-col gap-1.5 animate-fadeIn">
                    <label className="text-xs text-zinc-400 font-bold">Suspension Reason (Displayed to the student on blockscreen)</label>
                    <textarea 
                      required
                      placeholder="Write the suspension reason here (e.g. Account sharing detected on multiple concurrent devices)..."
                      value={suspensionReason}
                      onChange={e => setSuspensionReason(e.target.value)}
                      className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300 w-full h-20 resize-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end border-t border-white/5 pt-4">
                  <button
                    type="submit"
                    disabled={savingSecurity}
                    className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingSecurity && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Security Settings</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ── REGISTER NEW STUDENT MODAL ────────────────────────────────────────── */}
      {isAddingStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-left">
            
            {/* Close */}
            <button 
              onClick={() => setIsAddingStudent(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <div>
              <h3 className="font-bold text-white text-base">Enroll New Student</h3>
              <p className="text-zinc-500 text-xs mt-1">Enter the email, password, and name to instantly register a student account and enroll them in the selected course for free.</p>
            </div>

            <form onSubmit={handleCreateStudentSubmit} className="space-y-4 font-sans">
              
              {/* Names row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">First Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Ahmed"
                    value={newStudent.firstName}
                    onChange={e => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300 w-full"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">Last Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Ali"
                    value={newStudent.lastName}
                    onChange={e => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300 w-full"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-bold">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={newStudent.email}
                  onChange={e => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-mono text-zinc-300 w-full"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-bold">Password (min 6 characters)</label>
                <input 
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newStudent.password}
                  onChange={e => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-mono text-zinc-300 w-full"
                />
              </div>

              {/* Course selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-bold">Assign Course Path</label>
                <select
                  required
                  value={newStudent.courseId}
                  onChange={e => setNewStudent(prev => ({ ...prev, courseId: e.target.value }))}
                  className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300 w-full"
                >
                  <option value="" disabled>Select Course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
                  className="h-11 px-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingLoading}
                  className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-600/30"
                >
                  {addingLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enroll Student</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
