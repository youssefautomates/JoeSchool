"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search, Edit, Trash2, Image as ImageIcon, UploadCloud, FileText, FileArchive, FileJson, X, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [status, setStatus] = useState("نشط");
  const [isFeatured, setIsFeatured] = useState(false);
  
  // Media & Files States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [digitalFiles, setDigitalFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const digitalFilesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("store_products");
    if (saved) {
      setProducts(JSON.parse(saved));
    } else {
      const initialProducts = [
        { id: 1, title: "حزمة أتمتة خدمة العملاء الذكية", price: "49.00", originalPrice: "99.00", status: "نشط", sales: 124, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800", isFeatured: true, files: [] },
        { id: 2, title: "دليل بناء بوت تليجرام متقدم", price: "39.00", originalPrice: "79.00", status: "نشط", sales: 89, image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800", isFeatured: false, files: [] },
      ];
      setProducts(initialProducts);
      localStorage.setItem("store_products", JSON.stringify(initialProducts));
    }
  }, []);

  const saveProducts = (newProducts: any[]) => {
    setProducts(newProducts);
    localStorage.setItem("store_products", JSON.stringify(newProducts));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDigitalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setDigitalFiles(prevFiles => [...prevFiles, ...files]);
            toast.success(`تم رفع ${files.length} ملفات بنجاح`);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  };

  const removeDigitalFile = (index: number) => {
    setDigitalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="w-8 h-8 text-red-400" />;
    if (type.includes("zip") || type.includes("rar")) return <FileArchive className="w-8 h-8 text-amber-400" />;
    if (type.includes("json")) return <FileJson className="w-8 h-8 text-blue-400" />;
    if (type.includes("video")) return <PlayCircle className="w-8 h-8 text-emerald-400" />;
    return <FileText className="w-8 h-8 text-zinc-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddProduct = () => {
    if (!title || !price) {
      toast.error("الرجاء إدخال اسم المنتج والسعر");
      return;
    }

    const newProduct = {
      id: Date.now(),
      title,
      price,
      originalPrice,
      status,
      sales: 0,
      image: imagePreview || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800",
      isFeatured,
      // Store mock files info
      files: digitalFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    };

    saveProducts([...products, newProduct]);
    toast.success("تم إضافة المنتج بنجاح");
    resetForm();
    setIsAddOpen(false);
  };

  const handleEditProduct = () => {
    if (!title || !price || !editingProduct) return;

    const updatedProducts = products.map(p => 
      p.id === editingProduct.id ? { 
        ...p, 
        title, 
        price, 
        originalPrice, 
        status, 
        image: imagePreview || p.image,
        isFeatured,
        files: digitalFiles.length > 0 ? digitalFiles.map(f => ({ name: f.name, size: f.size, type: f.type })) : p.files
      } : p
    );

    saveProducts(updatedProducts);
    toast.success("تم تحديث المنتج بنجاح");
    resetForm();
    setIsEditOpen(false);
  };

  const handleDeleteProduct = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      const updatedProducts = products.filter(p => p.id !== id);
      saveProducts(updatedProducts);
      toast.success("تم حذف المنتج");
    }
  };

  const openEditDialog = (product: any) => {
    setEditingProduct(product);
    setTitle(product.title || product.name);
    setPrice(product.price);
    setOriginalPrice(product.originalPrice || "");
    setStatus(product.status);
    setIsFeatured(product.isFeatured || false);
    setImagePreview(product.image);
    setDigitalFiles([]); // Reset files, in reality we'd fetch existing files
    setUploadProgress(0);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setPrice("");
    setOriginalPrice("");
    setStatus("نشط");
    setIsFeatured(false);
    setImagePreview(null);
    setDigitalFiles([]);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (digitalFilesRef.current) digitalFilesRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-alexandria font-bold text-white">إدارة المنتجات الرقمية</h1>
        
        {/* ADD PRODUCT DIALOG */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button onClick={resetForm} className="bg-indigo-600 hover:bg-indigo-700 text-white font-cairo">
              <Plus className="w-4 h-4 mr-2" />
              إضافة منتج جديد
            </Button>
          } />
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-alexandria text-xl">منتج رقمي جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4 font-cairo">
              <div className="space-y-2">
                <Label className="text-zinc-300">اسم المنتج</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: حزمة أتمتة المبيعات" className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-white" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">السعر (ج.م)</Label>
                  <Input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="49.00" className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-white" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">السعر قبل الخصم (ج.م)</Label>
                  <Input value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} type="number" placeholder="99.00" className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-white" dir="ltr" />
                </div>
              </div>

              {/* Cover Image Upload */}
              <div className="space-y-2">
                <Label className="text-zinc-300">صورة الغلاف (Thumbnail)</Label>
                <div 
                  className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:bg-zinc-900/50 transition-colors cursor-pointer relative overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Preview" fill className="object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto mb-2 group-hover:text-indigo-400 transition-colors" />
                  )}
                  <p className="text-zinc-400 font-cairo text-sm relative z-10">اضغط لرفع صورة العرض</p>
                </div>
              </div>

              {/* Digital Files Drag & Drop Upload */}
              <div className="space-y-2">
                <Label className="text-zinc-300">الملفات الرقمية للتسليم (PDF, ZIP, JSON)</Label>
                <div 
                  className="border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 rounded-xl p-8 text-center hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  onClick={() => digitalFilesRef.current?.click()}
                >
                  <input type="file" ref={digitalFilesRef} className="hidden" multiple accept=".pdf,.zip,.rar,.json,.mp4" onChange={handleDigitalFilesChange} />
                  <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                  <p className="text-indigo-300 font-cairo font-bold">اسحب الملفات هنا أو اضغط للرفع</p>
                  <p className="text-zinc-500 font-cairo text-xs mt-2">الحد الأقصى 500MB للملف الواحد</p>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}

                {/* Uploaded Files List */}
                {digitalFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {digitalFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.type || file.name)}
                          <div>
                            <p className="text-white text-sm font-cairo font-bold truncate max-w-[200px]" dir="ltr">{file.name}</p>
                            <p className="text-zinc-500 text-xs font-cairo">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button onClick={() => removeDigitalFile(idx)} className="text-zinc-500 hover:text-red-400 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">حالة المنتج</Label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                    className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-800 text-white font-cairo px-3 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="نشط">نشط (مرئي)</option>
                    <option value="مسودة">مسودة (مخفي)</option>
                  </select>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center space-x-2 space-x-reverse h-10">
                    <input 
                      type="checkbox" 
                      id="featured" 
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="featured" className="text-zinc-300 cursor-pointer">تمييز كالأكثر مبيعاً</Label>
                  </div>
                </div>
              </div>

            </div>
            <DialogFooter>
              <DialogClose render={
                <Button variant="ghost" className="text-zinc-400 hover:text-white font-cairo">إلغاء</Button>
              } />
              <Button onClick={handleAddProduct} className="bg-indigo-600 hover:bg-indigo-700 text-white font-cairo">حفظ المنتج</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="font-cairo text-zinc-400 text-right">المنتج</TableHead>
              <TableHead className="font-cairo text-zinc-400 text-right">السعر</TableHead>
              <TableHead className="font-cairo text-zinc-400 text-right">المبيعات</TableHead>
              <TableHead className="font-cairo text-zinc-400 text-right">الحالة</TableHead>
              <TableHead className="font-cairo text-zinc-400 text-right">الملفات</TableHead>
              <TableHead className="text-left"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-zinc-800 relative overflow-hidden shrink-0 border border-zinc-700">
                      <Image 
                        src={product.image || product.img} 
                        alt="Product" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-cairo font-bold text-white flex items-center gap-2">
                        {product.title || product.name}
                        {product.isFeatured && <Badge className="bg-indigo-500/10 text-indigo-400 text-[10px] px-1.5 py-0">مميز</Badge>}
                      </div>
                      <div className="text-xs text-zinc-500 font-cairo mt-1">ID: {product.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-white font-sans">{product.price} ج.م</TableCell>
                <TableCell className="text-zinc-400">{product.sales}</TableCell>
                <TableCell>
                  <Badge className={
                    product.status === "نشط" 
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                      : "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20"
                  }>
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {product.files?.length > 0 ? (
                      <Badge className="bg-blue-500/10 text-blue-400 font-sans">{product.files.length} Files</Badge>
                    ) : (
                      <span className="text-zinc-600 text-xs">لا يوجد</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 font-cairo">
                      <DropdownMenuItem onClick={() => openEditDialog(product)} className="text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">
                        <Edit className="w-4 h-4 ml-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)} className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer">
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-zinc-500 font-cairo">
                  لا توجد منتجات حالياً.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* EDIT PRODUCT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-alexandria text-xl">تعديل المنتج</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4 font-cairo">
            <div className="space-y-2">
              <Label className="text-zinc-300">اسم المنتج</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-white" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">السعر (ج.م)</Label>
                <Input value={price} onChange={e => setPrice(e.target.value)} type="number" className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-white" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">السعر قبل الخصم (ج.م)</Label>
                <Input value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} type="number" className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-white" dir="ltr" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">صورة الغلاف (Thumbnail)</Label>
              <div 
                className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:bg-zinc-900/50 transition-colors cursor-pointer relative overflow-hidden group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" fill className="object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto mb-2 group-hover:text-indigo-400 transition-colors" />
                )}
                <p className="text-zinc-400 font-cairo text-sm relative z-10">اضغط لتغيير الصورة</p>
              </div>
            </div>

            {/* Digital Files Drag & Drop Upload */}
            <div className="space-y-2">
              <Label className="text-zinc-300">إضافة/تحديث الملفات الرقمية</Label>
              <div 
                className="border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 rounded-xl p-6 text-center hover:bg-indigo-500/10 transition-colors cursor-pointer"
                onClick={() => digitalFilesRef.current?.click()}
              >
                <input type="file" ref={digitalFilesRef} className="hidden" multiple accept=".pdf,.zip,.rar,.json,.mp4" onChange={handleDigitalFilesChange} />
                <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-indigo-300 font-cairo font-bold text-sm">اسحب الملفات هنا أو اضغط للرفع</p>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden">
                  <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              {/* Uploaded Files List */}
              {digitalFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {digitalFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type || file.name)}
                        <div>
                          <p className="text-white text-sm font-cairo font-bold truncate max-w-[200px]" dir="ltr">{file.name}</p>
                          <p className="text-zinc-500 text-xs font-cairo">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button onClick={() => removeDigitalFile(idx)} className="text-zinc-500 hover:text-red-400 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">حالة المنتج</Label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value)}
                  className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-800 text-white font-cairo px-3 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="نشط">نشط (مرئي)</option>
                  <option value="مسودة">مسودة (مخفي)</option>
                </select>
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center space-x-2 space-x-reverse h-10">
                  <input 
                    type="checkbox" 
                    id="edit_featured" 
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="edit_featured" className="text-zinc-300 cursor-pointer">تمييز كالأكثر مبيعاً</Label>
                </div>
              </div>
            </div>

          </div>
          <DialogFooter>
            <DialogClose render={
              <Button variant="ghost" className="text-zinc-400 hover:text-white font-cairo">إلغاء</Button>
            } />
            <Button onClick={handleEditProduct} className="bg-indigo-600 hover:bg-indigo-700 text-white font-cairo">حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
