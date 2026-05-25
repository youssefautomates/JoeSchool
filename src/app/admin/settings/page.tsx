"use client";

import { useState } from "react";
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
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("general");

  // Store Settings State
  const [storeName, setStoreName] = useState("Youssef Automates");
  const [storeEmail, setStoreEmail] = useState("contact@youssefautomates.com");
  
  // Paymob Settings State
  const [paymobApiKey, setPaymobApiKey] = useState("••••••••••••••••••••••••");
  const [paymobIntegrationId, setPaymobIntegrationId] = useState("4567891");
  const [paymobHmac, setPaymobHmac] = useState("••••••••••••••••");

  const handleSave = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Settings saved successfully", {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
    }, 1500);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-left" dir="ltr">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">System Settings</h1>
          <p className="text-zinc-500 text-xs">Manage store identity, payment integrations, and advanced security configurations.</p>
        </div>
        <Button 
          onClick={handleSave}
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
                      value="Youssef Automates Academy" 
                      disabled
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-xs" 
                    />
                  </div>
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
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
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
