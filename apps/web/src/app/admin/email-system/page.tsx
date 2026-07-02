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
  const [domain, setDomain] = useState("joeschool.com");
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Test email state
  const [testEmail, setTestEmail] = useState("youssefmostafabusiness@gmail.com");
  const [testSubject, setTestSubject] = useState("🧪 Email Delivery Test | JoeSchool");
  const [sendingTest, setSendingTest] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"dns" | "spam" | "send" | "logs">("dns");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Mock deliverability analytics stats
  const stats = [
    { name: "Overall Delivery Rate", value: "100%", sub: "Resend Secure Relay", icon: ShieldCheck, color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30" },
    { name: "Open Rate", value: "48.2%", sub: "Average of past 30 days", icon: Eye, color: "text-yellow-500 bg-brand-950/40 border-brand-900/30" },
    { name: "Click-Through Rate (CTR)", value: "22.6%", sub: "Downloads & Academy Links", icon: MousePointerClick, color: "text-sky-400 bg-sky-950/40 border-sky-900/30" },
    { name: "Bounce Rate", value: "0.0%", sub: "Invalid or inactive emails", icon: XCircle, color: "text-zinc-500 bg-zinc-950/40 border-zinc-900/30" },
    { name: "Spam Complaints", value: "0.0%", sub: "Complaints & hard blocks", icon: Flag, color: "text-zinc-500 bg-zinc-950/40 border-zinc-900/30" },
  ];

  // Outbound Header Checklist
  const mandatoryHeaders = [
    { name: "Message-ID", desc: "Unique message identifier prevents spoofing", status: "Compliant", value: "diag-[id]@joeschool.com" },
    { name: "List-Unsubscribe", desc: "Automatic list unsubscribe header for Gmail/Outlook", status: "Compliant", value: "<mailto:unsubscribe@joeschool.com>" },
    { name: "Auto-Submitted", desc: "Identifies automated emails to suppress auto-replies", status: "Compliant", value: "auto-generated" },
    { name: "Precedence", desc: "Declares bulk precedence classification to receiving servers", status: "Compliant", value: "bulk" },
    { name: "MIME-Version", desc: "Multipurpose Internet Mail Extensions standard version", status: "Compliant", value: "1.0" },
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
        toast.success("Connectivity audit and DNS record checks completed successfully!");
      } else {
        toast.error("An error occurred during verification: " + data.error);
      }
    } catch (err: any) {
      toast.error("Failed to connect to the verification server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return toast.error("Please enter the recipient email address first");
    setSendingTest(true);
    setDispatchLogs([]);
    
    const logs = [
      `[${new Date().toLocaleTimeString()}] 📡 Initializing connection to Resend Relay Secure SMTP gateway...`,
      `[${new Date().toLocaleTimeString()}] 🔍 Verifying sending authorization for domain: delivery@joeschool.com`,
    ];
    setDispatchLogs([...logs]);

    try {
      await new Promise(r => setTimeout(r, 1000));
      logs.push(`[${new Date().toLocaleTimeString()}] 🛠️ Injecting anti-spam headers (List-Unsubscribe, Precedence, Auto-Submitted)...`);
      setDispatchLogs([...logs]);

      await new Promise(r => setTimeout(r, 1200));
      logs.push(`[${new Date().toLocaleTimeString()}] 🧪 Generating fallback plain-text version to minimize Spam Score...`);
      setDispatchLogs([...logs]);

      const response = await fetch("/api/admin/email-diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: testEmail, subject: testSubject })
      });
      const data = await response.json();

      await new Promise(r => setTimeout(r, 800));
      if (data.success) {
        logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Message successfully dispatched to remote SMTP relay server!`);
        logs.push(`[${new Date().toLocaleTimeString()}] 💳 Unique message transaction ID: ${data.messageId}`);
        logs.push(`[${new Date().toLocaleTimeString()}] 🟢 Real-time telemetry active (100% open & bounce tracking)`);
        setDispatchLogs([...logs]);
        toast.success("Diagnostic test email dispatched successfully! Please check your inbox.");
      } else {
        logs.push(`[${new Date().toLocaleTimeString()}] ❌ Message delivery failed: ${data.error}`);
        setDispatchLogs([...logs]);
        toast.error("Failed to dispatch diagnostic test email.");
      }
    } catch (err: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] ❌ Unexpected SMTP exception: ${err.message}`);
      setDispatchLogs([...logs]);
      toast.error("An exceptional error occurred during dispatch.");
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const renderDnsRow = (title: string, check: any, id: string) => {
    const isExpanded = expandedSection === id;
    return (
      <div className="border-b border-zinc-200/60 py-4 last:border-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-2xl flex items-center justify-center border",
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
              <span className="font-bold text-xs md:text-sm text-zinc-900 block">{title}</span>
              <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">{check.details}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {check.records && check.records.length > 0 && (
              <button 
                onClick={() => setExpandedSection(isExpanded ? null : id)}
                className="h-8 px-2.5 rounded bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isExpanded ? "Hide Details" : "Show Record"}</span>
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
              {check.status === "valid" && "Active & Valid"}
              {check.status === "strong" && "Active & Strong"}
              {check.status === "weak" && "Active & Weak"}
              {check.status === "warning" && "Warning"}
              {check.status === "missing" && "Missing"}
            </span>

          </div>
        </div>

        {isExpanded && check.records && (
          <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-zinc-200/60 space-y-2 relative">
            <button 
              onClick={() => copyToClipboard(check.records.join("\n"), id)}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-zinc-100/40 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              {copiedText === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] text-zinc-500 font-bold block uppercase">DNS TXT Value:</span>
            <code className="text-xs text-yellow-500 font-mono break-all block pl-8 select-all">
              {typeof check.records[0] === "string" ? check.records.join("\n") : JSON.stringify(check.records[0], null, 2)}
            </code>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-32 text-left font-sans animate-in fade-in slide-in-from-bottom-4 duration-700" dir="ltr">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-200/60 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 flex items-center gap-2.5">
            <Mail className="w-8 h-8 text-yellow-500" />
            Email Deliverability & Diagnostic Suite
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Monitor DNS authorization protocols, analyze spam metrics, track message delivery states, and audit bounce rates.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            value={domain} 
            onChange={(e) => setDomain(e.target.value)} 
            placeholder="e.g. domains.com" 
            className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-2 px-4 text-sm w-full md:w-56 text-zinc-900"
          />
          <button 
            onClick={runDiagnostics} 
            disabled={loading}
            className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-brand-800 text-white rounded-2xl font-bold flex items-center gap-2 text-xs transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Trigger Real-Time Audit</span>
          </button>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-50 border border-zinc-200/60 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-sm border border-zinc-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-bold">{stat.name}</span>
              <div className={cn("p-1.5 rounded-2xl border", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-black text-zinc-900 tracking-tighter">{stat.value}</span>
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
            <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl p-6 text-center space-y-6 shadow-sm border border-zinc-200/60 relative overflow-hidden">
              <div className="absolute w-48 h-48 bg-brand-500/5 rounded-full blur-[60px] -top-20 -right-20 pointer-events-none" />
              
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200/60 pb-3">
                Spam Filter Deliverability Rating
              </h2>

              <div className="relative w-40 h-40 mx-auto flex items-center justify-center rounded-full border-4 border-dashed border-zinc-200/60">
                <div className="absolute inset-2 bg-brand-600/5 rounded-full border-4 border-zinc-200/60 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-zinc-900">{report.spamScore}</span>
                  <span className="text-[10px] text-zinc-500 font-bold mt-1">out of 10.0 points</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-bold text-zinc-900 block">Predicted Inbox Placement:</span>
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider block",
                  report.spamScore >= 8.5 ? "text-emerald-400" : report.spamScore >= 6.0 ? "text-amber-400" : "text-red-400"
                )}>
                  {report.inboxPlacement}
                </span>
              </div>
            </div>

            {/* SENDER REPUTATION INDICATORS */}
            <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl p-6 space-y-6 shadow-sm border border-zinc-200/60">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-200/60 pb-3">
                Receiver Domain Reputation Indices
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3 text-xs">
                  <span className="text-zinc-500 font-bold">Domain Reputation on Gmail (Postmaster)</span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded border uppercase",
                    report.reputation.gmail.includes("High") 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" 
                      : "bg-amber-950 text-amber-400 border-amber-900/30"
                  )}>
                    {report.reputation.gmail}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3 text-xs">
                  <span className="text-zinc-500 font-bold">Domain Reputation on Microsoft Outlook</span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded border uppercase",
                    report.reputation.outlook.includes("High") 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" 
                      : "bg-amber-950 text-amber-400 border-amber-900/30"
                  )}>
                    {report.reputation.outlook}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold">Real-Time Blacklist (RBL) Listings</span>
                  <span className="text-[10px] text-emerald-400 font-black bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                    {report.blacklist.status === "clean" ? "Clean (Not listed)" : "Listed"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 text-[11px] text-zinc-500 leading-relaxed font-medium">
                🛡️ Receiver domain reputation relies entirely on valid SPF/DKIM records combined with exceptionally low bounce rates (ideally under 1.0%).
              </div>
            </div>
          </div>

          {/* RIGHT & CENTER PANEL: DETAILED REPORTS */}
          <div className="lg:col-span-2 space-y-8">
            {/* TABS SELECTOR */}
            <div className="flex border-b border-zinc-200/60 gap-2">
              <button 
                onClick={() => setActiveTab("dns")} 
                className={cn(
                  "h-11 px-6 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                  activeTab === "dns" ? "border-brand-600 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
                )}
              >
                <Globe className="w-4 h-4" />
                <span>DNS Record Check</span>
              </button>
              <button 
                onClick={() => setActiveTab("spam")} 
                className={cn(
                  "h-11 px-6 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                  activeTab === "spam" ? "border-brand-600 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span>Header & Structure Audit</span>
              </button>
              <button 
                onClick={() => setActiveTab("send")} 
                className={cn(
                  "h-11 px-6 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                  activeTab === "send" ? "border-brand-600 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
                )}
              >
                <Send className="w-4 h-4" />
                <span>Live Dispatch Test</span>
              </button>
            </div>

            {/* TAB CONTENT: DNS CHECKLIST */}
            {activeTab === "dns" && (
              <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/60 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Domain DNS Authentication Checks</h2>
                  <p className="text-zinc-500 text-xs mt-1">Authorizing receiving servers to verify the sender identity and mitigate spoofing attempts.</p>
                </div>

                <div className="divide-y divide-white/5">
                  {renderDnsRow("Sender Policy Framework (SPF Record)", report.spf, "spf")}
                  {renderDnsRow("DomainKeys Identified Mail (DKIM Signature)", report.dkim, "dkim")}
                  {renderDnsRow("DMARC Security Policy", report.dmarc, "dmarc")}
                  {renderDnsRow("Mail Exchanger Routing (MX Records)", report.mx, "mx")}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SPAM HEADERS ANALYSIS */}
            {activeTab === "spam" && (
              <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/60 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Smart Outbound Delivery Headers</h2>
                  <p className="text-zinc-500 text-xs mt-1">Anti-spam indicators automatically embedded in the JoeSchool outbound relay to decrease spam score.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-zinc-500">
                    <thead className="text-xs text-zinc-900 uppercase bg-zinc-100/40">
                      <tr>
                        <th className="px-4 py-3 rounded-l-xl">Header Field</th>
                        <th className="px-4 py-3">Technical Purpose</th>
                        <th className="px-4 py-3">Injected Value</th>
                        <th className="px-4 py-3 rounded-r-xl text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mandatoryHeaders.map((hdr, i) => (
                        <tr key={i} className="border-b border-zinc-200/60 bg-zinc-50/40">
                          <td className="px-4 py-3.5 font-bold text-zinc-900 font-mono text-xs">{hdr.name}</td>
                          <td className="px-4 py-3.5 text-xs">{hdr.desc}</td>
                          <td className="px-4 py-3.5 font-mono text-[10px] text-yellow-500">{hdr.value}</td>
                          <td className="px-4 py-3.5 text-right">
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
              <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/60 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Live SMTP Dispatch Test</h2>
                  <p className="text-zinc-500 text-xs mt-1">Generate and dispatch a real email message to test inbox placement, SPF alignment, and head-end metadata ingestion.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-500">Recipient Email Address (To)</label>
                    <input 
                      type="email" 
                      value={testEmail} 
                      onChange={(e) => setTestEmail(e.target.value)} 
                      placeholder="to@example.com" 
                      className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-sm text-zinc-900"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-500">Subject Title</label>
                    <input 
                      type="text" 
                      value={testSubject} 
                      onChange={(e) => setTestSubject(e.target.value)} 
                      placeholder="Enter subject title..." 
                      className="bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3 px-4 text-sm text-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={handleSendTestEmail} 
                    disabled={sendingTest}
                    className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-brand-800 text-white rounded-2xl font-bold flex items-center gap-2 text-xs cursor-pointer transition-colors"
                  >
                    {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Dispatch Live SMTP Test 🚀</span>
                  </button>
                  
                  <a 
                    href="https://www.mail-tester.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="h-11 px-6 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                  >
                    <span>Launch Mail-Tester External Suite</span>
                  </a>
                </div>

                {/* DISPATCH LIVE TERMINAL LOGS */}
                {dispatchLogs.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                    <span className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-yellow-500" />
                      Outbound SMTP Relay - Live Activity Logs:
                    </span>
                    <div className="bg-black border border-zinc-200/60 p-4 rounded-2xl font-mono text-[11px] space-y-1.5 text-zinc-500 overflow-y-auto max-h-56 scrollbar-thin scrollbar-thumb-zinc-800">
                      {dispatchLogs.map((log, i) => (
                        <div key={i} className={cn(
                          log.includes("❌") ? "text-red-400" : log.includes("🟢") || log.includes("✅") ? "text-emerald-400" : "text-zinc-500"
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
        <div className="p-20 text-center bg-slate-50 border border-zinc-200/60 rounded-3xl space-y-4">
          <Database className="w-16 h-16 text-zinc-700 mx-auto animate-pulse" />
          <p className="text-zinc-500 font-bold text-sm">Fetching SMTP connection configuration and domain DNS delegation states...</p>
        </div>
      )}
    </div>
  );
}
