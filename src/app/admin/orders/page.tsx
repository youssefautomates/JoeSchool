"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Eye, Download, Filter, Loader2, RefreshCw, MoreVertical, ExternalLink, Calendar, User, CreditCard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchOrders(1);
  }, []); // eslint-disable-line

  async function fetchOrders(pageNumber = 1, isLoadMore = false) {
    console.log(`[DEBUG] fetchOrders CALLED. Page: ${pageNumber}`);
    if (!isLoadMore) setIsLoading(true);
    try {
      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_email, product_title, amount, status, payment_id, created_at")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      if (data) {
        setHasMore(data.length === PAGE_SIZE);
        if (isLoadMore) {
          setOrders(prev => [...prev, ...data]);
        } else {
          setOrders(data);
        }
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("فشل تحميل الطلبات");
    } finally {
      setIsLoading(false);
    }
  }

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage, true);
  };

  const handleResendEmail = (email: string) => {
    toast.success(`تم إرسال رسالة التحميل مجدداً إلى ${email}`);
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.payment_id?.includes(searchQuery)
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-alexandria font-black text-white mb-3 tracking-tight">لوحة تحكم الطلبات</h1>
          <p className="text-zinc-400 font-cairo text-lg">إدارة المبيعات، تتبع حالات الدفع، وأتمتة تسليم المنتجات الرقمية.</p>
        </div>
        <Button 
          onClick={() => { setPage(1); fetchOrders(1); }} 
          variant="outline" 
          className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white font-cairo h-12 px-6 rounded-xl transition-all"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <RefreshCw className="w-5 h-5 ml-2" />}
          تحديث البيانات
        </Button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all" />
          <p className="text-zinc-500 font-cairo mb-1">إجمالي المبيعات</p>
          <h3 className="text-3xl font-alexandria font-black text-white">
            {orders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toFixed(2)} ج.م
          </h3>
          <div className="mt-4 flex items-center text-emerald-400 text-sm font-cairo">
            <Sparkles className="w-4 h-4 ml-1" />
            +12% عن الشهر الماضي
          </div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
          <p className="text-zinc-500 font-cairo mb-1">الطلبات المكتملة</p>
          <h3 className="text-3xl font-alexandria font-black text-white">
            {orders.filter(o => o.status === 'completed').length}
          </h3>
          <div className="mt-4 flex items-center text-zinc-500 text-sm font-cairo">
            من إجمالي {orders.length} طلب
          </div>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all" />
          <p className="text-zinc-500 font-cairo mb-1">معدل التحويل</p>
          <h3 className="text-3xl font-alexandria font-black text-white">
            {orders.length > 0 ? ((orders.filter(o => o.status === 'completed').length / orders.length) * 100).toFixed(1) : 0}%
          </h3>
          <div className="mt-4 flex items-center text-amber-400 text-sm font-cairo">
            أداء مستقر
          </div>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 shadow-2xl overflow-hidden rounded-[2rem]">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input 
              type="text" 
              placeholder="ابحث بالاسم، الإيميل أو رقم الطلب..." 
              className="bg-zinc-950 border-zinc-800 pl-4 pr-12 text-white font-cairo h-14 rounded-2xl focus:ring-rose-600 focus:border-rose-600 transition-all text-lg shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 h-14 rounded-2xl font-cairo flex-1 lg:flex-none px-6">
              <Filter className="w-5 h-5 ml-2" />
              تصفية النتائج
            </Button>
            <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 h-14 rounded-2xl font-cairo flex-1 lg:flex-none px-6">
              <Download className="w-5 h-5 ml-2" />
              تصدير CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-950/30">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-right text-zinc-400 font-cairo py-6 pr-8 uppercase text-xs tracking-widest">تفاصيل الطلب</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo py-6 uppercase text-xs tracking-widest">العميل</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo py-6 uppercase text-xs tracking-widest">المنتج</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo py-6 uppercase text-xs tracking-widest">الحالة</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo py-6 uppercase text-xs tracking-widest">التاريخ</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-rose-600 mb-6" />
                    <p className="text-zinc-400 font-cairo text-lg animate-pulse">جاري جلب البيانات من Supabase...</p>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24 text-zinc-500 font-cairo text-lg">
                    {searchQuery ? "لم نجد أي طلبات تطابق بحثك." : "لا توجد طلبات مسجلة حتى الآن."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, idx) => (
                  <motion.tr 
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-zinc-800 hover:bg-zinc-800/40 transition-all cursor-pointer group"
                  >
                    <TableCell className="py-6 pr-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white font-alexandria mb-1 text-base tracking-tight">#{order.payment_id || order.id?.slice(0, 8)}</div>
                          <div className="text-rose-400 text-sm font-bold">{order.amount} {order.currency || 'ج.م'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-cairo text-white font-bold text-base mb-1">{order.customer_name}</span>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-sans" dir="ltr">
                          <Mail className="w-3 h-3" />
                          {order.customer_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300 font-cairo text-sm max-w-[200px] truncate" title={order.product_title}>
                      {order.product_title}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        order.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 px-3 py-1 rounded-lg font-cairo' 
                          : order.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20 px-3 py-1 rounded-lg font-cairo'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20 px-3 py-1 rounded-lg font-cairo'
                      }>
                        {order.status === 'completed' ? 'تم الدفع' : order.status === 'pending' ? 'قيد الانتظار' : 'فشل الدفع'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 font-cairo text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 opacity-50" />
                        <span dir="ltr">{formatDate(order.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="pl-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-10 w-10 p-0 text-zinc-500 hover:bg-zinc-800 hover:text-white rounded-xl flex items-center justify-center outline-none transition-all">
                          <MoreVertical className="h-5 w-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300 font-cairo w-64 p-2 rounded-2xl shadow-2xl">
                          <DropdownMenuItem className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white rounded-xl p-3">
                            <Eye className="w-5 h-5 ml-3 text-rose-400" /> عرض تفاصيل الطلب
                          </DropdownMenuItem>
                          {order.status === 'completed' && (
                            <DropdownMenuItem 
                              className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white rounded-xl p-3"
                              onClick={() => handleResendEmail(order.customer_email)}
                            >
                              <Mail className="w-5 h-5 ml-3 text-emerald-400" /> إعادة إرسال روابط التحميل
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-zinc-800 my-1" />
                          <DropdownMenuItem className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white rounded-xl p-3">
                            <Download className="w-5 h-5 ml-3 text-amber-400" /> تحميل الفاتورة
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white rounded-xl p-3">
                            <ExternalLink className="w-5 h-5 ml-3 text-zinc-500" /> فتح في Paymob
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="bg-rose-600/10 border border-rose-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-600/20">
            <Rocket className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-alexandria font-bold text-white text-xl mb-1">جاهز للتوسع؟</h4>
            <p className="text-zinc-400 font-cairo">جميع عمليات الدفع مؤمنة ومشفرة بالكامل عبر Paymob.</p>
          </div>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700 text-white font-alexandria font-bold px-10 h-14 rounded-2xl shadow-xl shadow-rose-600/20 transition-all active:scale-95">
          إضافة منتج جديد
        </Button>
      </div>
    </div>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}

function Rocket({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.5-1 1-4c2 0 3.27 1 4 2z"/>
      <path d="M12 15v5s1 .5 4 1c0-2-1-3.27-2-4z"/>
      <path d="m15 5 4 4"/>
    </svg>
  );
}
