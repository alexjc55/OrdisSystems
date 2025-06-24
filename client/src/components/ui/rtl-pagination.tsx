import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RTLPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isRTL?: boolean;
  showingText?: string;
  ofText?: string;
  className?: string;
}

export function RTLPagination({
  currentPage,
  totalPages,
  total,
  itemsPerPage,
  onPageChange,
  isRTL = false,
  showingText = "Показано",
  ofText = "из",
  className = ""
}: RTLPaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, total);

  const buttonClasses = "h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  const mobileButtonClasses = "h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center";

  return (
    <div className={`px-4 py-3 border-t bg-gray-50 ${className}`}>
      {/* Mobile Layout */}
      <div className="sm:hidden">
        <div className="flex flex-col items-center gap-3">
          {/* Info Text */}
          <div 
            className="text-center text-xs text-gray-600 leading-tight"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div>{showingText} {startItem}-{endItem}</div>
            <div>{ofText} {total}</div>
          </div>
          
          {/* Navigation Controls */}
          <div className={`flex items-center justify-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              title={isRTL ? "עמוד ראשון" : "Первая страница"}
              className={mobileButtonClasses}
            >
              {isRTL ? '⟩⟩' : '⟨⟨'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              title={isRTL ? "עמוד קודם" : "Предыдущая страница"}
              className={mobileButtonClasses}
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            
            <div 
              className="text-sm font-medium px-3 bg-white border border-orange-500 rounded h-9 flex items-center justify-center min-w-[60px]" 
              dir="ltr"
            >
              {currentPage}/{totalPages}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              title={isRTL ? "עמוד הבא" : "Следующая страница"}
              className={mobileButtonClasses}
            >
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              title={isRTL ? "עמוד אחרון" : "Последняя страница"}
              className={mobileButtonClasses}
            >
              {isRTL ? '⟨⟨' : '⟩⟩'}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span dir={isRTL ? 'rtl' : 'ltr'}>
            {showingText} {startItem}-{endItem} {ofText} {total}
          </span>
        </div>
        
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title={isRTL ? "עמוד ראשון" : "Первая страница"}
            className={buttonClasses}
          >
            {isRTL ? '⟩⟩' : '⟨⟨'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            title={isRTL ? "עמוד קודם" : "Предыдущая страница"}
            className={buttonClasses}
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          
          <span 
            className="text-sm font-medium px-3 py-1 bg-white border border-orange-500 rounded h-8 flex items-center"
            dir="ltr"
          >
            {currentPage} {isRTL ? 'מתוך' : 'из'} {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            title={isRTL ? "עמוד הבא" : "Следующая страница"}
            className={buttonClasses}
          >
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title={isRTL ? "עמוד אחרון" : "Последняя страница"}
            className={buttonClasses}
          >
            {isRTL ? '⟨⟨' : '⟩⟩'}
          </Button>
        </div>
      </div>
    </div>
  );
}