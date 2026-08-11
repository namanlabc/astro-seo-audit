export const DASHBOARD_PAGE_SIZE = 30;

export type PaginationItem = number | "ellipsis";

export function paginationItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const page = Math.max(1, Math.min(currentPage, totalPages));
  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);

  if (page <= 4) end = 5;
  if (page >= totalPages - 3) start = totalPages - 4;

  const items: PaginationItem[] = [1];
  if (start > 2) items.push("ellipsis");
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}
