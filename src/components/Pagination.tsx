import React from 'react';
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  className,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) {
    return null; // Don't show pagination if there's only one page or no items
  }

  const getPageNumbers = () => {
    const pageNumbers: (number | 'ellipsis')[] = [];
    const maxPagesToShow = 5; // Number of page links to show directly

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) {
          pageNumbers.push('ellipsis');
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push('ellipsis');
        }
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <ShadcnPagination className={cn("flex justify-center", className)} dir="ltr">
      <PaginationContent>
        <PaginationItem>
          {/* Use conditional rendering for Previous button */}
          {currentPage === 1 ? (
            <PaginationPrevious className="pointer-events-none opacity-50" />
          ) : (
            <PaginationPrevious onClick={() => onPageChange(currentPage - 1)} />
          )}
        </PaginationItem>
        {pageNumbers.map((pageNumber, index) => (
          <PaginationItem key={index}>
            {pageNumber === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => onPageChange(pageNumber as number)}
                isActive={pageNumber === currentPage}
              >
                {pageNumber}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          {/* Use conditional rendering for Next button */}
          {currentPage === totalPages ? (
            <PaginationNext className="pointer-events-none opacity-50" />
          ) : (
            <PaginationNext onClick={() => onPageChange(currentPage + 1)} />
          )}
        </PaginationItem>
      </PaginationContent>
    </ShadcnPagination>
  );
};