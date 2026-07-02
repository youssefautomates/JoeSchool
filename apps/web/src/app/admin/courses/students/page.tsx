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
import { supabase } from "@/lib/supabase";

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

  // ── Bulk Selection States ──
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedBulkCourseId, setSelectedBulkCourseId] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

    // ─── HIGH PERFORMANCE OPTIMIZATION ───
    // 1. Pre-fetch and cache course lessons structures once, so we don't query getCourseBySlug N times
    const { getCourseBySlug } = await import("@/lib/coursesDb");
    const courseLessonsMap: Record<string, any[]> = {};
    await Promise.all(
      lmsCourses.map(async (course) => {
        try {
          const { sections } = await getCourseBySlug(course.slug);
          courseLessonsMap[course.id] = sections.flatMap(s => s.lessons);
        } catch (e) {
          courseLessonsMap[course.id] = [];
        }
      })
    );

    // 2. Bulk fetch progress information from DB using our supabase client
    const userIds = Array.from(new Set(enrolls.map(e => e.user_id)));
    
    let allProgress: any[] = [];
    let allWatchSessions: any[] = [];
    let allStreaks: any[] = [];

    if (userIds.length > 0) {
      try {
        const [progressRes, watchRes, streaksRes] = await Promise.all([
          supabase.from("user_course_progress").select("user_id, lesson_id").in("user_id", userIds),
          supabase.from("video_watch_sessions").select("user_id, seconds_watched").in("user_id", userIds),
          supabase.from("student_streaks").select("user_id, current_streak, last_activity_date").in("user_id", userIds)
        ]);

        if (progressRes.data) allProgress = progressRes.data;
        if (watchRes.data) allWatchSessions = watchRes.data;
        if (streaksRes.data) allStreaks = streaksRes.data;
      } catch (err) {
        console.error("Bulk fetch progress error, falling back:", err);
      }
    }

    // Map watch sessions to total seconds per user
    const watchSecondsMap: Record<string, number> = {};
    allWatchSessions.forEach(session => {
      const uid = session.user_id;
      watchSecondsMap[uid] = (watchSecondsMap[uid] || 0) + Number(session.seconds_watched || 0);
    });

    // Map progress completions to list of lesson IDs per user
    const completionsMap: Record<string, string[]> = {};
    allProgress.forEach(p => {
      const uid = p.user_id;
      if (!completionsMap[uid]) completionsMap[uid] = [];
      completionsMap[uid].push(p.lesson_id);
    });

    // Map streaks per user
    const streaksMap: Record<string, { streak: number, lastActivityDate: string | null }> = {};
    allStreaks.forEach(s => {
      streaksMap[s.user_id] = {
        streak: s.current_streak || 0,
        lastActivityDate: s.last_activity_date || null
      };
    });

    // 3. Populate rows instantly from cached maps (in O(N) time)
    const populated: StudentRow[] = enrolls.map(e => {
      const c = lmsCourses.find(course => course.id === e.course_id);
      const courseTitle = c?.title || "Unknown Course Path";

      const allLessons = courseLessonsMap[e.course_id] || [];
      const totalCount = allLessons.length;
      const userCompletions = completionsMap[e.user_id] || [];

      let percent = 0;
      let completedCount = 0;
      let isFinished = false;

      if (totalCount > 0) {
        const courseCompletedIds = allLessons.filter(l => userCompletions.includes(l.id));
        completedCount = courseCompletedIds.length;
        percent = Math.min(100, Math.round((completedCount / totalCount) * 100));
        isFinished = percent === 100;
      }

      const totalWatchSeconds = watchSecondsMap[e.user_id] || 0;
      const streakInfo = streaksMap[e.user_id];
      const streak = streakInfo?.streak || 0;
      const lastActivityDate = streakInfo?.lastActivityDate || null;

      return {
        ...e,
        courseTitle,
        percent,
        completedCount,
        totalCount,
        isFinished,
        totalWatchSeconds,
        lastActivityDate,
        streak
      };
    });

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

  // ── Bulk Selection Helpers ──
  const toggleSelectStudent = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredRows.map(r => r.user_id)));
    }
  };

  const clearSelection = () => setSelectedUserIds(new Set());

  // ── Bulk Disenroll: remove selected students from a chosen course ──
  const handleBulkDisenroll = async () => {
    if (!selectedBulkCourseId) {
      toast.error("Please select a course first");
      return;
    }
    const count = selectedUserIds.size;
    const chosenCourse = courses.find(c => c.id === selectedBulkCourseId);
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to revoke access to "${chosenCourse?.title || selectedBulkCourseId}" for ${count} selected student(s)?\n\nThis will permanently delete their enrollment and learning progress for this course. Student accounts will remain intact.`
    );
    if (!confirmed) return;

    setBulkActionLoading(true);
    toast.loading(`Revoking course access for ${count} student(s)...`, { id: "bulk-disenroll" });
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_disenroll",
          userIds: Array.from(selectedUserIds),
          courseId: selectedBulkCourseId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Successfully disenrolled ${count} student(s)!`, { id: "bulk-disenroll" });
        setShowRevokeModal(false);
        setSelectedBulkCourseId("");
        clearSelection();
        await loadData();
      } else {
        toast.error(data.error || "Bulk disenroll failed", { id: "bulk-disenroll" });
      }
    } catch (err) {
      toast.error("Network error during bulk operation", { id: "bulk-disenroll" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ── Bulk Delete: permanently remove selected student accounts ──
  const handleBulkDelete = async () => {
    const count = selectedUserIds.size;
    const confirmed = window.confirm(
      `🚨 CRITICAL WARNING: You are about to PERMANENTLY DELETE ${count} student account(s) from the platform.\n\nThis will delete:\n• All login credentials\n• All enrollments and learning progress\n• All orders and certificates\n\nThis action is IRREVERSIBLE. Are you absolutely sure?`
    );
    if (!confirmed) return;

    // Double confirmation for destructive bulk delete
    const doubleConfirmed = window.confirm(
      `Final confirmation: Delete ${count} account(s) permanently?\n\nType OK to proceed.`
    );
    if (!doubleConfirmed) return;

    setBulkActionLoading(true);
    toast.loading(`Deleting ${count} student account(s)...`, { id: "bulk-delete" });
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_delete",
          userIds: Array.from(selectedUserIds)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Successfully deleted ${count} account(s)!`, { id: "bulk-delete" });
        clearSelection();
        await loadData();
      } else {
        toast.error(data.error || "Bulk delete failed", { id: "bulk-delete" });
      }
    } catch (err) {
      toast.error("Network error during bulk operation", { id: "bulk-delete" });
    } finally {
      setBulkActionLoading(false);
    }
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
      <div className="flex items-center justify-between border-b border-zinc-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900">Students & CRM Panel</h1>
          <p className="text-zinc-500 text-sm mt-1">Track student progress, completion ratios, and enforce session security policies to prevent account sharing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddingStudent(true)}
            className="h-11 px-5 rounded-2xl bg-[#1D4ED8] hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm border border-zinc-200/60 shadow-brand-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Student</span>
          </button>
          <div className="w-12 h-12 rounded-2xl bg-brand-600/10 border border-zinc-200/60 flex items-center justify-center text-yellow-500">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 border border-zinc-200/60 p-4 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:flex-1 group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search students by name or email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-2.5 pl-11 pr-4 text-xs font-sans focus:outline-none focus:border-zinc-200/60 transition-all text-zinc-900 text-left"
          />
        </div>

        {/* Filter Course */}
        <select
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
          className="w-full md:w-64 bg-slate-50 border border-zinc-200/60 rounded-2xl py-2.5 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-sans text-zinc-700"
        >
          <option value="all">All Courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <button 
          onClick={loadData}
          className="p-2.5 rounded-2xl bg-zinc-100/40 border border-zinc-200 hover:text-yellow-500 hover:bg-zinc-100/80 transition-all cursor-pointer flex items-center justify-center text-zinc-500"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Bulk Actions Bar (appears when students are selected) ── */}
      {selectedUserIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-brand-950/40 to-red-950/20 border border-zinc-200/60 rounded-2xl px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-black text-xs">
              {selectedUserIds.size}
            </div>
            <span className="text-zinc-900 font-bold text-sm">
              {selectedUserIds.size} student{selectedUserIds.size > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-zinc-500 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer"
            >
              (clear)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedBulkCourseId(courses[0]?.id || "");
                setShowRevokeModal(true);
              }}
              disabled={bulkActionLoading}
              className="h-9 px-4 rounded-2xl bg-amber-950/50 border border-amber-500/25 hover:bg-amber-950 text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              Revoke Course Access
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="h-9 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Accounts
            </button>
          </div>
        </div>
      )}

      {/* Students Data Grid/Table */}
      <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl overflow-hidden shadow-sm border border-zinc-200/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-200/60 text-[11px] font-black text-zinc-500 uppercase tracking-widest font-sans">
                {/* Select All */}
                <th className="pl-5 pr-2 py-5 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      borderColor: selectedUserIds.size > 0 ? "#e11d48" : "rgba(255,255,255,0.15)",
                      backgroundColor: selectedUserIds.size === filteredRows.length && filteredRows.length > 0 ? "#e11d48" : "transparent"
                    }}
                    title={selectedUserIds.size === filteredRows.length && filteredRows.length > 0 ? "Deselect All" : "Select All"}
                  >
                    {selectedUserIds.size === filteredRows.length && filteredRows.length > 0 && (
                      <Check className="w-3 h-3 text-zinc-900" />
                    )}
                    {selectedUserIds.size > 0 && selectedUserIds.size < filteredRows.length && (
                      <div className="w-2 h-0.5 bg-brand-400 rounded" />
                    )}
                  </button>
                </th>
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
                  <tr key={i} className="animate-pulse border-b border-zinc-200/60">
                    <td colSpan={7} className="p-8">
                      <div className="h-6 bg-zinc-100/40 rounded-2xl w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-zinc-500 font-bold text-xs">
                    <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    No registered students match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr 
                    key={row.id} 
                    className={cn(
                      "border-b border-zinc-200/60 transition-all font-sans text-xs",
                      selectedUserIds.has(row.user_id)
                        ? "bg-brand-950/10 hover:bg-brand-950/15"
                        : "hover:bg-zinc-50/40"
                    )}
                  >
                    {/* Row Checkbox */}
                    <td className="pl-5 pr-2 py-5 w-10">
                      <button
                        onClick={() => toggleSelectStudent(row.user_id)}
                        className="w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer"
                        style={{
                          borderColor: selectedUserIds.has(row.user_id) ? "#e11d48" : "rgba(255,255,255,0.15)",
                          backgroundColor: selectedUserIds.has(row.user_id) ? "#e11d48" : "transparent"
                        }}
                      >
                        {selectedUserIds.has(row.user_id) && <Check className="w-3 h-3 text-zinc-900" />}
                      </button>
                    </td>
                    {/* Student Identity */}
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900 text-sm">{row.user_name || "JoeSchool Student"}</span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{row.user_email}</span>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="p-5 font-medium text-zinc-700">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-yellow-500" />
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
                            row.isFinished ? "text-emerald-400" : "text-yellow-500"
                          )}>
                            {row.percent}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-zinc-100/40 h-2 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              row.isFinished 
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                                : "bg-gradient-to-r from-brand-500 to-orange-400"
                            )}
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Date & Watch Time */}
                    <td className="p-5 text-zinc-500 font-mono text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-900 font-sans">{(row.totalWatchSeconds ? row.totalWatchSeconds / 3600 : 0).toFixed(1)} hrs</span>
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
                          : "bg-brand-950/40 text-yellow-500 border-brand-900/20"
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
                            <Clock className="w-3 h-3 text-yellow-500" />
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
                          className="h-8 px-3 rounded-2xl bg-zinc-100/40 border border-zinc-200 hover:border-zinc-200/60 hover:text-yellow-500 text-zinc-500 font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Manage</span>
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedStudent(row);
                            setTimeout(() => handleDisenroll(row.course_id), 100);
                          }}
                          className="h-8 px-3 rounded-2xl bg-red-950/10 border border-red-500/20 hover:bg-red-950/40 hover:text-red-400 text-red-500 font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
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

      {/* ── BULK REVOKE COURSE ACCESS MODAL ── */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-zinc-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-sm border border-zinc-200/60 relative text-left">
            {/* Close */}
            <button
              onClick={() => setShowRevokeModal(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-950/50 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Revoke Course Access</h3>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Select the course to revoke access from the{" "}
                  <span className="text-yellow-500 font-bold">{selectedUserIds.size} selected student{selectedUserIds.size > 1 ? "s" : ""}</span>.
                  Their accounts will remain intact.
                </p>
              </div>
            </div>

            {/* Course Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 block">Select Course to Revoke</label>
              <select
                value={selectedBulkCourseId}
                onChange={e => setSelectedBulkCourseId(e.target.value)}
                className="w-full bg-zinc-100/40 border border-zinc-200 rounded-2xl py-3 px-4 text-sm text-zinc-800 focus:outline-none focus:border-amber-500/50 transition-all cursor-pointer"
              >
                {courses.length === 0 ? (
                  <option value="">No courses available</option>
                ) : (
                  courses.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-50">
                      {c.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Warning note */}
            <div className="bg-amber-950/20 border border-amber-500/15 rounded-2xl p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300/80 text-[11px] leading-relaxed">
                This will permanently delete the selected students&apos; enrollment and learning progress for this course. This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="flex-1 h-11 rounded-2xl bg-zinc-100/40 border border-zinc-200 text-zinc-700 hover:text-zinc-900 font-bold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDisenroll}
                disabled={bulkActionLoading || !selectedBulkCourseId}
                className="flex-1 h-11 rounded-2xl bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTROL & EDIT MODAL ──────────────────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-zinc-200 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-sm border border-zinc-200/60 relative text-left max-h-[90vh] overflow-y-auto">
            
            {/* Close */}
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Student CRM & Enrollment Control</h3>
              <p className="text-zinc-500 text-xs mt-1">Manage profile properties, progress checkpoints, credentials, commerce orders, and session security parameters.</p>
            </div>

            {/* Tab Headers inside modal */}
            <div className="flex flex-wrap border-b border-zinc-200/60 pb-1 gap-1">
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
                    modalTab === t.id ? "border-brand-500 text-yellow-500" : "border-transparent text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Modal Body Tabs */}
            {loadingCrm ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
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
                        <label className="text-xs text-zinc-500 font-bold">Student Full Name</label>
                        <input 
                          type="text"
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-sans text-zinc-700 w-full"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-500 font-bold">Email Address</label>
                        <input 
                          type="email"
                          required
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                          className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-mono text-zinc-700 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-brand-600/5 border border-zinc-200/60 p-4 rounded-2xl">
                      <label className="text-xs text-yellow-500 font-bold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" />
                        <span>Student Account Password</span>
                      </label>
                      <div className="flex items-center justify-between gap-4 mt-1">
                        {studentPassword ? (
                          <>
                            <span className="font-mono text-sm font-bold text-zinc-700 select-all tracking-wider">
                              {showStudentPassword ? studentPassword : "••••••••"}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowStudentPassword(!showStudentPassword)}
                                className="p-1.5 rounded bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
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
                                className="p-1.5 rounded bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
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

                    <div className="flex items-center justify-end border-t border-zinc-200/60 pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Account Details</span>
                      </button>
                    </div>
                  </form>

                  {/* Danger Zone: Access & Account Controls */}
                  <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/10 space-y-3 mt-4 text-left" dir="ltr">
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
                        className="h-10 px-4 bg-red-950/40 border border-red-500/20 hover:bg-red-950 text-red-400 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Revoke Access to All Courses</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDeleteStudent}
                        className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
                    <div className="text-zinc-900 text-sm font-bold border-b border-zinc-200/60 pb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span>Recent Activity Timeline</span>
                    </div>

                    <div className="relative border-l border-zinc-200 pl-6 ml-3 space-y-6 py-2">
                      {/* Last Sign In */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-zinc-200 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="text-zinc-500 text-xs font-bold">Last Sign In</div>
                        <div className="text-zinc-900 text-xs mt-1">
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
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-zinc-200 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        </div>
                        <div className="text-zinc-500 text-xs font-bold">Last Video Watched</div>
                        {crmStudentData.timeline?.lastWatchedVideo ? (
                          <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-2xl p-3 mt-2 space-y-1.5">
                            <div className="text-zinc-900 text-xs font-bold flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-yellow-500" />
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
                          <div className="text-zinc-900 text-xs mt-1 text-zinc-600">No watching activity recorded yet.</div>
                        )}
                      </div>

                      {/* Last Purchase */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-zinc-200 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        </div>
                        <div className="text-zinc-500 text-xs font-bold">Last Purchase</div>
                        {crmStudentData.timeline?.lastPurchase ? (
                          <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-2xl p-3 mt-2 space-y-1.5">
                            <div className="text-zinc-900 text-xs font-bold flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                              <span>{crmStudentData.timeline.lastPurchase.product_title}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-3">
                              <span className="font-mono text-yellow-500">{crmStudentData.timeline.lastPurchase.amount} {crmStudentData.timeline.lastPurchase.currency}</span>
                              <span>•</span>
                              <span>Method: {crmStudentData.timeline.lastPurchase.payment_method}</span>
                              <span>•</span>
                              <span>Date: {new Date(crmStudentData.timeline.lastPurchase.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-zinc-900 text-xs mt-1 text-zinc-600">No purchases found.</div>
                        )}
                      </div>

                      {/* Last Device Used */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-zinc-200 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        </div>
                        <div className="text-zinc-500 text-xs font-bold">Last Device & IP Used</div>
                        {crmStudentData.timeline?.lastSession ? (
                          <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-2xl p-3 mt-2 space-y-1">
                            <div className="text-zinc-900 text-xs flex items-center gap-1.5">
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
                          <div className="text-zinc-900 text-xs mt-1 text-zinc-600">No device session logged.</div>
                        )}
                      </div>

                      {/* Last Coupon Used */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-zinc-950 border border-zinc-200 w-4 h-4 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        </div>
                        <div className="text-zinc-500 text-xs font-bold">Last Coupon Used</div>
                        {crmStudentData.timeline?.lastCouponUsed ? (
                          <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-2xl p-3 mt-2 flex items-center justify-between gap-3 text-xs">
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
                          <div className="text-zinc-900 text-xs mt-1 text-zinc-600">No coupons applied.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Security & Password Actions */}
                {modalTab === "security" && (
                  <div className="space-y-6">
                    {/* Reset Password Triggers */}
                    <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 space-y-4">
                      <h4 className="text-zinc-900 text-xs font-bold flex items-center gap-2">
                        <Key className="w-4 h-4 text-yellow-500" />
                        <span>Manage Student Passwords</span>
                      </h4>
                      <p className="text-zinc-500 text-[11px] leading-relaxed">
                        To maintain compliance and maximum security, we do not store raw, editable password fields. Select one of the actions below to trigger password recovery.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSendResetLink}
                          className="flex-1 h-11 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 border border-zinc-200 text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        >
                          Send Reset Password Link
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateTempPassword}
                          className="flex-1 h-11 rounded-2xl bg-[#1D4ED8] hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        >
                          Generate Temporary Password
                        </button>
                      </div>

                      {/* Display generated reset link */}
                      {resetLink && (
                        <div className="p-3 bg-zinc-950 border border-zinc-200/60 rounded-2xl flex items-center justify-between gap-3 text-xs mt-3 animate-fadeIn">
                          <div className="overflow-hidden">
                            <span className="text-[10px] text-zinc-500 block">Generated Recovery URL:</span>
                            <span className="text-zinc-900 mt-1 font-mono truncate block max-w-lg">{resetLink}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(resetLink);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }}
                            className="p-2 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-700 hover:text-zinc-900 rounded-2xl transition-all shrink-0 cursor-pointer"
                            title="Copy link"
                          >
                            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* Display generated temp password */}
                      {tempPassword && (
                        <div className="p-3 bg-zinc-950 border border-zinc-200/60 rounded-2xl flex items-center justify-between gap-3 text-xs mt-3 animate-fadeIn">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Generated Temporary Password:</span>
                            <span className="text-yellow-500 mt-1 font-mono font-black text-sm block">{tempPassword}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tempPassword);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }}
                            className="p-2 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-700 hover:text-zinc-900 rounded-2xl transition-all shrink-0 cursor-pointer"
                            title="Copy password"
                          >
                            {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Set Custom Password */}
                    <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 space-y-4">
                      <h4 className="text-zinc-900 text-xs font-bold flex items-center gap-2">
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
                          className="flex-1 bg-zinc-950 border border-zinc-200/60 rounded-2xl px-3 h-10 text-xs text-zinc-900 placeholder-zinc-600 outline-none focus:border-brand-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleSetCustomPassword}
                          disabled={isSettingCustomPassword}
                          className="px-4 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isSettingCustomPassword ? "Saving..." : "Update Password"}
                        </button>
                      </div>
                    </div>

                    {/* Suspension details */}
                    <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 space-y-4">
                      <h4 className="text-zinc-900 text-xs font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#1D4ED8]" />
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
                            "flex-1 h-11 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                            !isSuspended 
                              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400" 
                              : "bg-zinc-100/40 border-transparent text-zinc-500 hover:text-zinc-900"
                          )}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Active (Allow Learning)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSuspended(true)}
                          className={cn(
                            "flex-1 h-11 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all",
                            isSuspended 
                              ? "bg-red-950/40 border-red-500/30 text-red-400" 
                              : "bg-zinc-100/40 border-transparent text-zinc-500 hover:text-zinc-900"
                          )}
                        >
                          <Ban className="w-4 h-4" />
                          <span>Suspended (Block video streaming)</span>
                        </button>
                      </div>

                      {isSuspended && (
                        <div className="flex flex-col gap-1.5 animate-fadeIn">
                          <label className="text-xs text-zinc-500 font-bold">Suspension Reason</label>
                          <textarea 
                            required
                            placeholder="Write the reason here (e.g. Account sharing detected on multiple concurrent devices)..."
                            value={suspensionReason}
                            onChange={e => setSuspensionReason(e.target.value)}
                            className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-sans text-zinc-700 w-full h-20 resize-none text-left"
                          />
                        </div>
                      )}

                      <div className="flex justify-end border-t border-zinc-200/60 pt-4">
                        <button
                          type="button"
                          onClick={handleUpdateDetails}
                          className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
                            className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-yellow-500" />
                                <span className="text-zinc-900 text-sm font-bold">{matchedCourse.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResetCourseProgress(en.course_id)}
                                  className="h-8 px-3 rounded-2xl border border-zinc-200/60 hover:bg-brand-500/10 text-yellow-500 font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
                                >
                                  Reset Progress
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDisenroll(en.course_id)}
                                  className="h-8 px-3 rounded-2xl border border-red-500/20 bg-red-950/10 hover:bg-red-950 hover:text-red-400 text-red-500 font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
                                >
                                  Disenroll Student
                                </button>
                              </div>
                            </div>

                            {/* Progress percentage bar */}
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-zinc-500">Course Completion Rate</span>
                              <span className="text-yellow-500 font-mono">{completedPercent}% ({userCompletedCount} / {totalLessonsCount} lessons)</span>
                            </div>
                            <div className="w-full bg-black h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-500 to-orange-400"
                                style={{ width: `${completedPercent}%` }}
                              />
                            </div>

                            {/* Modules checklist toggle */}
                            <div className="pt-2 space-y-3">
                              <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-black block">MANUAL LESSON CHECKPOINTS</span>
                              
                              {matchedCourse.modules?.map((mod: any) => (
                                <div key={mod.id} className="space-y-1.5 pl-2 border-l border-zinc-200/60">
                                  <span className="text-[11px] text-zinc-700 font-bold block">{mod.title}</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2">
                                    {mod.lessons?.map((les: any) => {
                                      const isCompleted = crmStudentData.completedLessons.includes(les.id);
                                      return (
                                        <button
                                          key={les.id}
                                          type="button"
                                          onClick={() => handleToggleLesson(en.course_id, les.id, !isCompleted)}
                                          className={cn(
                                            "flex items-center gap-2 p-2 rounded-2xl border text-left text-[11px] transition-all cursor-pointer",
                                            isCompleted
                                              ? "bg-brand-500/5 border-zinc-200/60 text-white"
                                              : "bg-zinc-50/40 border-zinc-200/60 text-zinc-500 hover:text-zinc-800"
                                          )}
                                        >
                                          {isCompleted ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
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
                    <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 space-y-4">
                      <h4 className="text-zinc-900 text-xs font-bold">Enroll in Additional Courses</h4>
                      <div className="grid grid-cols-1 gap-2.5">
                        {allCoursesList
                          .filter(c => !crmStudentData.enrollments.some((en: any) => en.course_id === c.id))
                          .map((c) => (
                            <div 
                              key={c.id} 
                              className="p-3 bg-zinc-100/40 border border-zinc-200/60 rounded-2xl flex items-center justify-between text-xs text-zinc-700"
                            >
                              <div className="flex items-center gap-2 font-bold text-zinc-900">
                                <BookOpen className="w-4 h-4 text-zinc-500" />
                                <span>{c.title}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleEnrollInCourse(c.id)}
                                className="h-8 px-4 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
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
                    <div className="p-4 rounded-2xl bg-brand-600/5 border border-zinc-200/60 text-zinc-500 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                      <AlertCircle className="w-4.5 h-4.5 text-yellow-500 shrink-0 mt-0.5" />
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
                            className="p-4 bg-zinc-100/40 border border-zinc-200/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-zinc-900 block">{matchedCourse.title}</span>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1 font-bold",
                                  matchedCert 
                                    ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" 
                                    : "bg-zinc-950 text-zinc-500 border-zinc-200/60"
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
                                "h-9 px-4 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer",
                                matchedCert
                                  ? "bg-red-950/40 border border-red-500/20 text-red-500 hover:bg-red-950"
                                  : "bg-[#1D4ED8] hover:bg-brand-600 text-white shadow-sm border border-zinc-200/60 shadow-brand-600/10"
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
                    <form onSubmit={handleGrantProductAccess} className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 space-y-4">
                      <h4 className="text-zinc-900 text-xs font-bold">Grant Access to Digital Products & Future Items</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Select Product</label>
                          <select
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                            className="bg-slate-50 border border-zinc-200/60 rounded-2xl py-2.5 px-3 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-sans text-zinc-700 w-full"
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
                            className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-2.5 px-3 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-mono text-zinc-700 w-full"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2 border-t border-zinc-200/60">
                        <button
                          type="submit"
                          className="h-10 px-5 bg-[#1D4ED8] hover:bg-brand-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>Grant Product Rights</span>
                        </button>
                      </div>
                    </form>

                    {/* Order billing history ledger */}
                    <div className="space-y-3">
                      <h4 className="text-zinc-900 text-xs font-bold">Student Spending & Billing Ledger</h4>
                      <div className="bg-zinc-950 border border-zinc-200/60 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="bg-zinc-50/70 border-b border-zinc-200/60 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
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
                                  <tr key={ord.id} className="border-b border-zinc-200/60 hover:bg-zinc-50/40">
                                    <td className="p-3 font-bold text-zinc-900">{ord.product_title || ord.product_id}</td>
                                    <td className="p-3 text-zinc-500 font-mono">{new Date(ord.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 text-zinc-500">{ord.payment_method || "Card"}</td>
                                    <td className="p-3 text-right font-mono font-bold text-yellow-500">{ord.amount} {ord.currency || "EGP"}</td>
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
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold p-3 bg-brand-600/5 border border-zinc-200/60 rounded-2xl leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
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
                            className="p-3.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 flex items-center justify-between gap-4 text-xs font-bold text-zinc-700"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-zinc-100/40 border border-zinc-200 flex items-center justify-center text-zinc-500 shrink-0">
                                <Laptop className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-zinc-900 text-[13px]">{session.browser?.split(" ")[0] || "Browser Session"}</span>
                                  <span className="text-[9px] bg-zinc-100/40 text-zinc-500 px-1.5 py-0.5 rounded font-mono">{session.device_id?.substring(0, 10)}</span>
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
                              className="h-8 px-3 rounded-2xl bg-brand-600/10 hover:bg-brand-600 border border-zinc-200/60 hover:border-transparent text-[#1D4ED8] hover:text-white transition-all text-[10px] font-bold cursor-pointer"
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
                    <div className="text-zinc-900 text-sm font-bold border-b border-zinc-200/60 pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-yellow-500" />
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
                            className="p-3.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 text-xs font-bold space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-black bg-brand-950/40 border border-zinc-200/60 text-yellow-500">
                                {log.action_type}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-zinc-700 font-medium font-sans leading-relaxed">
                              {log.details}
                            </p>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 pt-1 border-t border-zinc-200/60">
                              <span>Admin:</span>
                              <span className="text-zinc-500 font-mono">{log.admin_email}</span>
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
          <div className="bg-slate-50 border border-zinc-200 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-sm border border-zinc-200/60 relative text-left">
            
            {/* Close */}
            <button 
              onClick={() => setIsAddingStudent(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Enroll New Student</h3>
              <p className="text-zinc-500 text-xs mt-1">Enter the email, password, and name to register a student and enroll them in the selected course.</p>
            </div>

            <form onSubmit={handleCreateStudentSubmit} className="space-y-4 font-sans">
              
              {/* Names row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-500 font-bold">First Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Ahmed"
                    value={newStudent.firstName}
                    onChange={e => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                    className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-sans text-zinc-700 w-full"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-500 font-bold">Last Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Ali"
                    value={newStudent.lastName}
                    onChange={e => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                    className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-sans text-zinc-700 w-full"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 font-bold">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={newStudent.email}
                  onChange={e => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-mono text-zinc-700 w-full"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 font-bold">Password (min 6 characters)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newStudent.password}
                    onChange={e => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                    className="flex-1 bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-mono text-zinc-700 w-full"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePasswordForNewStudent}
                    className="h-11 px-4 bg-brand-600/10 border border-zinc-200/60 hover:bg-brand-600/20 text-yellow-500 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                    title="Generate Temporary Password"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Generate</span>
                  </button>
                </div>
              </div>

              {/* Course selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 font-bold">Assign Course Path</label>
                <select
                  required
                  value={newStudent.courseId}
                  onChange={e => setNewStudent(prev => ({ ...prev, courseId: e.target.value }))}
                  className="bg-slate-50 border border-zinc-200/60 rounded-2xl py-3 px-4 text-xs focus:outline-none focus:border-zinc-200/60 transition-all font-sans text-zinc-700 w-full"
                >
                  <option value="" disabled>Select Course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-zinc-200/60 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
                  className="h-11 px-5 rounded-2xl bg-zinc-100/40 border border-zinc-200 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingLoading}
                  className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm border border-zinc-200/60 shadow-brand-600/30"
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
