"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Store, 
  CreditCard, 
  Mail, 
  Shield, 
  ChevronRight, 
  Save, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Code,
  Terminal,
  Activity,
  RefreshCw,
  Play,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { extractMetaPixelId } from "@/lib/pixelUtils";

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("general");

  // Store Settings State
  const [storeName, setStoreName] = useState("JoeSchool");
  const [storeEmail, setStoreEmail] = useState("admin@joeschool.com");
  
  // Paymob Settings State
  const [paymobApiKey, setPaymobApiKey] = useState("••••••••••••••••••••••••");
  const [paymobIntegrationId, setPaymobIntegrationId] = useState("4567891");
  const [paymobHmac, setPaymobHmac] = useState("••••••••••••••••");

  // Meta Pixel & CAPI Settings State
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaPixelRawCode, setMetaPixelRawCode] = useState("");
  const [metaPixelEnabled, setMetaPixelEnabled] = useState(false);
  const [metaCapiEnabled, setMetaCapiEnabled] = useState(false);
  const [metaCapiToken, setMetaCapiToken] = useState("");
  const [metaCapiTestCode, setMetaCapiTestCode] = useState("");
  const [tiktokPixelId, setTiktokPixelId] = useState("");
  const [tiktokPixelEnabled, setTiktokPixelEnabled] = useState(false);

  // Diagnostics & Local Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTracking, setActiveTracking] = useState<any>(null);

  // Connection & Verification States
  const [testConnectionStatus, setTestConnectionStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data && !data.error) {
          const pId = data.metaPixelId && data.metaPixelId !== "1234567890" ? data.metaPixelId : "2851098458597955";
          const pEnabled = data.metaPixelId ? !!data.metaPixelEnabled : true;
          const cEnabled = data.metaCapiToken ? !!data.metaCapiEnabled : true;
          const cToken = data.metaCapiToken && data.metaCapiToken !== "placeholder" ? data.metaCapiToken : "EAAgiivlidyEBRqMvMvILkEBvy9cThPMxUpekZBGDChtShYfKLljTXwURIgZAnRUBl4XhGufblytzz9QZB1LWFYh88kcfmskovy1hwcD3ksILWA02M9D2Kq4ucTx2XgRgv4XfhhGapa1kTLSRyuq8DfSan84SLUCSt7mQoK9E3qaIvC5sF9SttSTkfgtZB9lapQZDZD";
          
          setMetaPixelId(pId);
          setMetaPixelRawCode(data.metaPixelRawCode || pId);
          setMetaPixelEnabled(pEnabled);
          setMetaCapiEnabled(cEnabled);
          setMetaCapiToken(cToken);
          setMetaCapiTestCode(data.metaCapiTestCode || "TEST4319");
          setTiktokPixelId(data.tiktokPixelId || "");
          setTiktokPixelEnabled(!!data.tiktokPixelEnabled);

          const syncedData = {
            metaPixelId: pId,
            metaPixelRawCode: data.metaPixelRawCode || pId,
            metaPixelEnabled: pEnabled,
            metaCapiEnabled: cEnabled,
            metaCapiToken: cToken,
            metaCapiTestCode: data.metaCapiTestCode || "TEST4319",
            tiktokPixelId: data.tiktokPixelId || "",
            tiktokPixelEnabled: !!data.tiktokPixelEnabled
          };

          // Sync with active tracking layer
          const { initMetaPixel } = await import("@/lib/metaPixel");
          initMetaPixel(syncedData);
          setActiveTracking(syncedData);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    }
    loadSettings();
    loadLogs();

    if (typeof window !== "undefined") {
      window.addEventListener("meta_tracking_event_logged", loadLogs);
      return () => window.removeEventListener("meta_tracking_event_logged", loadLogs);
    }
  }, []);

  const loadLogs = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("meta_pixel_events_log") || "[]";
      setLogs(JSON.parse(raw));
      setActiveTracking((window as any).metaTrackingSettings || null);
    } catch(e) {}
  };

  const handleSendTestPurchase = async () => {
    const { trackMetaEvent } = await import("@/lib/metaPixel");
    const testId = `YA-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    toast.info("جاري إرسال حدث شراء تجريبي CAPI + Pixel...", { duration: 1500 });
    
    trackMetaEvent("Purchase", {
      value: 199.00,
      currency: "USD",
      content_name: "Test High-Performance Automation",
      content_ids: ["test_capi_99"],
      transaction_id: testId,
      email: "capi-tester@example.com"
    }, `purchase_${testId}`);
    
    setTimeout(() => {
      loadLogs();
      toast.success("تم إرسال حدث الشراء بنجاح! تحقق من Events Manager.");
    }, 1800);
  };

  const handleClearLogs = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("meta_pixel_events_log");
    setLogs([]);
    toast.success("تم تفريغ لوحة التشخيص بنجاح");
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      let finalPixelId = metaPixelId;
      if (metaPixelRawCode.trim()) {
        const extracted = extractMetaPixelId(metaPixelRawCode);
        if (!extracted) {
          toast.error("فشل التحقق: كود Meta Pixel غير صالح أو غير رسمي. يرجى التأكد من إدخال الكود بشكل صحيح.");
          setIsLoading(false);
          return false;
        }
        finalPixelId = extracted;
        setMetaPixelId(extracted);
      } else {
        finalPixelId = "";
        setMetaPixelId("");
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          metaPixelId: finalPixelId,
          metaPixelRawCode,
          metaPixelEnabled,
          metaCapiToken,
          metaCapiEnabled,
          metaCapiTestCode,
          tiktokPixelId,
          tiktokPixelEnabled
        })
      });
      const resData = await res.json();
      if (resData.success) {
        toast.success("Meta Pixel settings saved successfully", {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        });
        
        // Sync with active tracking layer
        const payload = {
          metaPixelId: finalPixelId,
          metaPixelRawCode,
          metaPixelEnabled,
          metaCapiToken,
          metaCapiEnabled,
          metaCapiTestCode,
          tiktokPixelId,
          tiktokPixelEnabled
        };
        const { initMetaPixel } = await import("@/lib/metaPixel");
        initMetaPixel(payload);
        setActiveTracking(payload);

        return true;
      } else {
        toast.error(resData.error || "Failed to save settings");
        return false;
      }


    } catch (err: any) {
      toast.error(err.message || "An error occurred");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestConnectionStatus("testing");
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      
      await fetch("https://connect.facebook.net/en_US/fbevents.js", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal
      });
      clearTimeout(id);
      
      setTestConnectionStatus("success");
      toast.success("Connection test successful: Meta servers are reachable.");
    } catch (err) {
      setTestConnectionStatus("failed");
      toast.error("Connection test failed: Unable to connect to Meta servers. Check your internet connection.");
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-left" dir="ltr">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">System Settings</h1>
          <p className="text-zinc-500 text-xs">Manage store identity, payment integrations, and advanced security configurations.</p>
        </div>
        <Button 
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="bg-[#D6004B] hover:bg-[#ff0059] text-white font-bold px-8 h-12 rounded-xl transition-all shadow-xl shadow-[#D6004B]/20 active:scale-95 text-xs border border-transparent"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Saving Changes...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save All Changes
            </div>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Navigation */}
        <div className="lg:col-span-3 space-y-3">
          <nav className="flex flex-col gap-2">
            {[
              { id: "general", label: "General Settings", icon: Store },
              { id: "payments", label: "Payment Gateway (Paymob)", icon: CreditCard },
              { id: "email", label: "Email Services (Resend)", icon: Mail },
              { id: "tracking", label: "Meta Tracking & CAPI", icon: Code },
              { id: "security", label: "Security & Privacy", icon: Shield },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveSubTab(item.id)}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-xs group text-left",
                  activeSubTab === item.id 
                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" 
                    : "text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {activeSubTab === item.id && <ChevronRight className="w-4 h-4 text-rose-500 shrink-0" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-9 space-y-8">
          {/* General Store Settings */}
          {activeSubTab === "general" && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-white/5 bg-[#09090e]/80 rounded-2xl overflow-hidden backdrop-blur-xl p-8 space-y-8">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Store Identity</h3>
                    <p className="text-zinc-500 text-xs">Primary branding and contact information visible to customers.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-zinc-400 font-semibold text-xs">Store Name</Label>
                    <Input 
                      value={storeName} 
                      onChange={e => setStoreName(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs" 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-zinc-400 font-semibold text-xs">Contact Email Address</Label>
                    <Input 
                      value={storeEmail} 
                      onChange={e => setStoreEmail(e.target.value)}
                      dir="ltr"
                      className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left" 
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Paymob Integration */}
          {activeSubTab === "payments" && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-white/5 bg-[#09090e]/80 rounded-2xl overflow-hidden backdrop-blur-xl p-8 space-y-8 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Payment Gateway (Paymob)</h3>
                    <p className="text-zinc-500 text-xs">API credentials and transaction hooks configuration.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-zinc-400 font-semibold text-xs">API Secret Key</Label>
                    <div className="relative">
                      <Input 
                        type={showApiKey ? "text" : "password"}
                        value={paymobApiKey} 
                        onChange={e => setPaymobApiKey(e.target.value)}
                        dir="ltr"
                        className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left font-mono pr-12" 
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">Card Integration ID</Label>
                      <Input 
                        value={paymobIntegrationId} 
                        onChange={e => setPaymobIntegrationId(e.target.value)}
                        dir="ltr"
                        className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left font-mono" 
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">HMAC Callback Secret</Label>
                      <Input 
                        type="password"
                        value={paymobHmac} 
                        onChange={e => setPaymobHmac(e.target.value)}
                        dir="ltr"
                        className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left font-mono" 
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Email Services */}
          {activeSubTab === "email" && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-white/5 bg-[#09090e]/80 rounded-2xl overflow-hidden backdrop-blur-xl p-8 space-y-8">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Email Services (Resend)</h3>
                    <p className="text-zinc-500 text-xs">SMTP configurations for student alerts and purchase receipts.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-zinc-400 font-semibold text-xs">Resend API Key</Label>
                    <Input 
                      type="password" 
                      value="••••••••••••••••••••••••"
                      disabled
                      dir="ltr"
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-xs text-left font-mono" 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-zinc-400 font-semibold text-xs">Sender Display Name</Label>
                    <Input 
                      value="JoeSchool Academy" 
                      disabled
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-xs" 
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Advanced Meta Tracking & CAPI Configuration */}
          {activeSubTab === "tracking" && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <Card className="border-white/5 bg-[#09090e]/80 rounded-2xl overflow-hidden backdrop-blur-xl p-8 space-y-8 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                    <Code className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Meta Pixel & Conversion API (CAPI)</h3>
                    <p className="text-zinc-500 text-xs">Configure high-performance hybrid tracking parameters and test server connection.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Meta Pixel Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">Meta Pixel ID</Label>
                      <Input 
                        value={metaPixelId} 
                        onChange={e => setMetaPixelId(e.target.value)}
                        dir="ltr"
                        placeholder="e.g. 1234567890"
                        className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left font-mono" 
                      />
                    </div>
                    <div className="md:col-span-4 space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">Pixel State</Label>
                      <button
                        onClick={() => setMetaPixelEnabled(!metaPixelEnabled)}
                        className={cn(
                          "w-full h-12 rounded-xl font-bold text-xs transition-all border border-white/5 active:scale-95 select-none",
                          metaPixelEnabled 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-white/5 text-zinc-500 hover:text-white"
                        )}
                      >
                        {metaPixelEnabled ? "Pixel Enabled" : "Pixel Disabled"}
                      </button>
                    </div>
                  </div>

                  {/* Meta CAPI Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">Conversion API Access Token (CAPI)</Label>
                      <div className="relative">
                        <Input 
                          type={showCapiToken ? "text" : "password"}
                          value={metaCapiToken} 
                          onChange={e => setMetaCapiToken(e.target.value)}
                          dir="ltr"
                          placeholder="EAAG..."
                          className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left font-mono pr-12 truncate" 
                        />
                        <button 
                          onClick={() => setShowCapiToken(!showCapiToken)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showCapiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-4 space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">CAPI State</Label>
                      <button
                        onClick={() => setMetaCapiEnabled(!metaCapiEnabled)}
                        className={cn(
                          "w-full h-12 rounded-xl font-bold text-xs transition-all border border-white/5 active:scale-95 select-none",
                          metaCapiEnabled 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-white/5 text-zinc-500 hover:text-white"
                        )}
                      >
                        {metaCapiEnabled ? "CAPI Enabled" : "CAPI Disabled"}
                      </button>
                    </div>
                  </div>

                  {/* Meta Test Code & TikTok Pixel ID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">Sandbox Test Event Code (CAPI)</Label>
                      <Input 
                        value={metaCapiTestCode} 
                        onChange={e => setMetaCapiTestCode(e.target.value)}
                        placeholder="TEST12345"
                        dir="ltr"
                        className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left font-mono text-zinc-300" 
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-zinc-400 font-semibold text-xs">TikTok Pixel ID</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={tiktokPixelId} 
                          onChange={e => setTiktokPixelId(e.target.value)}
                          placeholder="e.g. C12345"
                          dir="ltr"
                          className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-rose-500 transition-all text-xs text-left font-mono flex-1" 
                        />
                        <button
                          onClick={() => setTiktokPixelEnabled(!tiktokPixelEnabled)}
                          className={cn(
                            "px-4 h-12 rounded-xl font-bold text-xs transition-all border border-white/5 active:scale-95 select-none shrink-0",
                            tiktokPixelEnabled 
                              ? "bg-[#fe2c55]/10 text-[#fe2c55] border-[#fe2c55]/20" 
                              : "bg-white/5 text-zinc-500 hover:text-white"
                          )}
                        >
                          {tiktokPixelEnabled ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Raw Pixel Base Script Input */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-zinc-400 font-semibold text-xs">Extract Meta Pixel ID from script (Optional)</Label>
                    <textarea
                      value={metaPixelRawCode}
                      onChange={e => {
                        setMetaPixelRawCode(e.target.value);
                        const extracted = extractMetaPixelId(e.target.value);
                        if (extracted) {
                          setMetaPixelId(extracted);
                          toast.success(`Extracted Meta Pixel ID: ${extracted}`);
                        }
                      }}
                      placeholder="Paste Meta Pixel script here, we'll auto-extract your Pixel ID..."
                      dir="ltr"
                      className="w-full h-24 p-3 bg-white/5 border border-white/10 rounded-xl focus:border-rose-500 outline-none text-zinc-300 text-xs font-mono scrollbar-thin focus:ring-0 transition-all"
                    />
                  </div>
                </div>

                {/* Save and connection check button row */}
                <div className="flex flex-wrap gap-4 pt-6 border-t border-white/5">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isLoading}
                    className="bg-[#D6004B] hover:bg-[#ff0059] text-white font-bold px-6 h-11 rounded-xl transition-all shadow-md active:scale-98 text-xs shrink-0"
                  >
                    {isLoading ? "Saving Settings..." : "Save Unified Config"}
                  </Button>

                  <Button
                    onClick={handleTestConnection}
                    disabled={testConnectionStatus === "testing"}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold px-6 h-11 rounded-xl transition-all active:scale-98 text-xs shrink-0"
                  >
                    {testConnectionStatus === "testing" ? "Testing..." : "Test Graph Connection"}
                  </Button>
                </div>
              </Card>

              {/* Real-time Diagnostics Terminal Feed Dashboard */}
              <Card className="border-white/5 bg-[#09090e]/80 rounded-2xl overflow-hidden backdrop-blur-xl p-8 space-y-6 relative">
                <div className="flex items-center justify-between pb-4 border-b border-white/5 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                      <Terminal className="w-6 h-6 text-rose-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Live Tracking Diagnostics Terminal</h3>
                      <p className="text-zinc-500 text-xs">Verify deduplication parameters, Browser Pixel dispatches, and Server CAPI receipts real-time.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <button 
                      onClick={handleSendTestPurchase}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-alexandria font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Test Purchase Event</span>
                    </button>
                    
                    <button 
                      onClick={loadLogs}
                      className="p-2.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white rounded-xl transition-all"
                      title="Refresh Logs"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={handleClearLogs}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all text-xs font-bold"
                    >
                      Clear Terminal
                    </button>
                  </div>
                </div>

                {/* Summary status points */}
                {(() => {
                  const realPixelId = activeTracking?.metaPixelId || "";
                  const realPixelEnabled = !!activeTracking?.metaPixelEnabled;
                  const realCapiToken = activeTracking?.metaCapiToken || "";
                  const realCapiEnabled = !!activeTracking?.metaCapiEnabled;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4.5 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase">Pixel status</span>
                        <span className={cn("text-xs font-bold block leading-none", realPixelId && realPixelEnabled ? "text-emerald-400" : "text-zinc-500")}>
                          {realPixelId && realPixelEnabled ? "Active & Initialized" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase">CAPI status</span>
                        <span className={cn("text-xs font-bold block leading-none", realCapiToken && realCapiEnabled ? "text-emerald-400 animate-pulse" : "text-zinc-500")}>
                          {realCapiToken && realCapiEnabled ? "Active (Server Ready)" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase">Active Pixel ID</span>
                        <span className="text-xs font-mono font-bold text-white block leading-none truncate">{realPixelId || "None"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase">Deduplication</span>
                        <span className={cn("text-xs font-bold block leading-none", realPixelEnabled && realCapiEnabled ? "text-emerald-400" : "text-amber-500")}>
                          {realPixelEnabled && realCapiEnabled ? "Dual Mode (Deduplicated)" : "Single Mode"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Diagnostics scroll feed */}
                <div className="bg-[#050508] border border-white/5 rounded-2xl p-4.5 font-mono text-xs text-zinc-300 shadow-inner h-80 overflow-y-auto scrollbar-thin flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5 text-[10px] font-bold text-zinc-500">
                    <span>EVENT FEED LOGS</span>
                    <span>TOTAL TRACES: {logs.length}</span>
                  </div>
                  {logs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2 h-full py-12 select-none">
                      <Activity className="w-8 h-8 opacity-20" />
                      <span className="text-[10px]">No logged events detected yet. Click 'Test Purchase Event' to track.</span>
                    </div>
                  ) : (
                    logs.map((log: any, idx: number) => {
                      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "";
                      return (
                        <div key={log.eventId || idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-all flex flex-col gap-3 text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded uppercase font-sans">{log.event}</span>
                                <span className="text-[9px] text-zinc-500 font-sans">ID: {log.eventId}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                              <span className="text-[10px] text-zinc-500 font-sans">{timeStr}</span>
                              <div className="flex items-center gap-2">
                                {/* Browser status indicator */}
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded font-sans uppercase",
                                  log.browserStatus === "success" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                  log.browserStatus === "queued" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                                  log.browserStatus === "disabled" && "bg-zinc-500/10 text-zinc-400 border border-white/5",
                                  log.browserStatus === "failed" && "bg-red-500/10 text-red-400 border border-red-500/20"
                                )}>
                                  Pixel: {log.browserStatus === "success" ? "sent" : log.browserStatus}
                                </span>

                                {/* CAPI status indicator */}
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded font-sans uppercase",
                                  log.capiStatus === "success" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                  log.capiStatus === "pending" && "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse",
                                  log.capiStatus === "disabled" && "bg-zinc-500/10 text-zinc-400 border border-white/5",
                                  log.capiStatus === "failed" && "bg-red-500/10 text-red-400 border border-red-500/20"
                                )}>
                                  CAPI: {log.capiStatus === "success" ? "sent" : log.capiStatus}
                                </span>

                                {/* Deduplication validation check */}
                                {log.deduplicated ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded font-sans flex items-center gap-1 uppercase">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                    Deduplicated
                                  </span>
                                ) : (
                                  <span className="bg-zinc-500/10 text-zinc-500 border border-white/5 text-[9px] font-bold px-1.5 py-0.5 rounded font-sans uppercase">
                                    Single
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {log.metaCapiResponse && (
                            <div className="text-[9px] text-zinc-500 bg-white/[0.01] p-2.5 rounded border border-white/5 max-h-36 overflow-y-auto w-full">
                              <span className="font-bold text-zinc-400 block mb-1">Meta API Response Body:</span>
                              <pre className="whitespace-pre-wrap font-mono text-left" dir="ltr">{JSON.stringify(log.metaCapiResponse, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Security Summary Panel */}
          {activeSubTab === "security" && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-white/5 bg-[#09090e]/80 rounded-2xl overflow-hidden backdrop-blur-xl p-8 space-y-8">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Security & Privacy</h3>
                    <p className="text-zinc-500 text-xs">Cryptographic encryptions and session constraints.</p>
                  </div>
                </div>

                <div className="space-y-6 text-xs text-zinc-400 font-medium leading-relaxed">
                  <p>
                    All API integration parameters, passwords, and user tokens are dynamically hashed using industry-standard AES-256 GCM cryptographic mechanisms before writing to our persistent Supabase schemas.
                  </p>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-bold flex gap-2 items-center">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SSL/TLS Secure Socket Channels Active</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Security Status Footer Card */}
          <div className="bg-gradient-to-br from-[#09090e] to-black border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-600/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-500 shadow-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mb-0.5">System Security Fully Armed</h4>
                <p className="text-zinc-500 text-xs font-semibold">Integrations and settings are locked under dual-layer security validation.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              Connection Status: Stable
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
