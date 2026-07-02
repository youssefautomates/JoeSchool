"use client";

import { motion } from "framer-motion";
import { 
  Database, Sparkles, Package, BookOpen, 
  ArrowRight, PlusCircle, Lightbulb 
} from "lucide-react";

interface OnboardingStep {
  title: string;
  desc: string;
  icon: any;
  actionLabel?: string;
  onClick?: () => void;
}

interface AnalyticsEmptyStateProps {
  title: string;
  description: string;
  icon?: any;
  onboardingSteps?: OnboardingStep[];
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
}

export default function AnalyticsEmptyState({
  title,
  description,
  icon: Icon = Database,
  onboardingSteps,
  primaryAction
}: AnalyticsEmptyStateProps) {
  
  const defaultSteps: OnboardingStep[] = [
    {
      title: "Generate Telemetry Data",
      desc: "Inject mock transactions, courses, and clickstream events instantly to see the analytics panel in action.",
      icon: Sparkles,
      actionLabel: "Generate Mock Telemetry"
    },
    {
      title: "Publish LMS Course",
      desc: "Navigate to the courses panel and publish a new course to activate student progress metrics and completion funnels.",
      icon: BookOpen
    },
    {
      title: "Add Digital Products",
      desc: "Register digital files, prompt guides, or PDF checklists in the store panel to unlock digital product analytics.",
      icon: Package
    }
  ];

  const stepsToRender = onboardingSteps || defaultSteps;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-3xl bg-slate-50/80 border border-zinc-200/60 p-6 sm:p-10 shadow-sm border border-zinc-200/60 relative overflow-hidden text-center max-w-4xl mx-auto"
    >
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#1D4ED8]/5 blur-[80px] pointer-events-none rounded-full" />

      {/* Main Empty State Content */}
      <div className="flex flex-col items-center max-w-lg mx-auto space-y-4 mb-10 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 flex items-center justify-center shadow-sm border border-zinc-200/60 relative group">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-tr from-brand-500/20 to-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <Icon className="w-6 h-6 text-[#1D4ED8]" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 tracking-tight">{title}</h3>
          <p className="text-[10px] sm:text-xs text-zinc-500 font-medium leading-relaxed">{description}</p>
        </div>

        {primaryAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={primaryAction.onClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1D4ED8] text-white font-bold text-xs shadow-sm border border-zinc-200/60 hover:shadow-[#1D4ED8]/20 transition-all border border-[#1D4ED8]/20"
          >
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
            {primaryAction.label}
          </motion.button>
        )}
      </div>

      {/* Onboarding Guidance Cards */}
      <div className="space-y-4 relative z-10 text-left" dir="ltr">
        <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Quickstart Guide &amp; Platform Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stepsToRender.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-zinc-50/40 hover:bg-zinc-50/70 border border-zinc-200/60 hover:border-zinc-200 transition-all flex flex-col justify-between text-left"
              >
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 flex items-center justify-center shrink-0">
                    <StepIcon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-900 leading-snug">{step.title}</h4>
                    <p className="text-[9px] text-zinc-500 font-medium leading-relaxed mt-1">{step.desc}</p>
                  </div>
                </div>

                {step.actionLabel && (
                  <button 
                    onClick={step.onClick || primaryAction?.onClick}
                    className="flex items-center gap-1 text-[9px] font-bold text-[#1D4ED8] hover:text-[#ff3883] transition-colors mt-3 group"
                  >
                    {step.actionLabel}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
