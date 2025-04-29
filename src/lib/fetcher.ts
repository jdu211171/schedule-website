

export class CustomError extends Error {
  info: Record<string, unknown>;
  status: number;

  constructor(message: string, info: Record<string, unknown>, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const info = await res.json();
    const status = res.status;
    const error = new CustomError("An error occurred while fetching the data.", info, status);
    throw error;
  }

  return res.json();
}
