import React, { useState } from "react";
import { Star, ShieldCheck, Sparkles, Edit3, Trash2, Eye, EyeOff, Check, X, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { Review } from "@/app/api/admin/reviews/route";
import { renderStars } from "./ReviewCard";

interface ReviewModerationTableProps {
  reviews: Review[]; // Currently filtered list
  allReviewsCount: number; // Total untruncated count
  productNames: Record<string, string>;
  onEdit: (review: Review) => void;
  onDelete: (id: string, archiveReason?: string) => void;
  onDeleteBulk: (ids: string[], archiveReason?: string) => void;
  onStatusChange: (review: Review, status: "visible" | "hidden" | "pending" | "archived") => void;
  onStatusChangeBulk: (ids: string[], status: "visible" | "hidden" | "pending" | "archived") => void;
  onFeatureBulk: (ids: string[], isFeatured: boolean) => void;

  // Server-side pagination parameters
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (size: number) => void;
}

export function ReviewModerationTable({
  reviews,
  allReviewsCount,
  productNames,
  onEdit,
  onDelete,
  onDeleteBulk,
  onStatusChange,
  onStatusChangeBulk,
  onFeatureBulk,
  serverSide,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange
}: ReviewModerationTableProps) {
  // Local state fallbacks if server-side props are not provided
  const [localPage, setLocalPage] = useState(1);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(10);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllAcross, setSelectAllAcross] = useState(false);

  const isServerPaged = serverSide === true && currentPage !== undefined && totalPages !== undefined && onPageChange !== undefined;

  const activePage = isServerPaged ? currentPage : localPage;
  const activeItemsPerPage = isServerPaged ? (itemsPerPage ?? 10) : localItemsPerPage;
  const activeOnPageChange = isServerPaged ? onPageChange : setLocalPage;
  const activeOnItemsPerPageChange = isServerPaged ? onItemsPerPageChange : setLocalItemsPerPage;

  // Paginated reviews subset
  const paginatedReviews = isServerPaged ? reviews : reviews.slice((activePage - 1) * activeItemsPerPage, activePage * activeItemsPerPage);
  
  const activeTotalPages = isServerPaged ? totalPages : Math.ceil(reviews.length / activeItemsPerPage);
  const totalReviewsCount = isServerPaged ? (totalItems ?? reviews.length) : reviews.length;

  const getProductName = (productId: string) => productNames[productId] || "Unknown";

  // Checkbox functions
  const isSelected = (id: string) => selectedIds.includes(id);

  const toggleSelect = (id: string) => {
    setSelectAllAcross(false);
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePageSelectAll = (checked: boolean) => {
    setSelectAllAcross(false);
    if (checked) {
      const pageIds = paginatedReviews.map(r => r.id);
      setSelectedIds(prev => {
        const next = [...prev];
        pageIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    } else {
      const pageIds = paginatedReviews.map(r => r.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectAllAcross = () => {
    setSelectedIds(reviews.map(r => r.id));
    setSelectAllAcross(true);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setSelectAllAcross(false);
  };

  // Check if all items on current page are selected
  const isAllPageSelected = paginatedReviews.length > 0 && paginatedReviews.every(r => selectedIds.includes(r.id));

  // Moderation triggers
  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    onStatusChangeBulk(selectedIds, "visible");
    handleClearSelection();
  };

  const handleBulkHide = () => {
    if (selectedIds.length === 0) return;
    onStatusChangeBulk(selectedIds, "hidden");
    handleClearSelection();
  };

  const handleBulkFeature = (isFeatured: boolean) => {
    if (selectedIds.length === 0) return;
    onFeatureBulk(selectedIds, isFeatured);
    handleClearSelection();
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const reason = prompt("Please enter the reason for bulk archiving (optional):") || undefined;
    if (window.confirm(`Are you sure you want to archive ${selectedIds.length} reviews?`)) {
      onDeleteBulk(selectedIds, reason);
      handleClearSelection();
    }
  };

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to restore ${selectedIds.length} reviews from the archive?`)) {
      onStatusChangeBulk(selectedIds, "pending");
      handleClearSelection();
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "visible":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans shrink-0">🟢 Active</span>;
      case "hidden":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans shrink-0">🔴 Hidden</span>;
      case "pending":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans shrink-0">⏳ Pending</span>;
      case "archived":
        return <span className="bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans shrink-0">📁 Archived</span>;
      default:
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans shrink-0">🟢 Active</span>;
    }
  };

  const selectedReviews = reviews.filter(r => selectedIds.includes(r.id));
  const hasArchivedSelected = selectedReviews.some(r => r.status === "archived");

  return (
    <div className="space-y-6 relative font-sans" dir="ltr">
      
      {/* Selection Notification Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap text-xs font-bold font-sans animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-white">Selected <span className="text-rose-500 font-mono text-sm">{selectedIds.length}</span> reviews on this page.</span>
            {!selectAllAcross && selectedIds.length < reviews.length && (
              <button 
                onClick={handleSelectAllAcross}
                className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                Select all {reviews.length} reviews matching filters?
              </button>
            )}
            {selectAllAcross && (
              <span className="text-emerald-400 font-bold">✨ Selected all matching reviews across all pages.</span>
            )}
          </div>
          <button 
            onClick={handleClearSelection}
            className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Selection</span>
          </button>
        </div>
      )}

      {/* Main Table Wrapper */}
      <div className="bg-[#09090e]/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-zinc-400 font-bold text-xs font-sans">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={(e) => handlePageSelectAll(e.target.checked)}
                    className="rounded border-zinc-700 bg-white/5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-sans">Customer</th>
                <th className="p-4 font-sans">Rating</th>
                <th className="p-4 font-sans max-w-xs">Review Text</th>
                <th className="p-4 font-sans">Linked Item</th>
                <th className="p-4 font-sans">Date Published</th>
                <th className="p-4 font-sans">Status</th>
                <th className="p-4 font-sans text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
              {paginatedReviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-zinc-500 font-bold font-sans">
                    No reviews matching the current filters.
                  </td>
                </tr>
              ) : (
                paginatedReviews.map(r => (
                  <tr 
                    key={r.id} 
                    className={`hover:bg-white/[0.01] transition-colors ${
                      isSelected(r.id) ? "bg-rose-500/[0.02]" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="rounded border-zinc-700 bg-white/5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </td>

                    {/* Customer */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <span className="font-bold text-white block">
                            {r.firstName} {r.lastName ? r.lastName.charAt(0) + "." : ""}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-bold font-sans">
                            {r.source === "manual_admin" ? "Manual Entry" : r.source === "imported" ? "Imported" : "Submitted"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Stars */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {renderStars(r.rating)}
                        <span className="font-mono text-zinc-400 text-[10px] font-bold">({r.rating.toFixed(1)})</span>
                      </div>
                    </td>

                    {/* Text snippet */}
                    <td className="p-4 max-w-xs text-left">
                      <p className="line-clamp-2 text-zinc-400 font-sans italic leading-relaxed" title={r.text}>
                        &ldquo;{r.text}&rdquo;
                      </p>
                      {r.status === "archived" && r.archiveReason && (
                        <p className="text-[10px] text-red-400 font-sans mt-1 block">
                          Archive Reason: {r.archiveReason}
                        </p>
                      )}
                    </td>

                    {/* Product name */}
                    <td className="p-4 text-zinc-400 font-sans max-w-[150px] truncate">
                      {getProductName(r.productId)}
                    </td>

                    {/* Date */}
                    <td className="p-4 font-mono text-zinc-500 text-[10px]">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      {getStatusBadge(r.status)}
                    </td>

                    {/* Quick controls */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "archived" ? (
                          <button
                            onClick={() => onStatusChange(r, "pending")}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors cursor-pointer"
                            title="Restore from archive"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            {r.status !== "visible" && (
                              <button
                                onClick={() => onStatusChange(r, "visible")}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                                title="Approve & Publish"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {r.status !== "hidden" && (
                              <button
                                onClick={() => onStatusChange(r, "hidden")}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/15 hover:text-red-400 text-zinc-400 transition-all cursor-pointer"
                                title="Hide review"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => onEdit(r)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                          title="Edit review"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (r.status === "archived") {
                              if (confirm("Are you sure you want to permanently delete this review?")) {
                                onDelete(r.id);
                              }
                            } else {
                              const reason = prompt("Please write the reason for archiving (optional):") || undefined;
                              onDelete(r.id, reason);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          title={r.status === "archived" ? "Delete Permanently" : "Archive Review"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalReviewsCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-sans pt-2 select-none">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[10px] text-zinc-500 font-bold">
              Page {activePage} of {activeTotalPages} (showing {paginatedReviews.length} of {totalReviewsCount} reviews)
            </span>
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-bold">Page size:</span>
              <select
                value={activeItemsPerPage}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  if (activeOnItemsPerPageChange) {
                    activeOnItemsPerPageChange(size);
                  }
                  activeOnPageChange(1); // Reset to page 1 on page size change
                }}
                className="bg-[#09090e] border border-white/10 rounded-lg text-zinc-400 text-[10px] px-2 py-1 outline-none cursor-pointer focus:border-rose-500/50"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size} className="bg-[#09090e] text-white">
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {activeTotalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={activePage === 1}
                onClick={() => activeOnPageChange(activePage - 1)}
                className="h-9 px-3 bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                disabled={activePage === activeTotalPages}
                onClick={() => activeOnPageChange(activePage + 1)}
                className="h-9 px-3 bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STICKY BOTTOM BULK ACTIONS CONTROL PANEL */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#09090f]/95 border border-rose-500/25 p-4 md:p-5 rounded-2xl flex items-center justify-between gap-6 shadow-[0_15px_40px_rgba(214,0,75,0.2)] backdrop-blur-2xl max-w-xl w-[90%] z-40 animate-in fade-in slide-in-from-bottom-6 duration-300 font-sans">
          <div className="flex flex-col text-left">
            <span className="text-white text-xs font-black">Bulk Actions</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Selected <span className="text-rose-500 font-mono font-black text-xs">{selectedIds.length}</span> reviews.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {hasArchivedSelected ? (
              <button
                onClick={handleBulkRestore}
                className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleBulkApprove}
                  className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={handleBulkHide}
                  className="h-9 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide</span>
                </button>
                <button
                  onClick={() => handleBulkFeature(true)}
                  className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Feature</span>
                </button>
              </>
            )}
            <button
              onClick={handleBulkDelete}
              className="h-9 px-3.5 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{hasArchivedSelected ? "Delete" : "Archive"}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
