"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Search, BookOpen, Clock, Award, CheckCircle2, 
  ShieldAlert, Edit, Trash2, X, ShieldCheck, Loader2, RefreshCw, 
  Laptop, Globe, Key, AlertCircle, Ban, ArrowLeftRight, Plus, Sparkles,
  CreditCard, Shield, Phone, ChevronRight, CheckSquare, Square, RefreshCcw, Check, Copy,
  Eye, EyeOff
} from "lucide-react";
import { 
  getEnrollmentsForAdmin, 
  getCoursesList, 
  getCourseProgressPercent, 
  removeStudentFromCourse, 
  type LmsEnrollment, 
  type LmsCourse 
} from "@/lib/coursesDb";
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
  const [modalTab, setModalTab] = useState<"profile" | "security" | "progress" | "credentials" | "commerce" | "devices" | "activity" | "audit">("profile");
  
  // Student CRM data states
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [crmStudentData, setCrmStudentData] = useState<any>(null);
  
  // Inputs
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [maxDevices, setMaxDevices] = useState(3);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Password / reset links
  const [tempPassword, setTempPassword] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [customPasswordInput, setCustomPasswordInput] = useState("");
  const [isSettingCustomPassword, setIsSettingCustomPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Device sessions
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // CRM Lists
  const [allCoursesList, setAllCoursesList] = useState<any[]>([]);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);

  // Manual grant states
  const [selectedProductId, setSelectedProductId] = useState("");
  const [manualGrantAmount, setManualGrantAmount] = useState("0");

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

  // Helper: Mask IP for privacy
  const maskIpAddress = (ip: string | null) => {
    if (!ip || ip === "Unknown") return "xxx.xxx.xxx.xxx";
    if (ip.includes(":")) {
      const segments = ip.split(":");
      return segments.length > 2 
        ? `${segments[0]}:${segments[1]}:xxxx:xxxx:xxxx:xxxx` 
        : "xxxx:xxxx::xxxx";
    }
    const parts = ip.split(".");
    return parts.length === 4 
      ? `${parts[0]}.${parts[1]}.xxx.xxx` 
      : "xxx.xxx.xxx.xxx";
  };

  // Open Manage Modal & fetch complete CRM dashboard datasets
  const handleOpenActionModal = async (student: StudentRow) => {
    setSelectedStudent(student);
    setModalTab("profile");
    setEditName(student.user_name || "");
    setEditEmail(student.user_email || "");
    setEditPhone("");
    setMaxDevices(3);
    setIsSuspended(false);
    setSuspensionReason("");
    setTempPassword("");
    setResetLink("");
    setCrmStudentData(null);
    setSelectedProductId("");
    setManualGrantAmount("0");
    
    setLoadingCrm(true);
    try {
      const res = await fetch(`/api/admin/students/${student.user_id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCrmStudentData(data.student);
          setAllCoursesList(data.allCourses || []);
          setAllProductsList(data.allProducts || []);
          
          setEditName(data.student.user_metadata?.full_name || data.student.user_metadata?.name || student.user_name || "");
          setEditEmail(data.student.email || student.user_email || "");
          setEditPhone(data.student.phone || "");
          setMaxDevices(data.student.status?.max_devices || 3);
          setIsSuspended(data.student.status?.is_suspended || false);
          setSuspensionReason(data.student.status?.suspension_reason || "");
          setActiveSessions(data.student.activeSessions || []);
        } else {
          toast.error(data.error || "Failed to load CRM data");
        }
      }
    } catch (err) {
      toast.error("Network error while pulling CRM details");
    } finally {
      setLoadingCrm(false);
      // Ensure there's a fallback dataset to prevent crash
      setCrmStudentData((prev: any) => prev || {
        id: student.user_id,
        email: student.user_email,
        phone: "",
        enrollments: [{ course_id: student.course_id }],
        certificates: [],
        orders: [],
        completedLessons: [],
        courseProgress: [],
        activeSessions: []
      });
    }
  };

  const refreshCrmData = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/students/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCrmStudentData(data.student);
          setAllCoursesList(data.allCourses || []);
          setAllProductsList(data.allProducts || []);
          setActiveSessions(data.student.activeSessions || []);
        }
      }
    } catch (err) {}
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          max_devices: maxDevices,
          is_suspended: isSuspended,
          suspension_reason: suspensionReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Student profile updated successfully! ✨");
        await refreshCrmData(selectedStudent.user_id);
        await loadData();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      toast.error("An error occurred while saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Secure Password Actions (Reset Link & Temp Password Only)
  const handleSendResetLink = async () => {
    if (!selectedStudent) return;
    toast.loading("Generating recovery link...", { id: "reset-pwd" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail,
          action: "send_reset"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetLink(data.resetLink || "");
        toast.success("Reset link sent to student email & loaded locally! ✉️", { id: "reset-pwd" });
      } else {
        toast.error(data.error || "Failed to generate link", { id: "reset-pwd" });
      }
    } catch (err) {
      toast.error("Server communication error", { id: "reset-pwd" });
    }
  };

  const handleGenerateTempPassword = async () => {
    if (!selectedStudent) return;
    toast.loading("Generating temp password...", { id: "temp-pwd" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "temp_password"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempPassword(data.tempPassword || "");
        toast.success("Temp password generated & user sessions invalidated! 🔑", { id: "temp-pwd" });
        await refreshCrmData(selectedStudent.user_id);
      } else {
        toast.error(data.error || "Failed to generate temporary password", { id: "temp-pwd" });
      }
    } catch (err) {
      toast.error("Server communication error", { id: "temp-pwd" });
    }
  };

  const handleSetCustomPassword = async () => {
    if (!selectedStudent) return;
    if (!customPasswordInput || customPasswordInput.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsSettingCustomPassword(true);
    toast.loading("Updating password...", { id: "custom-pwd" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail,
          action: "set_custom_password",
          customPassword: customPasswordInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Password updated successfully! 🔑", { id: "custom-pwd" });
        setCustomPasswordInput("");
        await refreshCrmData(selectedStudent.user_id);
      } else {
        toast.error(data.error || "Failed to update password", { id: "custom-pwd" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "custom-pwd" });
    } finally {
      setIsSettingCustomPassword(false);
    }
  };

  // Terminate device session
  const handleTerminateSession = async (sessionId: string) => {
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/students/${selectedStudent.user_id}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        toast.success("Session severed and logged out instantly! 🔌");
        await refreshCrmData(selectedStudent.user_id);
      } else {
        // Direct update fallback if sessions route is admin gated
        const { supabaseClient } = await import("@/lib/supabaseClient");
        await supabaseClient.from("active_sessions").update({ is_active: false }).eq("id", sessionId);
        toast.success("Session severed successfully! 🔌");
        await refreshCrmData(selectedStudent.user_id);
      }
    } catch (err) {
      toast.error("Failed to terminate the selected session");
    }
  };

  // Enroll, progress, and certificate control callbacks
  const handleEnrollInCourse = async (courseId: string) => {
    if (!selectedStudent) return;
    toast.loading("Enrolling student...", { id: "enroll-act" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enroll",
          courseId,
          studentName: editName,
          studentEmail: editEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Student successfully enrolled in course! 🎓", { id: "enroll-act" });
        await refreshCrmData(selectedStudent.user_id);
        await loadData();
      } else {
        toast.error(data.error || "Failed to enroll student", { id: "enroll-act" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "enroll-act" });
    }
  };

  const handleDisenroll = async (courseId: string) => {
    if (!selectedStudent) return;
    if (!confirm("Are you sure you want to disenroll this student and permanently delete their learning progress? This action is irreversible.")) return;
    toast.loading("Removing student enrollment...", { id: "disenroll-act" });

    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disenroll",
          courseId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Student disenrolled and their progress successfully deleted!", { id: "disenroll-act" });
        await refreshCrmData(selectedStudent.user_id);
        await loadData();
      } else {
        toast.error(data.error || "Failed to disenroll student", { id: "disenroll-act" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "disenroll-act" });
    }
  };

  const handleToggleLesson = async (courseId: string, lessonId: string, completed: boolean) => {
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_lesson",
          courseId,
          lessonId,
          completed
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(completed ? "Lesson manually marked completed! Checkpoint saved." : "Lesson marked incomplete!");
        await refreshCrmData(selectedStudent.user_id);
        await loadData();
      }
    } catch (err) {
      toast.error("Failed to update lesson checkpoint");
    }
  };

  const handleResetCourseProgress = async (courseId: string) => {
    if (!selectedStudent) return;
    if (!confirm("Are you sure you want to completely reset all watched seconds, checkpoints, and completion data for this course?")) return;
    
    toast.loading("Resetting progress...", { id: "reset-progress-act" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_progress",
          courseId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Progress cleared successfully!", { id: "reset-progress-act" });
        await refreshCrmData(selectedStudent.user_id);
        await loadData();
      }
    } catch (err) {
      toast.error("Failed to reset progress", { id: "reset-progress-act" });
    }
  };

  const handleToggleCertificate = async (courseId: string, courseTitle: string, certificateBgUrl: string, isIssued: boolean) => {
    if (!selectedStudent) return;
    toast.loading(isIssued ? "Revoking certificate..." : "Issuing certificate...", { id: "cert-act" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isIssued ? "revoke_certificate" : "grant_certificate",
          courseId,
          courseTitle,
          studentName: editName,
          certificateBgUrl
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(isIssued ? "Certificate revoked!" : "Certificate successfully issued! 🏆", { id: "cert-act" });
        await refreshCrmData(selectedStudent.user_id);
      } else {
        toast.error(data.error || "Failed to update certificate", { id: "cert-act" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "cert-act" });
    }
  };

  // Commerce manual grant
  const handleGrantProductAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    const matched = allProductsList.find(p => p.id === selectedProductId);
    if (!matched) return;

    toast.loading("Granting manual product rights...", { id: "grant-prod-act" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_product",
          productId: selectedProductId,
          productTitle: matched.title,
          studentEmail: editEmail,
          studentName: editName,
          amount: parseFloat(manualGrantAmount) || 0
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Digital product granted successfully! 📦", { id: "grant-prod-act" });
        setSelectedProductId("");
        setManualGrantAmount("0");
        await refreshCrmData(selectedStudent.user_id);
      } else {
        toast.error(data.error || "Failed to grant access", { id: "grant-prod-act" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "grant-prod-act" });
    }
  };

  const handleRevokeProductAccess = async (productId: string) => {
    if (!selectedStudent) return;
    if (!confirm("Are you sure you want to revoke this student's access to the digital product?")) return;
    
    toast.loading("Revoking access...", { id: "revoke-prod-act" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_product",
          productId,
          studentEmail: editEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Access revoked successfully!", { id: "revoke-prod-act" });
        await refreshCrmData(selectedStudent.user_id);
      } else {
        toast.error(data.error || "Failed to revoke access", { id: "revoke-prod-act" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "revoke-prod-act" });
    }
  };

  const handleRevokeAllAccess = async () => {
    if (!selectedStudent) return;
    if (!confirm("⚠️ WARNING: Are you sure you want to completely revoke all course enrollments and product accesses for this student? This will clear all course access immediately.")) return;

    toast.loading("Revoking all access...", { id: "revoke-all-act" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_all_access",
          studentEmail: editEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("All access revoked successfully!", { id: "revoke-all-act" });
        await refreshCrmData(selectedStudent.user_id);
      } else {
        toast.error(data.error || "Failed to revoke access", { id: "revoke-all-act" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "revoke-all-act" });
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    if (!confirm("🚨 CRITICAL WARNING: Are you sure you want to delete this student account completely from the platform? This will delete their login credentials, profile, orders, progress, and certificates. This action is irreversible!")) return;

    toast.loading("Deleting student account...", { id: "delete-student-act" });
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.user_id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Student account deleted successfully!", { id: "delete-student-act" });
        setSelectedStudent(null); // Close modal
        loadData(); // Refresh list
      } else {
        toast.error(data.error || "Failed to delete student account", { id: "delete-student-act" });
      }
    } catch (err) {
      toast.error("Error communicating with server", { id: "delete-student-act" });
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
      
      setNewStudent({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        courseId: courses[0]?.id || ""
      });

      await loadData();

    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setAddingLoading(false);
    }
  };

  const handleGeneratePasswordForNewStudent = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generatedPassword = `Joeschool#${randomPart}`;
    setNewStudent(prev => ({ ...prev, password: generatedPassword }));
    toast.success("Temporary password generated! 🔑", { id: "gen-pwd-new" });
  };

  const filteredRows = rows.filter(r => {
    const matchSearch = 
      (r.user_name?.toLowerCase().includes(search.toLowerCase())) || 
      (r.user_email?.toLowerCase().includes(search.toLowerCase()));
    const matchCourse = selectedCourseId === "all" || r.course_id === selectedCourseId;
    return matchSearch && matchCourse;
  });

  const studentPassword = crmStudentData?.user_metadata?.clear_password || crmStudentData?.orders?.find((o: any) => o.checkout_password)?.checkout_password || "";

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
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenActionModal(row)}
                          className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-400 font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStudent(row);
                            setTimeout(() => handleDisenroll(row.course_id), 100);
                          }}
                          className="h-8 px-3 rounded-lg bg-red-950/10 border border-red-500/20 hover:bg-red-950/40 hover:text-red-400 text-red-500 font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          title="إلغاء التسجيل في هذا الكورس"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      </div>
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
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
            
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
              <p className="text-zinc-500 text-xs mt-1">Manage profile properties, progress checkpoints, credentials, commerce orders, and session security parameters.</p>
            </div>

            {/* Tab Headers inside modal */}
            <div className="flex flex-wrap border-b border-white/5 pb-1 gap-1">
              {[
                { id: "profile", name: "Account Details" },
                { id: "activity", name: "Recent Activity" },
                { id: "security", name: "Security & Passwords" },
                { id: "progress", name: "Learning Progress" },
                { id: "credentials", name: "Certificates" },
                { id: "commerce", name: "Products & Orders" },
                { id: "devices", name: "Connected Devices" },
                { id: "audit", name: "Audit Trail" }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setModalTab(t.id as any)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer",
                    modalTab === t.id ? "border-rose-500 text-rose-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Modal Body Tabs */}
            {loadingCrm ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                <span>Loading complete CRM student dashboard...</span>
              </div>
            ) : !crmStudentData ? (
              <div className="py-24 text-center text-zinc-500 text-xs font-bold">
                Failed to load profile.
              </div>
            ) : (
              <>
                {/* TAB 1: Profile Details */}
                {modalTab === "profile" && (
                  <>
                    <form onSubmit={handleUpdateDetails} className="space-y-4 font-sans">
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="flex flex-col gap-1.5 bg-rose-600/5 border border-rose-500/10 p-4 rounded-xl">
                      <label className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" />
                        <span>Student Account Password</span>
                      </label>
                      <div className="flex items-center justify-between gap-4 mt-1">
                        {studentPassword ? (
                          <>
                            <span className="font-mono text-sm font-bold text-zinc-300 select-all tracking-wider">
                              {showStudentPassword ? studentPassword : "••••••••"}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowStudentPassword(!showStudentPassword)}
                                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                title={showStudentPassword ? "Hide Password" : "Show Password"}
                              >
                                {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(studentPassword);
                                  toast.success("Password copied successfully!");
                                }}
                                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy Password"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className="text-zinc-500 text-xs italic">
                            No stored password found (student was created or reset without cleartext password recording).
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end border-t border-white/5 pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Account Details</span>
                      </button>
                    </div>
                  </form>

                  {/* Danger Zone: Access & Account Controls */}
                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/10 space-y-3 mt-4 text-left" dir="ltr">
                    <h4 className="text-red-400 text-xs font-bold flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>Danger Zone: Access & Account Controls</span>
                    </h4>
                    <p className="text-zinc-500 text-[11px] leading-relaxed">
                      These actions are destructive and cannot be undone. Completely revoke all access or delete the student from the entire platform.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleRevokeAllAccess}
                        className="h-10 px-4 bg-red-950/40 border border-red-500/20 hover:bg-red-950 text-red-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Revoke Access to All Courses</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDeleteStudent}
                        className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Student from Platform</span>
                      </button>
                    </div>
                  </div>
                  </>
                )}

                {/* TAB: Recent Activity */}
                {modalTab === "activity" && (
                  <div className="space-y-4 font-sans">
                    <div className="text-white text-sm font-bold border-b border-white/5 pb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-500" />
                      <span>Recent Activity Timeline</span>
                    </div>

                    <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6 py-2">
                      {/* Last Sign In */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-white/10 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="text-zinc-400 text-xs font-bold">Last Sign In</div>
                        <div className="text-white text-xs mt-1">
                          {crmStudentData.timeline?.lastSignIn ? (
                            new Date(crmStudentData.timeline.lastSignIn).toLocaleString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          ) : (
                            <span className="text-zinc-600">No sign in history recorded.</span>
                          )}
                        </div>
                      </div>

                      {/* Last Video Watched */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-white/10 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        </div>
                        <div className="text-zinc-400 text-xs font-bold">Last Video Watched</div>
                        {crmStudentData.timeline?.lastWatchedVideo ? (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mt-2 space-y-1.5">
                            <div className="text-white text-xs font-bold flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                              <span>{crmStudentData.timeline.lastWatchedVideo.title}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-3">
                              <span>Watched Time: {Math.round(crmStudentData.timeline.lastWatchedVideo.watched_seconds)} seconds</span>
                              <span>•</span>
                              <span>Status: {crmStudentData.timeline.lastWatchedVideo.completed ? "Completed" : "In Progress"}</span>
                              <span>•</span>
                              <span>Date: {new Date(crmStudentData.timeline.lastWatchedVideo.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-white text-xs mt-1 text-zinc-600">No watching activity recorded yet.</div>
                        )}
                      </div>

                      {/* Last Purchase */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-white/10 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        </div>
                        <div className="text-zinc-400 text-xs font-bold">Last Purchase</div>
                        {crmStudentData.timeline?.lastPurchase ? (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mt-2 space-y-1.5">
                            <div className="text-white text-xs font-bold flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                              <span>{crmStudentData.timeline.lastPurchase.product_title}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-3">
                              <span className="font-mono text-rose-400">{crmStudentData.timeline.lastPurchase.amount} {crmStudentData.timeline.lastPurchase.currency}</span>
                              <span>•</span>
                              <span>Method: {crmStudentData.timeline.lastPurchase.payment_method}</span>
                              <span>•</span>
                              <span>Date: {new Date(crmStudentData.timeline.lastPurchase.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-white text-xs mt-1 text-zinc-600">No purchases found.</div>
                        )}
                      </div>

                      {/* Last Device Used */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-white/10 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        </div>
                        <div className="text-zinc-400 text-xs font-bold">Last Device & IP Used</div>
                        {crmStudentData.timeline?.lastSession ? (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mt-2 space-y-1">
                            <div className="text-white text-xs flex items-center gap-1.5">
                              <Laptop className="w-3.5 h-3.5 text-blue-400" />
                              <span>{crmStudentData.timeline.lastSession.device}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-3">
                              <span className="font-mono flex items-center gap-1">
                                <Globe className="w-3 h-3 text-zinc-600" />
                                {crmStudentData.timeline.lastSession.masked_ip}
                              </span>
                              <span>•</span>
                              <span>Last active: {new Date(crmStudentData.timeline.lastSession.last_active).toLocaleString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-white text-xs mt-1 text-zinc-600">No device session logged.</div>
                        )}
                      </div>

                      {/* Last Coupon Used */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-white/10 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        </div>
                        <div className="text-zinc-400 text-xs font-bold">Last Coupon Used</div>
                        {crmStudentData.timeline?.lastCouponUsed ? (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mt-2 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <span className="bg-purple-950/40 border border-purple-500/20 text-purple-400 px-2 py-1 rounded font-mono font-black text-xs">
                                {crmStudentData.timeline.lastCouponUsed.code}
                              </span>
                              <span className="text-[10px] text-zinc-500 ml-3">
                                Applied on: {new Date(crmStudentData.timeline.lastCouponUsed.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-white text-xs mt-1 text-zinc-600">No coupons applied.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Security & Password Actions */}
                {modalTab === "security" && (
                  <div className="space-y-6">
                    {/* Reset Password Triggers */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                      <h4 className="text-white text-xs font-bold flex items-center gap-2">
                        <Key className="w-4 h-4 text-rose-500" />
                        <span>Manage Student Passwords</span>
                      </h4>
                      <p className="text-zinc-500 text-[11px] leading-relaxed">
                        To maintain compliance and maximum security, we do not store raw, editable password fields. Select one of the actions below to trigger password recovery.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSendResetLink}
                          className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        >
                          Send Reset Password Link
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateTempPassword}
                          className="flex-1 h-11 rounded-xl bg-[#D6004B] hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        >
                          Generate Temporary Password
                        </button>
                      </div>

                      {/* Display generated reset link */}
                      {resetLink && (
                        <div className="p-3 bg-zinc-950 border border-white/5 rounded-lg flex items-center justify-between gap-3 text-xs mt-3 animate-fadeIn">
                          <div className="overflow-hidden">
                            <span className="text-[10px] text-zinc-500 block">Generated Recovery URL:</span>
                            <span className="text-white mt-1 font-mono truncate block max-w-lg">{resetLink}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(resetLink);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }}
                            className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg transition-all shrink-0 cursor-pointer"
                            title="Copy link"
                          >
                            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* Display generated temp password */}
                      {tempPassword && (
                        <div className="p-3 bg-zinc-950 border border-white/5 rounded-lg flex items-center justify-between gap-3 text-xs mt-3 animate-fadeIn">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Generated Temporary Password:</span>
                            <span className="text-rose-400 mt-1 font-mono font-black text-sm block">{tempPassword}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tempPassword);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }}
                            className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg transition-all shrink-0 cursor-pointer"
                            title="Copy password"
                          >
                            {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Set Custom Password */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                      <h4 className="text-white text-xs font-bold flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-400" />
                        <span>Set Custom Password</span>
                      </h4>
                      <p className="text-zinc-500 text-[11px] leading-relaxed">
                        You can change the student's password and set a custom one directly from here (minimum 6 characters).
                      </p>
                      <div className="flex gap-2 max-w-md">
                        <input
                          type="text"
                          placeholder="Enter new password..."
                          value={customPasswordInput}
                          onChange={(e) => setCustomPasswordInput(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-3 h-10 text-xs text-white placeholder-zinc-600 outline-none focus:border-rose-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleSetCustomPassword}
                          disabled={isSettingCustomPassword}
                          className="px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isSettingCustomPassword ? "Saving..." : "Update Password"}
                        </button>
                      </div>
                    </div>

                    {/* Suspension details */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                      <h4 className="text-white text-xs font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#D6004B]" />
                        <span>Account Access Level</span>
                      </h4>
                      <p className="text-zinc-500 text-[11px] leading-relaxed">
                        Suspending a student blocks them from logging in, viewing videos, or streaming education files.
                      </p>
                      
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
                          <ShieldCheck className="w-4 h-4" />
                          <span>Active (Allow Learning)</span>
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
                          <Ban className="w-4 h-4" />
                          <span>Suspended (Block video streaming)</span>
                        </button>
                      </div>

                      {isSuspended && (
                        <div className="flex flex-col gap-1.5 animate-fadeIn">
                          <label className="text-xs text-zinc-400 font-bold">Suspension Reason</label>
                          <textarea 
                            required
                            placeholder="Write the reason here (e.g. Account sharing detected on multiple concurrent devices)..."
                            value={suspensionReason}
                            onChange={e => setSuspensionReason(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300 w-full h-20 resize-none text-left"
                          />
                        </div>
                      )}

                      <div className="flex justify-end border-t border-white/5 pt-4">
                        <button
                          type="button"
                          onClick={handleUpdateDetails}
                          className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          Save Access Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Learning Progress Checklist */}
                {modalTab === "progress" && (
                  <div className="space-y-6">
                    
                    {/* List of enrolled courses progress */}
                    <div className="space-y-4">
                      {crmStudentData.enrollments.map((en: any) => {
                        const matchedCourse = allCoursesList.find(c => c.id === en.course_id);
                        if (!matchedCourse) return null;
                        
                        // Compute course stats
                        const totalLessonsCount = matchedCourse.modules?.flatMap((m: any) => m.lessons || []).length || 0;
                        const userCompletedCount = matchedCourse.modules?.flatMap((m: any) => m.lessons || [])
                          .filter((l: any) => crmStudentData.completedLessons.includes(l.id)).length || 0;
                        
                        const completedPercent = totalLessonsCount > 0 
                          ? Math.round((userCompletedCount / totalLessonsCount) * 100) 
                          : 0;

                        return (
                          <div 
                            key={en.id} 
                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-rose-500" />
                                <span className="text-white text-sm font-bold">{matchedCourse.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResetCourseProgress(en.course_id)}
                                  className="h-8 px-3 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
                                >
                                  Reset Progress
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDisenroll(en.course_id)}
                                  className="h-8 px-3 rounded-lg border border-red-500/20 bg-red-950/10 hover:bg-red-950 hover:text-red-400 text-red-500 font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
                                >
                                  Disenroll Student
                                </button>
                              </div>
                            </div>

                            {/* Progress percentage bar */}
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-zinc-500">Course Completion Rate</span>
                              <span className="text-rose-400 font-mono">{completedPercent}% ({userCompletedCount} / {totalLessonsCount} lessons)</span>
                            </div>
                            <div className="w-full bg-black h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-rose-500 to-orange-400"
                                style={{ width: `${completedPercent}%` }}
                              />
                            </div>

                            {/* Modules checklist toggle */}
                            <div className="pt-2 space-y-3">
                              <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-black block">MANUAL LESSON CHECKPOINTS</span>
                              
                              {matchedCourse.modules?.map((mod: any) => (
                                <div key={mod.id} className="space-y-1.5 pl-2 border-l border-white/5">
                                  <span className="text-[11px] text-zinc-300 font-bold block">{mod.title}</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2">
                                    {mod.lessons?.map((les: any) => {
                                      const isCompleted = crmStudentData.completedLessons.includes(les.id);
                                      return (
                                        <button
                                          key={les.id}
                                          type="button"
                                          onClick={() => handleToggleLesson(en.course_id, les.id, !isCompleted)}
                                          className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer",
                                            isCompleted
                                              ? "bg-rose-500/5 border-rose-500/20 text-white"
                                              : "bg-white/[0.01] border-white/5 text-zinc-400 hover:text-zinc-200"
                                          )}
                                        >
                                          {isCompleted ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                          ) : (
                                            <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                                          )}
                                          <span className="truncate">{les.title}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Enroll in courses toggle */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                      <h4 className="text-white text-xs font-bold">Enroll in Additional Courses</h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {allCoursesList
                          .filter(c => !crmStudentData.enrollments.some((en: any) => en.course_id === c.id))
                          .map((c) => (
                            <div 
                              key={c.id} 
                              className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs text-zinc-300"
                            >
                              <div className="flex items-center gap-2 font-bold text-white">
                                <BookOpen className="w-4 h-4 text-zinc-500" />
                                <span>{c.title}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleEnrollInCourse(c.id)}
                                className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
                              >
                                Enroll Student
                              </button>
                            </div>
                          ))}
                        
                        {allCoursesList.filter(c => !crmStudentData.enrollments.some((en: any) => en.course_id === c.id)).length === 0 && (
                          <span className="text-zinc-500 text-[11px] text-center block py-2">Student is already enrolled in all available courses.</span>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 4: Certificates Control */}
                {modalTab === "credentials" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-rose-600/5 border border-rose-500/10 text-zinc-400 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                      <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>
                        Certificates are usually automatically issued to students upon reaching 100% course watch progress. However, you can manually override, issue, or revoke/delete credentials here.
                      </span>
                    </div>

                    <div className="space-y-3">
                      {crmStudentData.enrollments.map((en: any) => {
                        const matchedCourse = allCoursesList.find(c => c.id === en.course_id);
                        if (!matchedCourse) return null;

                        const matchedCert = crmStudentData.certificates.find((c: any) => c.course_id === en.course_id);

                        return (
                          <div 
                            key={en.id} 
                            className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-white block">{matchedCourse.title}</span>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1 font-bold",
                                  matchedCert 
                                    ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" 
                                    : "bg-zinc-950 text-zinc-500 border-white/5"
                                )}>
                                  {matchedCert ? "Issued" : "Not Issued"}
                                </span>
                                {matchedCert && (
                                  <span className="text-[10px] text-zinc-500 font-mono">Code: {matchedCert.verification_id}</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleCertificate(
                                en.course_id, 
                                matchedCourse.title, 
                                matchedCourse.certificate_bg_url || "", 
                                !!matchedCert
                              )}
                              className={cn(
                                "h-9 px-4 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer",
                                matchedCert
                                  ? "bg-red-950/40 border border-red-500/20 text-red-500 hover:bg-red-950"
                                  : "bg-[#D6004B] hover:bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                              )}
                            >
                              {matchedCert ? "Revoke Certificate" : "Issue Certificate"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 5: Commerce Orders & Product Grants */}
                {modalTab === "commerce" && (
                  <div className="space-y-6">
                    {/* Grant Product Form */}
                    <form onSubmit={handleGrantProductAccess} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                      <h4 className="text-white text-xs font-bold">Grant Access to Digital Products & Future Items</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Select Product</label>
                          <select
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                            className="bg-[#0f0f15] border border-white/5 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-sans text-zinc-300 w-full"
                          >
                            <option value="">Choose product...</option>
                            {allProductsList.length > 0 && (
                              <optgroup label="Digital Products">
                                {allProductsList.map((p: any) => (
                                  <option key={p.id} value={p.id}>{p.title} ({p.price || 0} EGP)</option>
                                ))}
                              </optgroup>
                            )}
                            {allCoursesList.length > 0 && (
                              <optgroup label="Courses">
                                {allCoursesList.map((c: any) => (
                                  <option key={`course-${c.id}`} value={c.id}>{c.title} ({c.price || 0} EGP)</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Simulate Charge Amount (EGP)</label>
                          <input
                            type="number"
                            value={manualGrantAmount}
                            onChange={e => setManualGrantAmount(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-mono text-zinc-300 w-full"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2 border-t border-white/5">
                        <button
                          type="submit"
                          className="h-10 px-5 bg-[#D6004B] hover:bg-rose-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>Grant Product Rights</span>
                        </button>
                      </div>
                    </form>

                    {/* Order billing history ledger */}
                    <div className="space-y-3">
                      <h4 className="text-white text-xs font-bold">Student Spending & Billing Ledger</h4>
                      <div className="bg-zinc-950 border border-white/5 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                <th className="p-3 text-left">Purchased Item</th>
                                <th className="p-3 text-left">Order Date</th>
                                <th className="p-3 text-left">Method</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-center font-bold">Access</th>
                              </tr>
                            </thead>
                            <tbody>
                              {crmStudentData.orders.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-zinc-500 font-bold">
                                    No transaction logs found for this account.
                                  </td>
                                </tr>
                              ) : (
                                crmStudentData.orders.map((ord: any) => (
                                  <tr key={ord.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                    <td className="p-3 font-bold text-white">{ord.product_title || ord.product_id}</td>
                                    <td className="p-3 text-zinc-500 font-mono">{new Date(ord.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-zinc-400">{ord.payment_method || "Card"}</td>
                                    <td className="p-3 text-right font-mono font-bold text-rose-400">{ord.amount} {ord.currency || "EGP"}</td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRevokeProductAccess(ord.product_id)}
                                        className="h-6 px-2.5 bg-red-950/20 border border-red-500/10 rounded text-red-500 hover:bg-red-950 font-bold text-[9px] cursor-pointer"
                                        title="Revoke access rights"
                                      >
                                        Revoke Access
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: Devices Sessions Audit */}
                {modalTab === "devices" && (
                  <div className="space-y-4 font-sans">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold p-3 bg-rose-600/5 border border-rose-500/10 rounded-xl leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>
                        Student account sessions are audited. Server terminates logins if current devices exceed {maxDevices}. Revoking active browsers instantly severs active video streams.
                      </span>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                      {activeSessions.length === 0 ? (
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
                                  <span className="text-white text-[13px]">{session.browser?.split(" ")[0] || "Browser Session"}</span>
                                  <span className="text-[9px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{session.device_id?.substring(0, 10)}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                                  <span className="flex items-center gap-0.5">
                                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                                    <span className="font-mono">{maskIpAddress(session.ip_address)}</span>
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

                {/* TAB: Audit Trail */}
                {modalTab === "audit" && (
                  <div className="space-y-4 font-sans">
                    <div className="text-white text-sm font-bold border-b border-white/5 pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-rose-500" />
                        <span>Admin Action Logs</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">History of account updates</span>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                      {!crmStudentData.adminActionLogs || crmStudentData.adminActionLogs.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 text-xs font-bold">
                          No administrative changes logged for this student.
                        </div>
                      ) : (
                        crmStudentData.adminActionLogs.map((log: any) => (
                          <div 
                            key={log.id}
                            className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs font-bold space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-black bg-rose-950/40 border border-rose-500/20 text-rose-400">
                                {log.action_type}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-zinc-300 font-medium font-sans leading-relaxed">
                              {log.details}
                            </p>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 pt-1 border-t border-white/5">
                              <span>Admin:</span>
                              <span className="text-zinc-400 font-mono">{log.admin_email}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
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
              <p className="text-zinc-500 text-xs mt-1">Enter the email, password, and name to register a student and enroll them in the selected course.</p>
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
                <div className="flex gap-2">
                  <input 
                    type="text"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newStudent.password}
                    onChange={e => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-mono text-zinc-300 w-full"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePasswordForNewStudent}
                    className="h-11 px-4 bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                    title="Generate Temporary Password"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Generate</span>
                  </button>
                </div>
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
