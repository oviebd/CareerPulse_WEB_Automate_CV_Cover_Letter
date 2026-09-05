/** Client-side fetch helper for same-origin API routes. */
export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new ApiError(
      json.error ?? `Request failed (HTTP ${res.status})`,
      res.status,
      json.code
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
