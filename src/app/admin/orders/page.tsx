"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Eye, Download, Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function AdminOrders() {
  const orders = [
    { id: "ORD-7352", customer: "محمد أحمد", email: "mohamed@example.com", phone: "+966500000000", product: "حزمة أتمتة الرد التلقائي", amount: "49.00 ج.م", status: "مكتمل", date: "2026-05-13 10:30" },
    { id: "ORD-7351", customer: "خالد عبدالله", email: "khalid@example.com", phone: "+966500000001", product: "دليل بناء بوت تليجرام", amount: "39.00 ج.م", status: "مكتمل", date: "2026-05-13 09:15" },
    { id: "ORD-7350", customer: "سارة محمد", email: "sara@example.com", phone: "+966500000002", product: "حزمة أتمتة الرد التلقائي", amount: "49.00 ج.م", status: "فشل الدفع", date: "2026-05-12 18:45" },
    { id: "ORD-7349", customer: "فهد عبدالرحمن", email: "fahad@example.com", phone: "+966500000003", product: "حزمة أتمتة الرد التلقائي", amount: "49.00 ج.م", status: "مكتمل", date: "2026-05-12 14:20" },
  ];

  const handleResendEmail = (email: string) => {
    toast.success(`تم إرسال رسالة التحميل مجدداً إلى ${email}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-alexandria font-bold text-white mb-2">الطلبات</h1>
        <p className="text-zinc-400 font-cairo">إدارة الطلبات وعمليات الدفع وإعادة إرسال الملفات للعملاء.</p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input 
              type="text" 
              placeholder="ابحث بالاسم، الإيميل أو رقم الطلب..." 
              className="bg-zinc-950 border-zinc-800 pl-4 pr-10 text-white font-cairo h-10 focus-visible:ring-indigo-500"
            />
          </div>
          
          <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 w-full sm:w-auto font-cairo">
            <Filter className="w-4 h-4 mr-2" />
            تصفية الطلبات
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-right text-zinc-400 font-cairo">الطلب</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo">العميل</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo">المنتج</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo">الحالة</TableHead>
                <TableHead className="text-right text-zinc-400 font-cairo">التاريخ</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <TableCell>
                    <div className="font-medium text-white font-alexandria mb-1">{order.id}</div>
                    <div className="text-indigo-400 text-xs font-sans">{order.amount}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-cairo text-white">{order.customer}</div>
                    <div className="text-xs text-zinc-500 font-sans" dir="ltr">{order.email}</div>
                    <div className="text-xs text-zinc-500 font-sans" dir="ltr">{order.phone}</div>
                  </TableCell>
                  <TableCell className="text-zinc-300 font-cairo max-w-[200px] truncate" title={order.product}>
                    {order.product}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      order.status === 'مكتمل' 
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    }>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400 font-cairo text-sm">
                    <span dir="ltr">{order.date}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                          <span className="sr-only">فتح القائمة</span>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M8.625 2.5C8.625 3.12132 8.12132 3.625 7.5 3.625C6.87868 3.625 6.375 3.12132 6.375 2.5C6.375 1.87868 6.87868 1.375 7.5 1.375C8.12132 1.375 8.625 1.87868 8.625 2.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM7.5 13.625C8.12132 13.625 8.625 13.1213 8.625 12.5C8.625 11.8787 8.12132 11.375 7.5 11.375C6.87868 11.375 6.375 11.8787 6.375 12.5C6.375 13.1213 6.87868 13.625 7.5 13.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300 font-cairo">
                        <DropdownMenuItem className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white">
                          <Eye className="w-4 h-4 ml-2" /> عرض التفاصيل
                        </DropdownMenuItem>
                        {order.status === 'مكتمل' && (
                          <DropdownMenuItem 
                            className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white"
                            onClick={() => handleResendEmail(order.email)}
                          >
                            <Mail className="w-4 h-4 ml-2" /> إعادة إرسال الملف
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white">
                          <Download className="w-4 h-4 ml-2" /> تحميل الفاتورة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
