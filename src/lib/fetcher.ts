// src/lib/fetcher.ts
export class CustomError extends Error {
  info: Record<string, unknown>;
  status: number;

  constructor(message: string, info: Record<string, unknown>, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

export async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Get selected branch from localStorage or other client-side storage
  // This assumes you'll store the selected branch ID when user makes a selection
  const selectedBranchId = localStorage.getItem("selectedBranchId") || "";

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Selected-Branch": selectedBranchId,
      ...options?.headers,
    },
  });

  // console.log("fetcher", url, options, res);

  if (!res.ok) {
    const info = await res.json();
    const status = res.status;
    const error = new CustomError("An error occurred while fetching the data.", info, status);
    throw error;
  }

  return await res.json();
}
