export const paginate = (page: number, limit: number) => ({ skip: (page - 1) * limit, take: limit });

export const toPaginated = <T>(items: T[], total: number, page: number, limit: number) => ({
  items,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});
