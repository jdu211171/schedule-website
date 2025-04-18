import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20]
}: PaginationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setIsOpen(false);
    
    if (value === itemsPerPage) return;
    
    onItemsPerPageChange(value);
    
    // Рассчитываем новую страницу, чтобы сохранить примерную позицию просмотра
    const firstItemOnCurrentPage = (currentPage - 1) * itemsPerPage + 1;
    const newPage = Math.max(1, Math.ceil(firstItemOnCurrentPage / value));
    onPageChange(Math.min(newPage, Math.ceil(totalItems / value)));
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  if (totalItems === 0) return null;

  return (
    <div className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-500">
          {`${startItem}-${endItem} / ${totalItems}件`}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">表示:</span>
          
          {/* Кастомный стилизованный селект */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="flex h-8 w-16 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setIsOpen(!isOpen)}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
            >
              <span>{itemsPerPage}</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            
            {isOpen && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80">
                <ul className="py-1">
                  {itemsPerPageOptions.map((option) => (
                    <li
                      key={option}
                      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                        option === itemsPerPage ? "bg-accent/50" : ""
                      }`}
                      onClick={() => handleItemsPerPageChange(option)}
                      role="option"
                      aria-selected={option === itemsPerPage}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevPage}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}