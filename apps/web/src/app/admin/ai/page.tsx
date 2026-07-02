"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Send, Plus, Trash2, Loader2, Brain, 
  BookOpen, Package, Award, HelpCircle, Target,
  MessageSquare, User, Zap, AlertTriangle,
  ChevronLeft, BarChart3, Flame
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
      toast.error("Failed to load previous conversation history");
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
        body: JSON.stringify({ title: "New Advisory Session" })
      });
      if (res.ok) {
        const newChat = await res.json();
        setConversations(prev => [newChat, ...prev]);
        setActiveConvId(newChat.id);
        setStreamingText("");
        setInputMessage("");
        toast.success("New intelligent advisory session initialized! 🟢");
      }
    } catch (err) {
      toast.error("Failed to initialize new session");
    }
  }

  // Delete chat session
  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this session from your history?")) return;

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
        toast.success("Advisory session deleted! 🔴");
      }
    } catch (err) {
      toast.error("Failed to delete session");
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
          body: JSON.stringify({ title: "New Advisory Session" })
        });
        if (res.ok) {
          const newChat = await res.json();
          setConversations(prev => [newChat, ...prev]);
          targetConvId = newChat.id;
          setActiveConvId(newChat.id);
        } else {
          toast.error("Failed to create conversation session");
          return;
        }
      } catch (err) {
        toast.error("Server connection error");
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
        throw new Error("Failed to generate response from AI");
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
            title: c.title === "New Advisory Session" 
              ? textToSend.split(" ").slice(0, 4).join(" ") + "..." 
              : c.title
          };
        }
        return c;
      }));
      setStreamingText("");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }

  // Quick Action AI Tools
  const aiTools = [
    { label: "Analyze Platform", prompt: "Conduct a comprehensive and deep audit of the entire store based on the active database parameters. Extract conversion insights, acquisition channels performance, and structural improvements.", icon: Brain, color: "from-[#1D4ED8] to-[#3B82F6]" },
    { label: "Max Profit Strategy", prompt: "Identify the absolute best instant profit opportunities and cashflow triggers based on my active digital products, enrollment rates, and completed orders. Provide specific bundle proposals.", icon: Zap, color: "from-amber-500 to-orange-600" },
    { label: "LMS Academy Review", prompt: "Review my academy courses, student enrollment metrics, and lesson completion trends. Propose actionable retention strategies to increase student graduation rates.", icon: BookOpen, color: "from-blue-500 to-indigo-600" },
    { label: "Audit Digital Files", prompt: "Evaluate the price points, sales counts, and failure rates of all digital products in my store. Recommend pricing adjustments or value-addons to scale sales velocity.", icon: Package, color: "from-emerald-500 to-teal-600" },
    { label: "Design Funnel", prompt: "Design a high-converting marketing funnel that combines my digital files and academic courses. Structure a concrete bump offer and upsell logic to maximize AOV.", icon: Target, color: "from-purple-500 to-pink-600" },
    { label: "Check Drop-offs", prompt: "Review checkout abandonment ratios, failed payment intentions, and student drop-off hotspots. Detail clear technical and performance marketing remediations.", icon: AlertTriangle, color: "from-brand-500 to-red-600" },
    { label: "Propose Promo Campaign", prompt: "Draft a complete 7-day marketing campaign (incorporating TikTok/Facebook ads structure, email sequences, and discount codes) to rapidly accelerate store volume.", icon: Flame, color: "from-orange-500 to-red-500" },
    { label: "Student Engagement", prompt: "Examine student review scores, watch durations, and study streaks. Recommend enhancements to the student learn page to boost course completion.", icon: Award, color: "from-cyan-500 to-sky-600" }
  ];

  // Quick prompt presets for suggestions
  const promptsPresets = [
    "How can I increase the Average Order Value (AOV) by 30%?",
    "Propose a Bundle idea connecting automation packages with academic courses.",
    "Draft an automated email sequence to recover abandoned carts.",
    "Analyze customer retention rate and suggest a loyalty strategy."
  ];

  // Custom premium Markdown/English Formatter
  function formatAIText(text: string) {
    if (!text) return "";
    
    const lines = text.split("\n");
    return lines.map((line, i) => {
      let trimmed = line.trim();
      
      // 1. Headers formatting
      if (trimmed.startsWith("###")) {
        return <h4 key={i} className="text-sm font-sans font-bold text-yellow-500 mt-4 mb-2">{trimmed.replace("###", "")}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={i} className="text-base font-sans font-black text-zinc-900 mt-5 mb-2.5 pb-1 border-b border-zinc-200/60">{trimmed.replace("##", "")}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={i} className="text-lg font-sans font-black text-[#1D4ED8] mt-6 mb-3">{trimmed.replace("#", "")}</h2>;
      }

      // 2. Unordered lists formatting
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const bulletText = trimmed.slice(1).trim();
        return (
          <ul key={i} className="list-disc list-inside text-zinc-700 text-xs py-0.5 pl-4 space-y-1">
            <li>{bulletText}</li>
          </ul>
        );
      }

      // 3. Numbers/Ordered lists formatting
      if (/^\d+\./.test(trimmed)) {
        return (
          <ol key={i} className="list-decimal list-inside text-zinc-700 text-xs py-0.5 pl-4 space-y-1">
            <li>{trimmed.replace(/^\d+\./, "").trim()}</li>
          </ol>
        );
      }

      // 4. Bold text replacements (within lines)
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <p key={i} className="text-zinc-700 text-xs leading-relaxed my-1.5">
            {parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="text-zinc-900 font-bold">{part}</strong> : part)}
          </p>
        );
      }

      // 5. Code block indicators
      if (trimmed.startsWith("```")) {
        return null; // Skip standard fences rendering
      }

      // 6. Normal line rendering
      if (!trimmed) return <div key={i} className="h-2" />;
      return <p key={i} className="text-zinc-700 text-xs leading-relaxed my-1.5">{line}</p>;
    });
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] min-h-[550px] bg-white rounded-3xl border border-zinc-200/60 overflow-hidden shadow-sm border border-zinc-200/60 relative font-sans text-left" dir="ltr">
      
      {/* 🔴 Sidebar Panel - AI Conversations History */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full bg-[#08080c] border-r border-zinc-200/60 flex flex-col shrink-0 relative z-30"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-zinc-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-[#1D4ED8]" />
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">Advisory Sessions</h3>
              </div>
              
              <button
                onClick={handleStartNewChat}
                className="p-2 bg-[#1D4ED8]/10 hover:bg-[#1D4ED8] text-[#1D4ED8] hover:text-white rounded-2xl transition-all cursor-pointer border border-transparent"
                title="Start New Session"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {loadingChats ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
                  <span className="text-[10px] text-zinc-500 font-bold">Loading history...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 text-xs">
                  No previous advisory sessions found. Start a new one!
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
                          ? "bg-[#1D4ED8]/10 border-[#1D4ED8]/30 text-white" 
                          : "bg-zinc-50/40 border-zinc-200/60 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/30 hover:border-zinc-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MessageSquare className={cn("w-4 h-4 shrink-0", isActive ? "text-[#1D4ED8]" : "text-zinc-500")} />
                        <p className="text-xs font-bold truncate pl-1 text-left">{conv.title}</p>
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteChat(conv.id, e)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-2xl transition-all"
                        title="Delete Session"
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
        <header className="p-4 bg-[#09090d]/60 border-b border-zinc-200/60 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-zinc-100/40 hover:bg-zinc-100/80 border border-zinc-200/60 text-zinc-500 hover:text-zinc-900 rounded-2xl transition-all cursor-pointer"
              title="Toggle Sidebar"
            >
              <ChevronLeft className={cn("w-4 h-4 transition-transform", sidebarOpen ? "" : "rotate-180")} />
            </button>

            <div>
              <h2 className="text-xs md:text-sm font-black text-zinc-900 flex items-center gap-1.5 uppercase tracking-wide">
                Smart Growth & Advisory AI Assistant
                <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Intelligent advisory officer analyzing database metrics, sales figures, and student logs to suggest marketing options.</p>
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1D4ED8] to-purple-600 flex items-center justify-center mx-auto shadow-sm border border-zinc-200/60 shadow-[#1D4ED8]/20 relative group">
                  <Brain className="w-8 h-8 text-zinc-900 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-[#1D4ED8] rounded-2xl blur-xl opacity-30 -z-10 group-hover:opacity-50 transition-opacity" />
                </div>
                
                <h1 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight">
                  Welcome to the Smart Growth Advisory Hub
                </h1>
                <p className="text-xs text-zinc-500 max-w-lg mx-auto leading-relaxed font-semibold">
                  I am your performance marketing and finance advisor, directly connected to your store sales, courses, and students. Trigger any analysis tool below or write to me directly!
                </p>
              </div>

              {/* Grid of smart AI quick tools */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest text-left">Smart Growth & Analysis Toolkits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {aiTools.map((tool) => (
                    <button
                      key={tool.label}
                      onClick={() => handleSendMessage(tool.prompt)}
                      disabled={isLoading}
                      className="p-4 rounded-3xl bg-[#09090d]/80 border border-zinc-200/60 hover:border-[#1D4ED8]/40 transition-all text-left relative overflow-hidden group shadow-md hover:shadow-sm border border-zinc-200/60 hover:shadow-[#1D4ED8]/5 cursor-pointer text-xs font-bold active:scale-95 border border-transparent"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-10 bg-gradient-to-br from-[#1D4ED8] to-purple-600 pointer-events-none" />
                      <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-zinc-100/40 mb-3 group-hover:bg-[#1D4ED8]/10 transition-colors">
                        <tool.icon className="w-4 h-4 text-zinc-500 group-hover:text-[#1D4ED8] transition-colors" />
                      </div>
                      <p className="text-zinc-900 text-xs font-bold mb-1 leading-snug">{tool.label}</p>
                      <span className="text-[9px] text-zinc-500 font-semibold group-hover:text-zinc-500 transition-colors">Run Tool ←</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of suggestion prompt templates */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest text-left">Advisory Prompt Presets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {promptsPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setInputMessage(preset)}
                      className="p-3.5 bg-zinc-50/40 hover:bg-zinc-100/30 border border-zinc-200/60 hover:border-zinc-200 rounded-2xl text-left text-xs text-zinc-700 hover:text-zinc-900 transition-all cursor-pointer font-bold leading-relaxed"
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
                      "flex gap-4 p-5 rounded-3xl border relative text-left",
                      isUser 
                        ? "bg-zinc-50/40 border-zinc-200/60 flex-row" 
                        : "bg-[#09090d]/80 border-zinc-200/60 flex-row"
                    )}
                  >
                    {/* User / Bot Avatar Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-zinc-200/60",
                      isUser 
                        ? "bg-zinc-800 text-zinc-700" 
                        : "bg-gradient-to-tr from-[#1D4ED8] to-purple-600 text-zinc-900"
                    )}>
                      {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500">
                        {isUser ? "You (Admin)" : "Smart Growth Advisor"}
                      </p>
                      
                      {isUser ? (
                        <p className="text-zinc-900 text-xs font-bold leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="space-y-1 font-sans">
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
              <div className="flex gap-4 p-5 rounded-3xl border bg-[#09090d]/80 border-zinc-200/60 text-left flex-row">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-zinc-200/60 bg-gradient-to-tr from-[#1D4ED8] to-purple-600 text-zinc-900">
                  <Brain className="w-4 h-4 animate-pulse" />
                </div>
                
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500 flex items-center gap-1.5">
                    Thinking & generating...
                    <Loader2 className="w-3 h-3 text-[#1D4ED8] animate-spin" />
                  </p>
                  
                  <div className="space-y-1 font-sans">
                    {formatAIText(streamingText)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rendering AI Typing status */}
          {isTyping && !streamingText && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex gap-4 p-5 rounded-3xl border bg-[#09090d]/80 border-zinc-200/60 text-left flex-row">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-zinc-200/60 bg-gradient-to-tr from-[#1D4ED8] to-purple-600 text-zinc-900">
                  <Brain className="w-4 h-4 animate-bounce" />
                </div>
                
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Connecting to database and compiling telemetry...</p>
                  
                  <div className="flex items-center gap-1.5 py-2">
                    <span className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#1D4ED8]/60 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-[#1D4ED8]/30 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Interactive Chat Input Area */}
        <footer className="p-4 bg-[#09090d]/60 border-t border-zinc-200/60 z-20">
          <div className="max-w-4xl mx-auto flex items-center gap-3 bg-zinc-100/40 border border-zinc-200/60 rounded-2xl p-1.5 focus-within:border-[#1D4ED8]/40 focus-within:ring-1 focus-within:ring-[#1D4ED8]/20 transition-all">
            <input
              type="text"
              placeholder={isLoading ? "AI is thinking and generating details..." : "Ask the Smart Advisor for performance strategies or marketing ideas..."}
              value={inputMessage}
              disabled={isLoading}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-xs px-3 text-zinc-900 placeholder-zinc-500 text-left"
              dir="ltr"
            />
            
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className={cn(
                "p-3 rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0 border border-transparent",
                inputMessage.trim() && !isLoading
                  ? "bg-[#1D4ED8] text-white hover:bg-[#3B82F6] shadow-sm border border-zinc-200/60 shadow-[#1D4ED8]/25"
                  : "bg-zinc-100/40 text-zinc-500 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </footer>

      </div>
      
    </div>
  );
}
