import Link from "next/link";
import { Button } from "./ui/button";
import { ShoppingBag, ChevronLeft } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <span className="font-alexandria font-bold text-xl tracking-tight text-white" dir="ltr">
            Youssef <span className="text-indigo-400">Automates</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 font-cairo text-sm font-medium text-zinc-300">
          <Link href="#features" className="hover:text-white transition-colors">المميزات</Link>
          <Link href="#products" className="hover:text-white transition-colors">المنتجات</Link>
          <Link href="#faq" className="hover:text-white transition-colors">الأسئلة الشائعة</Link>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden sm:flex text-zinc-300 hover:text-white" render={
            <Link href="/login" className="w-full h-full flex items-center justify-center">تسجيل الدخول</Link>
          } />
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-cairo" render={
            <Link href="#products" className="w-full h-full flex items-center justify-center">
              تصفح المنتجات
              <ChevronLeft className="w-4 h-4 mr-2" />
            </Link>
          } />
        </div>
      </div>
    </nav>
  );
}
