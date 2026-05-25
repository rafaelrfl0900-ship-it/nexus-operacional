export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface SessionData {
  accessToken: string;
  user: SessionUser;
}

const localAdminEmail = process.env.NEXT_PUBLIC_LOCAL_ADMIN_EMAIL ?? "admin@nexus.local";
const localAdminPassword = process.env.NEXT_PUBLIC_LOCAL_ADMIN_PASSWORD ?? "ChangeMe!2026";
const localAdminName = process.env.NEXT_PUBLIC_LOCAL_ADMIN_NAME ?? "Administrador Nexus";
const localAdminDefaultEnabled = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API_URL);
const localAdminEnabled = (process.env.NEXT_PUBLIC_ENABLE_LOCAL_ADMIN ?? String(localAdminDefaultEnabled)) === "true";

export function createLocalAdminSession(email: string, password: string): SessionData | null {
  if (!localAdminEnabled) return null;
  if (email.trim().toLowerCase() !== localAdminEmail.toLowerCase() || password !== localAdminPassword) return null;

  return {
    accessToken: "local-admin-session",
    user: {
      id: "local-admin",
      email: localAdminEmail,
      name: localAdminName,
      roles: ["ADMIN"]
    }
  };
}

export function isNetworkAuthError(error: unknown) {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return /failed to fetch|network|load failed|fetch/i.test(error.message);
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate: 30 } });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function apiPost<T>(path: string, payload: unknown, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function apiPostClient<T>(path: string, payload: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : "Nao foi possivel concluir a operacao.";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function apiGetClient<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : "Nao foi possivel carregar os dados.";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function apiPatchClient<T>(path: string, payload: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : "Nao foi possivel atualizar o registro.";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function apiDeleteClient<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message : "Nao foi possivel remover o registro.";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function saveSession(session: SessionData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("nexus-session", JSON.stringify(session));
}

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("nexus-session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    window.localStorage.removeItem("nexus-session");
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("nexus-session");
}
