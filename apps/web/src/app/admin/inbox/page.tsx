"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Mail, MailOpen, Search, Inbox, ArrowRight, CheckCircle2,
  Clock, AlertCircle, RefreshCw, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  isRead: boolean;
  folderId: string;
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [emailBody, setEmailBody] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inbox");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load messages");
      setEmails(data);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while loading messages");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmail = async (email: Email) => {
    setSelectedEmail(email);
    setEmailBody(null);
    setLoadingBody(true);

    try {
      const res = await fetch(`/api/admin/inbox?messageId=${email.id}&folderId=${email.folderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load message content");
      setEmailBody(data.content);

      // Auto mark as read if it is unread
      if (!email.isRead) {
        await markAsRead(email.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load email content");
    } finally {
      setLoadingBody(false);
    }
  };

  const markAsRead = async (id: string) => {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/admin/inbox/${id}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update message status");

      // Update state
      setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, isRead: true } : null);
      }

      // Dispatch layout event to refresh sidebar count badge
      window.dispatchEvent(new CustomEvent("inbox-updated"));
    } catch (err: any) {
      console.error("Mark read error:", err);
    } finally {
      setMarkingId(null);
    }
  };

  const filteredEmails = emails.filter(
    e =>
      e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCount = emails.length;
  const unreadCount = emails.filter(e => !e.isRead).length;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-2 md:p-8 font-sans" dir="ltr">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-black text-white mb-2">Inbox 📬</h1>
          <p className="text-zinc-500 text-xs">View and manage incoming messages for support@joeschool.com directly from the dashboard.</p>
        </div>
        <button
          onClick={fetchEmails}
          className="h-10 px-4 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/5 flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Mail
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#09090e] p-6 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1 font-sans">Total Messages</p>
            <h3 className="text-2xl font-black text-white font-sans">{totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#09090e] p-6 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1 font-sans">Unread Messages</p>
            <h3 className="text-2xl font-black text-white font-sans flex items-center gap-2">
              {unreadCount}
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-[#D6004B]/20 text-[#D6004B] border border-[#D6004B]/30 rounded-full font-bold">Active</span>
              )}
            </h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${unreadCount > 0 ? 'bg-[#D6004B]/10 text-[#D6004B]' : 'bg-white/5 text-zinc-500'}`}>
            <MailOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Actions and Search */}
      <div className="relative w-full max-w-md group">
        <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#D6004B] transition-colors" />
        <Input 
          type="text" 
          placeholder="Search by sender or subject..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 bg-white/5 border-white/10 text-white text-xs pl-12 pr-4 rounded-xl text-left focus:border-[#D6004B]/50 transition-all font-sans"
        />
      </div>

      {/* Main Mail Area */}
      <div className="bg-[#09090e] rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative">
        {loading ? (
          // Loading Skeletons
          <div className="divide-y divide-white/5">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 flex items-center gap-4 animate-pulse">
                <div className="w-3.5 h-3.5 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-white/5 rounded-md w-1/4" />
                    <div className="h-3 bg-white/5 rounded-md w-12" />
                  </div>
                  <div className="h-3.5 bg-white/5 rounded-md w-1/3" />
                  <div className="h-3 bg-white/5 rounded-md w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-650 mb-4 animate-bounce-subtle">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-white mb-1">No incoming messages yet</h3>
            <p className="text-zinc-500 text-xs max-w-[280px]">Your inbox is completely empty at the moment.</p>
          </div>
        ) : (
          // Email List Rows
          <div className="divide-y divide-white/5 font-sans">
            {filteredEmails.map(email => (
              <div 
                key={email.id}
                onClick={() => handleOpenEmail(email)}
                className={`p-6 flex items-start gap-4 transition-all hover:bg-white/[0.02] cursor-pointer relative group/row ${!email.isRead ? 'bg-[#D6004B]/[0.02]' : ''}`}
              >
                {/* Active Indicator Line */}
                {!email.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D6004B]" />
                )}

                {/* Read/Unread Dot */}
                <div className="pt-1.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full transition-all ${email.isRead ? 'bg-zinc-800 scale-75' : 'bg-[#D6004B] shadow-[0_0_8px_rgba(214,0,75,0.7)]'}`} />
                </div>

                {/* Info and Metadata */}
                <div className="flex-1 min-w-0 text-left space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-xs text-white truncate max-w-[200px] sm:max-w-xs">{email.from}</span>
                    <span className="text-[10px] text-zinc-555 shrink-0 font-sans">{formatDate(email.date)}</span>
                  </div>
                  <h4 className={`text-xs truncate transition-colors group-hover/row:text-[#D6004B] ${!email.isRead ? 'font-black text-white' : 'text-zinc-350'}`}>
                    {email.subject}
                  </h4>
                  <p className="text-[11px] text-zinc-500 line-clamp-1 leading-relaxed">
                    {email.preview}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium Slide-over Panel for reading email body */}
      <AnimatePresence>
        {selectedEmail && (
          <>
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmail(null)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />

            {/* Slide-out Sheet Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 right-0 w-full max-w-2xl bg-[#09090e] border-l border-white/10 z-50 shadow-2xl flex flex-col font-sans"
              dir="ltr"
            >
              {/* Header Panel */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95 shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white line-clamp-1">{selectedEmail.subject}</h3>
                    <p className="text-[10px] text-zinc-500 font-sans mt-0.5">{selectedEmail.from}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedEmail.isRead && (
                    <button
                      onClick={() => markAsRead(selectedEmail.id)}
                      disabled={markingId === selectedEmail.id}
                      className="h-9 px-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-95 shrink-0"
                    >
                      {markingId === selectedEmail.id ? (
                        <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Mark as Read
                    </button>
                  )}
                  <span className="text-[10px] text-zinc-500 font-sans hidden sm:inline-block">{formatDate(selectedEmail.date)}</span>
                </div>
              </div>

              {/* Message Content Container */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                {/* Meta details */}
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-xs text-zinc-400 space-y-2 text-left">
                  <div><strong>From:</strong> <span className="text-zinc-200 font-sans">{selectedEmail.from}</span></div>
                  <div><strong>To:</strong> <span className="text-zinc-200 font-sans">support@joeschool.com</span></div>
                  <div><strong>Date:</strong> <span className="text-zinc-200 font-sans">{new Date(selectedEmail.date).toLocaleString("en-US")}</span></div>
                </div>

                {/* Email Body */}
                <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 min-h-[300px] relative">
                  {loadingBody ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-3">
                      <div className="w-8 h-8 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
                      <span className="text-xs">Loading message...</span>
                    </div>
                  ) : emailBody ? (
                    // Safe render within a styled division, converting line breaks or loading HTML
                    emailBody.includes("<div") || emailBody.includes("<p") || emailBody.includes("<br") ? (
                      <div 
                        className="email-body-content text-zinc-200 prose prose-invert prose-rose max-w-none text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: emailBody }}
                      />
                    ) : (
                      <pre className="text-zinc-200 whitespace-pre-wrap font-sans text-xs leading-relaxed text-left dir-ltr">
                        {emailBody}
                      </pre>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600 text-center gap-2">
                      <AlertCircle className="w-8 h-8 opacity-40" />
                      <span className="text-xs">Failed to load email content.</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
