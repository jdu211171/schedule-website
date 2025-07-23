// src/lib/fetcher.ts
import { CustomError } from './custom-error';

export { CustomError };

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
    const error = new CustomError("An error occurred while fetching the data.", status, info);
    throw error;
  }

  return await res.json();
}

export async function fetcherWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Get selected branch from localStorage or other client-side storage
  const selectedBranchId = localStorage.getItem("selectedBranchId") || "";

  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Selected-Branch": selectedBranchId,
      ...options?.headers,
    },
  });

  return res;
}
