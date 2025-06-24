import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isRTL?: boolean;
  showingText?: string;
  ofText?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  total,
  itemsPerPage,
  onPageChange,
  isRTL = false,
  showingText = "Показано",
  ofText = "из"
}: SimplePaginationProps) {
  // Always show at least the info, but only show navigation if there are multiple pages
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, total);

  return (
    <div className="px-4 py-3 border-t bg-gray-50">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        <div className="flex flex-col items-center gap-3">
          {/* Info Text */}
          <div className="text-center text-xs text-gray-600 leading-tight">
            <div>{showingText} {startItem}-{endItem}</div>
            <div>{ofText} {total}</div>
          </div>
          
          {/* Navigation Controls - only show if multiple pages */}
          {totalPages > 1 && (
            <div className={`flex items-center justify-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50"
              >
                ⟨⟨
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-sm font-medium px-3 bg-white border border-orange-500 rounded h-9 flex items-center justify-center min-w-[60px]">
                {currentPage}/{totalPages}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50"
              >
                ⟩⟩
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>{showingText} {startItem}-{endItem} {ofText} {total}</span>
        </div>
        
        {/* Navigation Controls - only show if multiple pages */}
        {totalPages > 1 && (
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              ⟨⟨
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium px-3 py-1 bg-white border border-orange-500 rounded h-8 flex items-center">
              {currentPage} из {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              ⟩⟩
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}