"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring" as const, stiffness: 450, damping: 24 } 
  },
};

export function SocialLinks() {
  const links = [
    {
      name: "Facebook",
      url: "https://www.facebook.com/profile.php?id=61579261893006",
      label: "صفحة فيسبوك الرسمية",
      hoverClass: "hover:text-blue-500 hover:bg-blue-600/10 hover:border-blue-500/30 hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]",
      icon: (
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110">
          <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
        </svg>
      )
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/youssefautomates/",
      label: "حساب إنستغرام الرسمي",
      hoverClass: "hover:text-pink-500 hover:bg-gradient-to-tr hover:from-pink-500/10 hover:to-violet-500/10 hover:border-pink-500/30 hover:shadow-[0_0_25px_rgba(236,72,153,0.35)]",
      icon: (
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110">
          <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM402.5 344.2c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
        </svg>
      )
    },
    {
      name: "TikTok",
      url: "https://tiktok.com/@youssef.automates",
      label: "حساب تيك توك الرسمي",
      hoverClass: "hover:text-[#00f2fe] hover:bg-[#00f2fe]/5 hover:border-cyan-500/30 hover:shadow-[0_0_25px_rgba(0,242,254,0.35)]",
      icon: (
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110">
          <path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25v178.72A162.55 162.55 0 1 1 185 188.31v89.89a72.69 72.69 0 1 0 52.23 69.89V0h89.89a109.28 109.28 0 0 0 109.32 109.32v89.89a107.5 107.5 0 0 1-11.44 10.7z" />
        </svg>
      )
    }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      className="flex items-center justify-center lg:justify-start gap-4 select-none"
    >
      {links.map((link) => (
        <motion.a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.1, transition: { type: "spring" as const, stiffness: 500, damping: 20 } }}
          whileTap={{ scale: 0.95 }}
          className={`group w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 backdrop-blur-md transition-all duration-150 relative overflow-hidden cursor-pointer active:scale-95 ${link.hoverClass}`}
        >
          {/* Subtle hover background sweep */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <span className="relative z-10">
            {link.icon}
          </span>
        </motion.a>
      ))}
    </motion.div>
  );
}
