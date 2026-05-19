"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Send, Plus, Trash2, Loader2, Brain, 
  TrendingUp, BookOpen, Package, Award, HelpCircle, 
  MessageSquare, User, Zap, AlertTriangle, ArrowLeft,
  ChevronLeft, BarChart3, LineChart, Target, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export default function AIBusinessAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Streaming text buffer
  const [streamingText, setStreamingText] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial conversations list
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto scroll on message stream/list update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeConvId, streamingText, isTyping]);

  async function fetchConversations() {
    setLoadingChats(true);
    try {
      const res = await fetch("/api/admin/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
        if (data && data.length > 0 && !activeConvId) {
          setActiveConvId(data[0].id);
        }
      }
    } catch (err) {
      toast.error("فشل تحميل قائمة المحادثات السابقة");
    } finally {
      setLoadingChats(false);
    }
  }

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Create new chat session
  async function handleStartNewChat() {
    try {
      const res = await fetch("/api/admin/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "محادثة استشارية جديدة" })
      });
      if (res.ok) {
        const newChat = await res.json();
        setConversations(prev => [newChat, ...prev]);
        setActiveConvId(newChat.id);
        setStreamingText("");
        setInputMessage("");
        toast.success("تم بدء جلسة استشارية ذكية جديدة 🟢");
      }
    } catch (err) {
      toast.error("فشل بدء محادثة جديدة");
    }
  }

  // Delete chat session
  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذه المحادثة بالكامل من السجل؟")) return;

    try {
      const res = await fetch(`/api/admin/ai/conversations?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConvId === id) {
          const remaining = conversations.filter(c => c.id !== id);
          setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
        }
        toast.success("تم حذف المحادثة بنجاح 🔴");
      }
    } catch (err) {
      toast.error("فشل حذف المحادثة");
    }
  }

  // Send message to OpenRouter Stream
  async function handleSendMessage(customPrompt?: string) {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    let targetConvId = activeConvId;

    // Auto-create chat session if none exists
    if (!targetConvId) {
      try {
        const res = await fetch("/api/admin/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "محادثة استشارية جديدة" })
        });
        if (res.ok) {
          const newChat = await res.json();
          setConversations(prev => [newChat, ...prev]);
          targetConvId = newChat.id;
          setActiveConvId(newChat.id);
        } else {
          toast.error("فشل إنشاء جلسة للمحادثة");
          return;
        }
      } catch (err) {
        toast.error("خطأ في الاتصال بالخادم");
        return;
      }
    }

    // Update local messages lists immediately
    const userMsg: Message = { role: "user", content: textToSend };
    setConversations(prev => prev.map(c => {
      if (c.id === targetConvId) {
        return { ...c, messages: [...c.messages, userMsg] };
      }
      return c;
    }));

    setInputMessage("");
    setIsLoading(true);
    setIsTyping(true);
    setStreamingText("");

    try {
      const response = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          conversationId: targetConvId
        })
      });

      if (!response.ok) {
        throw new Error("فشل توليد الرد من الذكاء الاصطناعي");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantResponse = "";

      setIsTyping(false); // Stop typing visual once stream starts

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantResponse += chunk;
          setStreamingText(assistantResponse);
        }
      }

      // Finish streaming and update conversation logs
      const assistantMsg: Message = { role: "assistant", content: assistantResponse };
      setConversations(prev => prev.map(c => {
        if (c.id === targetConvId) {
          return {
            ...c,
            messages: [...c.messages, assistantMsg],
            title: c.title === "محادثة استشارية جديدة" 
              ? textToSend.split(" ").slice(0, 4).join(" ") + "..." 
              : c.title
          };
        }
        return c;
      }));
      setStreamingText("");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }

  // Quick Action AI Tools
  const aiTools = [
    { label: "حلل المنصة بالكامل", prompt: "قم بإجراء تحليل شامل وشامل للمنصة بالكامل بناءً على بيانات الداتا بيز المتاحة، واستخرج أفضل مؤشرات الأداء الحالية ونقاط القوة والضعف ومقترحات التحسين.", icon: Brain, color: "from-[#D6004B] to-[#ff0059]" },
    { label: "أفضل فرصة ربح حالياً", prompt: "ما هي أفضل فرصة ربح وتدفق مالي فوري يمكنني تحقيقها بناءً على منتجاتي الرقمية والكورسات الحالية ومعدلات الشراء؟ اعطني أفكاراً ملموسة وعروضاً محددة.", icon: Zap, color: "from-amber-500 to-orange-600" },
    { label: "حلل أداء الكورسات", prompt: "حلل أداء الكورسات التعليمية واشتركات الطلاب ومعدل تقدمهم، واقترح استراتيجيات لزيادة التفاعل وإكمال الدروس داخل الأكاديمية.", icon: BookOpen, color: "from-blue-500 to-indigo-600" },
    { label: "حلل المنتجات الرقمية", prompt: "أجرِ تقييماً لجميع المنتجات الرقمية بالمتجر، والأسعار الحالية وحجم المبيعات لكل منتج، واقترح تحسينات تسعيرية ذكية لزيادة الإقبال.", icon: Package, color: "from-emerald-500 to-teal-600" },
    { label: "اقترح Funnel مبيعات", prompt: "اقترح قمع بيع متكامل وعالي التحويل (High-converting marketing funnel) يجمع بين منتجاتي الرقمية والكورسات بطريقة ذكية تزيد من القيمة الشرائية لـ Bump Offer و Upsells.", icon: Target, color: "from-purple-500 to-pink-600" },
    { label: "اكتشف مشاكل التحويل", prompt: "افحص معدل التحويل ونسبة التخلي عن الدفع والطلبات الفاشلة والمعلقة بالداتا بيز، وحدد المشاكل أو المعوقات التي تواجه العملاء واقترح حلولاً تقنية وتسويقية.", icon: AlertTriangle, color: "from-rose-500 to-red-600" },
    { label: "اقترح حملة تسويقية", prompt: "اقترح حملة تسويقية متكاملة (مثال: إعلانات تيك توك وتويتر، حملات إيميل، كوبونات تخفيض) لتنشيط المبيعات وزيادة الإيرادات في الـ 7 أيام القادمة.", icon: Flame, color: "from-orange-500 to-red-500" },
    { label: "حلل سلوك الطلاب", prompt: "حلل إحصائيات تقييمات الكورسات وسلوك الطلاب وإكمال الدروس، واقترح تحسينات لتجربة الطالب لرفع الرضا ومعدل النجاح.", icon: Award, color: "from-cyan-500 to-sky-600" }
  ];

  // Quick prompt presets for suggestions
  const promptsPresets = [
    "كيف يمكنني زيادة متوسط قيمة الطلب (AOV) بنسبة 30%؟",
    "اقترح فكرة باقة (Bundle) لربط حزم الأتمتة بالكورسات التعليمية.",
    "صغ لي سيناريو بريد إلكتروني تلقائي لاسترجاع السلال المتروكة.",
    "حلل معدل الشراء المتكرر للعملاء واقترح استراتيجية ولاء."
  ];

  // Custom premium Markdown/Arabic Formatter
  function formatAIText(text: string) {
    if (!text) return "";
    
    // Convert newlines to breaks
    const lines = text.split("\n");
    return lines.map((line, i) => {
      let trimmed = line.trim();
      
      // 1. Headers formatting
      if (trimmed.startsWith("###")) {
        return <h4 key={i} className="text-sm font-alexandria font-bold text-rose-400 mt-4 mb-2">{trimmed.replace("###", "")}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={i} className="text-base font-alexandria font-black text-white mt-5 mb-2.5 pb-1 border-b border-white/5">{trimmed.replace("##", "")}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={i} className="text-lg font-alexandria font-black text-[#D6004B] mt-6 mb-3">{trimmed.replace("#", "")}</h2>;
      }

      // 2. Unordered lists formatting
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const bulletText = trimmed.slice(1).trim();
        return (
          <ul key={i} className="list-disc list-inside text-zinc-300 text-xs py-0.5 pr-4 space-y-1">
            <li>{bulletText}</li>
          </ul>
        );
      }

      // 3. Numbers/Ordered lists formatting
      if (/^\d+\./.test(trimmed)) {
        return (
          <ol key={i} className="list-decimal list-inside text-zinc-300 text-xs py-0.5 pr-4 space-y-1">
            <li>{trimmed.replace(/^\d+\./, "").trim()}</li>
          </ol>
        );
      }

      // 4. Bold text replacements (within lines)
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <p key={i} className="text-zinc-300 text-xs leading-relaxed my-1.5">
            {parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="text-white font-bold">{part}</strong> : part)}
          </p>
        );
      }

      // 5. Code block indicators
      if (trimmed.startsWith("```")) {
        return null; // Skip standard fences rendering
      }

      // 6. Normal line rendering
      if (!trimmed) return <div key={i} className="h-2" />;
      return <p key={i} className="text-zinc-300 text-xs leading-relaxed my-1.5">{line}</p>;
    });
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] min-h-[550px] bg-[#050505] rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative font-cairo">
      
      {/* 🔴 Sidebar Panel - AI Conversations History */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full bg-[#08080c] border-l border-white/5 flex flex-col shrink-0 relative z-30"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-[#D6004B]" />
                <h3 className="text-xs font-black font-alexandria text-white">جلسات الأعمال الذكية</h3>
              </div>
              
              <button
                onClick={handleStartNewChat}
                className="p-2 bg-[#D6004B]/10 hover:bg-[#D6004B] text-[#D6004B] hover:text-white rounded-xl transition-all cursor-pointer"
                title="بدء جلسة جديدة"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {loadingChats ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
                  <span className="text-[10px] text-zinc-500 font-bold">جاري تحميل السجل...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 text-xs">
                  لا توجد محادثات سابقة مسجلة. ابدأ الآن!
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setStreamingText("");
                      }}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 relative overflow-hidden",
                        isActive 
                          ? "bg-[#D6004B]/10 border-[#D6004B]/30 text-white" 
                          : "bg-white/[0.01] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MessageSquare className={cn("w-4 h-4 shrink-0", isActive ? "text-[#D6004B]" : "text-zinc-500")} />
                        <p className="text-xs font-bold truncate pr-1 text-right">{conv.title}</p>
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteChat(conv.id, e)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                        title="حذف الجلسة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔵 Chat & Analysis Engine Panel */}
      <div className="flex-1 flex flex-col h-full bg-[#060609] relative min-w-0">
        
        {/* Chat Toolbar Panel */}
        <header className="p-4 bg-[#09090d]/60 border-b border-white/5 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
              title="القائمة الجانبية"
            >
              <ChevronLeft className={cn("w-4 h-4 transition-transform", sidebarOpen ? "rotate-180" : "")} />
            </button>

            <div>
              <h2 className="text-xs md:text-sm font-black font-alexandria text-white flex items-center gap-1.5">
                مساعد النمو والاستشارة الذكي (AI Assistant)
                <Sparkles className="w-4 h-4 text-[#D6004B]" />
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold mt-0.5">موظف استشاري ذكي يحلل أرقام المنصة، مبيعاتك، ونشاط طلابك ويقترح باقات تسويقية.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-black tracking-wider shrink-0">
              Llama 3.1 405B Active
            </span>
          </div>
        </header>

        {/* Dynamic Chats & Prompts Display Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
          
          {/* Welcome Screen / No active message */}
          {(!activeConv || activeConv.messages.length === 0) && !streamingText && (
            <div className="max-w-4xl mx-auto space-y-8 py-4">
              
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D6004B] to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-[#D6004B]/20 relative group">
                  <Brain className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-[#D6004B] rounded-2xl blur-xl opacity-30 -z-10 group-hover:opacity-50 transition-opacity" />
                </div>
                
                <h1 className="text-xl md:text-2xl font-black font-alexandria text-white">
                  مرحباً بك في مركز الاستشارة والنمو الذكي
                </h1>
                <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
                  أنا مستشارك المالي والتسويقي، مرتبط بجميع مبيعاتك وكورساتك وطلابك مباشرة. حدد أي أداة بالأسفل أو اسألني مباشرة!
                </p>
              </div>

              {/* Grid of smart AI quick tools */}
              <div className="space-y-3">
                <h3 className="text-xs font-black font-alexandria text-zinc-500 uppercase tracking-widest text-right">أدوات التحليل والنمو الذكية</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {aiTools.map((tool) => (
                    <button
                      key={tool.label}
                      onClick={() => handleSendMessage(tool.prompt)}
                      disabled={isLoading}
                      className="p-4 rounded-3xl bg-[#09090d]/80 border border-white/5 hover:border-[#D6004B]/40 transition-all text-right relative overflow-hidden group shadow-md hover:shadow-xl hover:shadow-[#D6004B]/5 cursor-pointer text-xs font-bold font-alexandria active:scale-95"
                    >
                      <div className="absolute top-0 left-0 w-16 h-16 rounded-full blur-2xl opacity-10 bg-gradient-to-br from-[#D6004B] to-purple-600 pointer-events-none" />
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 mb-3 group-hover:bg-[#D6004B]/10 transition-colors">
                        <tool.icon className="w-4 h-4 text-zinc-400 group-hover:text-[#D6004B] transition-colors" />
                      </div>
                      <p className="text-white text-xs font-bold mb-1 leading-snug">{tool.label}</p>
                      <span className="text-[9px] text-zinc-500 font-semibold group-hover:text-zinc-400 transition-colors">تشغيل الأداة ←</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of suggestion prompt templates */}
              <div className="space-y-3">
                <h3 className="text-xs font-black font-alexandria text-zinc-500 uppercase tracking-widest text-right">أفكار واستشارات سريعة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {promptsPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setInputMessage(preset)}
                      className="p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl text-right text-xs text-zinc-300 hover:text-white transition-all cursor-pointer font-bold leading-relaxed"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Render Chats History */}
          {activeConv && activeConv.messages.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-6">
              {activeConv.messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-4 p-5 rounded-3xl border relative",
                      isUser 
                        ? "bg-white/[0.01] border-white/5 text-right flex-row-reverse" 
                        : "bg-[#09090d]/80 border-white/5 text-right flex-row"
                    )}
                  >
                    {/* User / Bot Avatar Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                      isUser 
                        ? "bg-zinc-800 text-zinc-300" 
                        : "bg-gradient-to-tr from-[#D6004B] to-purple-600 text-white"
                    )}>
                      {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 font-alexandria">
                        {isUser ? "أنت (الأدمن)" : "مستشار النمو الذكي"}
                      </p>
                      
                      {isUser ? (
                        <p className="text-white text-xs font-bold leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="space-y-1 font-cairo">
                          {formatAIText(msg.content)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Render Active Streaming AI response */}
          {streamingText && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex gap-4 p-5 rounded-3xl border bg-[#09090d]/80 border-white/5 text-right flex-row">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-tr from-[#D6004B] to-purple-600 text-white">
                  <Brain className="w-4 h-4 animate-pulse" />
                </div>
                
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 font-alexandria flex items-center gap-1.5">
                    جاري التفكير والكتابة...
                    <Loader2 className="w-3 h-3 text-[#D6004B] animate-spin" />
                  </p>
                  
                  <div className="space-y-1 font-cairo">
                    {formatAIText(streamingText)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rendering AI Typing status */}
          {isTyping && !streamingText && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex gap-4 p-5 rounded-3xl border bg-[#09090d]/80 border-white/5 text-right flex-row">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-tr from-[#D6004B] to-purple-600 text-white">
                  <Brain className="w-4 h-4 animate-bounce" />
                </div>
                
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 font-alexandria">جاري الاتصال بالداتا وتحليل الأرقام...</p>
                  
                  <div className="flex items-center gap-1.5 py-2">
                    <span className="w-2 h-2 rounded-full bg-[#D6004B] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#D6004B]/60 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-[#D6004B]/30 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Interactive Chat Input Area */}
        <footer className="p-4 bg-[#09090d]/60 border-t border-white/5 z-20">
          <div className="max-w-4xl mx-auto flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-1.5 focus-within:border-[#D6004B]/40 focus-within:ring-1 focus-within:ring-[#D6004B]/20 transition-all">
            <input
              type="text"
              placeholder={isLoading ? "الذكاء الاصطناعي يقوم بالتفكير والتوليد حالياً..." : "اسأل مساعد النمو الذكي عن استراتيجيات أو أفكار مبيعات..."}
              value={inputMessage}
              disabled={isLoading}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-xs px-3 text-white placeholder-zinc-500 text-right"
              dir="rtl"
            />
            
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className={cn(
                "p-3 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0",
                inputMessage.trim() && !isLoading
                  ? "bg-[#D6004B] text-white hover:bg-[#ff0059] shadow-lg shadow-[#D6004B]/25"
                  : "bg-white/5 text-zinc-500 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        </footer>

      </div>
      
    </div>
  );
}
