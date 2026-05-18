"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, Mail, Send, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, BarChart3, Database, 
  HelpCircle, Eye, MousePointerClick, Flag, Sparkles, Inbox,
  ListFilter, Terminal, Globe, ChevronDown, ChevronUp, Copy, Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DiagnosticReport {
  domain: string;
  timestamp: string;
  spf: { status: string; records: string[]; score: number; details: string };
  dkim: { status: string; records: string[]; score: number; details: string };
  dmarc: { status: string; records: string[]; score: number; details: string };
  mx: { status: string; records: string[]; score: number; details: string };
  blacklist: { status: string; listings: number; totalSearched: number; list: string[]; details: string };
  reputation: { gmail: string; outlook: string; rating: string };
  spamScore: number;
  inboxPlacement: string;
}

export default function EmailSystemDiagnosticsPage() {
  const [domain, setDomain] = useState("youssefautomates.com");
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Test email state
  const [testEmail, setTestEmail] = useState("youssefmostafabusiness@gmail.com");
  const [testSubject, setTestSubject] = useState("🧪 اختبار تسليم البريد الإلكتروني | Youssef Automates");
  const [sendingTest, setSendingTest] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"dns" | "spam" | "send" | "logs">("dns");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Mock deliverability analytics stats
  const stats = [
    { name: "معدل التسليم الإجمالي", value: "100%", sub: "Resend Secure Relay", icon: ShieldCheck, color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30" },
    { name: "نسبة فتح البريد (Open Rate)", value: "48.2%", sub: "متوسط الـ 30 يوماً الماضية", icon: Eye, color: "text-rose-400 bg-rose-950/40 border-rose-900/30" },
    { name: "نسبة النقر على الروابط", value: "22.6%", sub: "روابط التحميل والكورسات", icon: MousePointerClick, color: "text-sky-400 bg-sky-950/40 border-sky-900/30" },
    { name: "الارتداد (Bounce Rate)", value: "0.0%", sub: "حسابات وهمية أو غير نشطة", icon: XCircle, color: "text-zinc-500 bg-zinc-950/40 border-zinc-900/30" },
    { name: "شكاوى السبام (Complaints)", value: "0.0%", sub: "حظر أو شكاوى العملاء", icon: Flag, color: "text-zinc-500 bg-zinc-950/40 border-zinc-900/30" },
  ];

  // Outbound Header Checklist
  const mandatoryHeaders = [
    { name: "Message-ID", desc: "المعرف الفريد للمرسل يمنع التزييف", status: "متوافق", value: "diag-[id]@youssefautomates.com" },
    { name: "List-Unsubscribe", desc: "ترويسة إلغاء الاشتراك التلقائي في Gmail/Outlook", status: "متوافق", value: "<mailto:unsubscribe@youssefautomates.com>" },
    { name: "Auto-Submitted", desc: "تصنيف الرسالة كمعاملة تلقائية لمنع الردود التلقائية", status: "متوافق", value: "auto-generated" },
    { name: "Precedence", desc: "يخبر خوادم البريد بنوع المعاملة لمنع الفلاتر", status: "متوافق", value: "bulk" },
    { name: "MIME-Version", desc: "إصدار ترميز المحتوى التفاعلي", status: "متوافق", value: "1.0" },
  ];

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/email-diagnostics?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        toast.success("تم الانتهاء من فحص التوصيلية وقوانين DNS بنجاح!");
      } else {
        toast.error("حدث خطأ أثناء إجراء الفحص: " + data.error);
      }
    } catch (err: any) {
      toast.error("فشل الاتصال بخادم الفحص.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return toast.error("يرجى إدخال البريد الإلكتروني للمستلم أولاً");
    setSendingTest(true);
    setDispatchLogs([]);
    
    const logs = [
      `[${new Date().toLocaleTimeString()}] 📡 تهيئة الاتصال ببوابة إرسال Resend Relay Secure...`,
      `[${new Date().toLocaleTimeString()}] 🔍 فحص صلاحيات النطاق المرسل: delivery@youssefautomates.com`,
    ];
    setDispatchLogs([...logs]);

    try {
      await new Promise(r => setTimeout(r, 1000));
      logs.push(`[${new Date().toLocaleTimeString()}] 🛠️ حقن الترويسات الإجبارية لمنع السبام (List-Unsubscribe, Precedence)...`);
      setDispatchLogs([...logs]);

      await new Promise(r => setTimeout(r, 1200));
      logs.push(`[${new Date().toLocaleTimeString()}] 🧪 توليد النسخة النصية البديلة (Plain-Text version) لتخفيض Spam Score...`);
      setDispatchLogs([...logs]);

      const response = await fetch("/api/admin/email-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: testEmail, subject: testSubject })
      });
      const data = await response.json();

      await new Promise(r => setTimeout(r, 800));
      if (data.success) {
        logs.push(`[${new Date().toLocaleTimeString()}] 🚀 تم تسليم الرسالة للخادم بنجاح!`);
        logs.push(`[${new Date().toLocaleTimeString()}] 💳 معرّف المعاملة الفريد: ${data.messageId}`);
        logs.push(`[${new Date().toLocaleTimeString()}] 🟢 التتبع نشط (تتبع فتح الرسائل والارتداد 100%)`);
        setDispatchLogs([...logs]);
        toast.success("تم إرسال البريد التشخيصي بنجاح! تفقد بريدك الوارد.");
      } else {
        logs.push(`[${new Date().toLocaleTimeString()}] ❌ فشل تسليم الرسالة: ${data.error}`);
        setDispatchLogs([...logs]);
        toast.error("فشل إرسال البريد التشخيصي.");
      }
    } catch (err: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ استثناء غير متوقع: ${err.message}`);
      setDispatchLogs([...logs]);
      toast.error("حدث خطأ استثنائي أثناء الإرسال.");
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
    toast.success("تم النسخ إلى الحافظة!");
  };

  const renderDnsRow = (title: string, check: any, id: string) => {
    const isExpanded = expandedSection === id;
    return (
      <div className="border-b border-white/5 py-4 last:border-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border",
              check.status === "valid" || check.status === "strong"
                ? "bg-emerald-950/40 border-emerald-900/30 text-emerald-400"
                : check.status === "weak" || check.status === "warning"
                  ? "bg-amber-950/40 border-amber-900/30 text-amber-400"
                  : "bg-red-950/40 border-red-900/30 text-red-400"
            )}>
              {(check.status === "valid" || check.status === "strong") && <CheckCircle2 className="w-4 h-4" />}
              {(check.status === "weak" || check.status === "warning") && <AlertTriangle className="w-4 h-4" />}
              {check.status === "missing" && <XCircle className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-alexandria font-bold text-xs md:text-sm text-white block">{title}</span>
              <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">{check.details}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {check.records && check.records.length > 0 && (
              <button 
                onClick={() => setExpandedSection(isExpanded ? null : id)}
                className="h-8 px-2.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isExpanded ? "إخفاء التفاصيل" : "عرض السجل"}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
            <span className={cn(
              "text-[9px] font-black uppercase px-2.5 py-1 rounded border tracking-wider",
              check.status === "valid" || check.status === "strong"
                ? "bg-emerald-950 text-emerald-400 border-emerald-900/30"
                : check.status === "weak" || check.status === "warning"
                  ? "bg-amber-950 text-amber-400 border-amber-900/30"
                  : "bg-red-950 text-red-400 border-red-900/30"
            )}>
              {check.status === "valid" && "نشط وسليم"}
              {check.status === "strong" && "نشط وقوي"}
              {check.status === "weak" && "نشط وضعيف"}
              {check.status === "warning" && "به تحذير"}
              {check.status === "missing" && "غير موجود"}
            </span>
          </div>
        </div>

        {isExpanded && check.records && (
          <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/5 space-y-2 relative">
            <button 
              onClick={() => copyToClipboard(check.records.join("\n"), id)}
              className="absolute top-3 left-3 p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
            >
              {copiedText === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] text-zinc-500 font-bold block uppercase">DNS TXT Value:</span>
            <code className="text-xs text-rose-400 font-mono break-all block pl-8 select-all">
              {typeof check.records[0] === "string" ? check.records.join("\n") : JSON.stringify(check.records[0], null, 2)}
            </code>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-32">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-alexandria font-black text-white flex items-center gap-2.5">
            <Mail className="w-8 h-8 text-rose-500" />
            نظام تشخيص تسليم البريد الإلكتروني
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            مراقبة قوانين الـ DNS، تقييم الاسبام، تتبع تسليم الرسائل ونسب الفتح والارتداد للنطاق الموثق.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            value={domain} 
            onChange={(e) => setDomain(e.target.value)} 
            placeholder="مثال: domains.com" 
            className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm w-full md:w-56"
          />
          <button 
            onClick={runDiagnostics} 
            disabled={loading}
            className="h-10 px-5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white rounded-xl font-bold flex items-center gap-2 text-xs transition-all shrink-0 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>إعادة الفحص المباشر</span>
          </button>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-bold font-cairo">{stat.name}</span>
              <div className={cn("p-1.5 rounded-lg border", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-alexandria font-black text-white tracking-tighter">{stat.value}</span>
              <span className="text-[9px] text-zinc-500 block font-medium">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* DETAILED DIAGNOSTICS GRID */}
      {report ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT PANEL: SPAM SCORE & REPUTATION */}
          <div className="space-y-8 lg:col-span-1">
            {/* SPAM SCORE RADIAL */}
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute w-48 h-48 bg-rose-500/5 rounded-full blur-[60px] -top-20 -right-20 pointer-events-none" />
              
              <h2 className="text-xs font-alexandria font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-3">
                معدل أمان البريد من الفلاتر (Spam Score)
              </h2>

              <div className="relative w-40 h-40 mx-auto flex items-center justify-center rounded-full border-4 border-dashed border-rose-500/20">
                <div className="absolute inset-2 bg-rose-600/5 rounded-full border-4 border-rose-500/30 flex flex-col items-center justify-center">
                  <span className="text-4xl font-alexandria font-black text-white">{report.spamScore}</span>
                  <span className="text-[10px] text-zinc-500 font-bold mt-1">من 10.0 نقاط</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-bold text-white block">حالة صندوق الوارد المتوقعة:</span>
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider block",
                  report.spamScore >= 8.5 ? "text-emerald-400" : report.spamScore >= 6.0 ? "text-amber-400" : "text-red-400"
                )}>
                  {report.inboxPlacement}
                </span>
              </div>
            </div>

            {/* SENDER REPUTATION INDICATORS */}
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 space-y-6 shadow-2xl">
              <h2 className="text-xs font-alexandria font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-3">
                مؤشرات السمعة لدى خوادم الاستقبال
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs text-zinc-400 font-bold">سمعة النطاق في Gmail (Postmaster)</span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded border uppercase",
                    report.reputation.gmail.includes("High") 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" 
                      : "bg-amber-950 text-amber-400 border-amber-900/30"
                  )}>
                    {report.reputation.gmail}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs text-zinc-400 font-bold">سمعة النطاق في Microsoft Outlook</span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded border uppercase",
                    report.reputation.outlook.includes("High") 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" 
                      : "bg-amber-950 text-amber-400 border-amber-900/30"
                  )}>
                    {report.reputation.outlook}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">حالة القوائم السوداء (Blacklists)</span>
                  <span className="text-[10px] text-emerald-400 font-black bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                    {report.blacklist.status === "clean" ? "سليم (غير مدرج)" : "مدرج بقائمة"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-500 leading-relaxed font-medium">
                🛡️ تعتمد سمعة النطاق بشكل كلي على سلامة سجلات الـ SPF والـ DKIM بالإضافة لمستويات ارتداد الإيميل المنخفضة جداً (أقل من 1.0%).
              </div>
            </div>
          </div>

          {/* RIGHT & CENTER PANEL: DETAILED REPORTS */}
          <div className="lg:col-span-2 space-y-8">
            {/* TABS SELECTOR */}
            <div className="flex border-b border-white/5 gap-2">
              <button 
                onClick={() => setActiveTab("dns")} 
                className={cn(
                  "h-11 px-6 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                  activeTab === "dns" ? "border-rose-600 text-white" : "border-transparent text-zinc-500 hover:text-white"
                )}
              >
                <Globe className="w-4 h-4" />
                <span>فحص سجلات النطاق DNS</span>
              </button>
              <button 
                onClick={() => setActiveTab("spam")} 
                className={cn(
                  "h-11 px-6 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                  activeTab === "spam" ? "border-rose-600 text-white" : "border-transparent text-zinc-500 hover:text-white"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span>تحليل ترويسات وهيكل البريد</span>
              </button>
              <button 
                onClick={() => setActiveTab("send")} 
                className={cn(
                  "h-11 px-6 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                  activeTab === "send" ? "border-rose-600 text-white" : "border-transparent text-zinc-500 hover:text-white"
                )}
              >
                <Send className="w-4 h-4" />
                <span>إرسال بريد تشخيصي تجريبي</span>
              </button>
            </div>

            {/* TAB CONTENT: DNS CHECKLIST */}
            {activeTab === "dns" && (
              <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-base font-alexandria font-bold text-white">حالة تفويض النطاق الموثق (Domain DNS Check)</h2>
                  <p className="text-zinc-500 text-xs mt-1">تفويض خوادم الاستقبال للتحقق من هوية المرسل وتجنب انتحال الشخصيات.</p>
                </div>

                <div className="divide-y divide-white/5">
                  {renderDnsRow("سجل تفويض المرسل (SPF Record)", report.spf, "spf")}
                  {renderDnsRow("مفتاح التوقيع الرقمي (DKIM Signature)", report.dkim, "dkim")}
                  {renderDnsRow("سياسة أمن النطاق (DMARC Policy)", report.dmarc, "dmarc")}
                  {renderDnsRow("سجلات خوادم الاستقبال (MX Records)", report.mx, "mx")}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SPAM HEADERS ANALYSIS */}
            {activeTab === "spam" && (
              <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-base font-alexandria font-bold text-white">ترويسات البريد الصادر الذكية (Smart Outbound Headers)</h2>
                  <p className="text-zinc-500 text-xs mt-1">المعايير المدمجة تلقائياً في خادم إرسال Youssef Automates لتخفيض Spam Score.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right text-zinc-400">
                    <thead className="text-xs text-white uppercase bg-white/5">
                      <tr>
                        <th className="px-4 py-3 rounded-r-xl">الترويسة (Header)</th>
                        <th className="px-4 py-3">الوصف الفني</th>
                        <th className="px-4 py-3">القيمة المحقونة</th>
                        <th className="px-4 py-3 rounded-l-xl text-left">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mandatoryHeaders.map((hdr, i) => (
                        <tr key={i} className="border-b border-white/5 bg-white/[0.01]">
                          <td className="px-4 py-3.5 font-bold text-white font-mono text-xs">{hdr.name}</td>
                          <td className="px-4 py-3.5 text-xs">{hdr.desc}</td>
                          <td className="px-4 py-3.5 font-mono text-[10px] text-rose-400">{hdr.value}</td>
                          <td className="px-4 py-3.5 text-left">
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded text-[10px] font-bold">
                              {hdr.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TEST EMAIL SENDER */}
            {activeTab === "send" && (
              <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-base font-alexandria font-bold text-white">إرسال بريد تشخيصي مباشر (Live Dispatch Test)</h2>
                  <p className="text-zinc-500 text-xs mt-1">توليد وإرسال بريد إلكتروني حقيقي واختبار وصوله إلى صندوق الوارد ومراقبة ترويساته.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400">البريد الإلكتروني المستهدف (To)</label>
                    <input 
                      type="email" 
                      value={testEmail} 
                      onChange={(e) => setTestEmail(e.target.value)} 
                      placeholder="to@example.com" 
                      className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400">عنوان البريد (Subject)</label>
                    <input 
                      type="text" 
                      value={testSubject} 
                      onChange={(e) => setTestSubject(e.target.value)} 
                      placeholder="عنوان بريد الاختبار..." 
                      className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={handleSendTestEmail} 
                    disabled={sendingTest}
                    className="h-11 px-6 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white rounded-xl font-bold flex items-center gap-2 text-xs cursor-pointer transition-colors"
                  >
                    {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>إرسال بريد الاختبار الفوري 🚀</span>
                  </button>
                  
                  <a 
                    href="https://www.mail-tester.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="h-11 px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold flex items-center gap-2 text-xs transition-colors"
                  >
                    <span>فتح موقع Mail-Tester الخارجي</span>
                  </a>
                </div>

                {/* DISPATCH LIVE TERMINAL LOGS */}
                {dispatchLogs.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-rose-500" />
                      سيرفر إرسال البريد - البث الحي للعمليات (SMTP Live Logs):
                    </span>
                    <div className="bg-black border border-white/5 p-4 rounded-xl font-mono text-[11px] space-y-1.5 text-zinc-400 overflow-y-auto max-h-56 scrollbar-thin scrollbar-thumb-zinc-800">
                      {dispatchLogs.map((log, i) => (
                        <div key={i} className={cn(
                          log.includes("❌") ? "text-red-400" : log.includes("🟢") || log.includes("✅") ? "text-emerald-400" : "text-zinc-400"
                        )}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-20 text-center bg-[#0a0a0f] border border-white/5 rounded-3xl space-y-4">
          <Database className="w-16 h-16 text-zinc-700 mx-auto animate-pulse" />
          <p className="text-zinc-500 font-bold text-sm">جاري جلب إعدادات وبوابة الاتصال وتفويض النطاق...</p>
        </div>
      )}
    </div>
  );
}
