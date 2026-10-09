const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, '')

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.')
  }

  const payload = await response.json().catch(() => null) as { mensagem?: string; erro?: string } | null
  if (!response.ok) {
    throw new Error(payload?.mensagem ?? payload?.erro ?? `A API respondeu com erro (${response.status}).`)
  }
  return payload as T
}

export function sendJson(method: 'POST' | 'PUT' | 'DELETE', body?: unknown): RequestInit {
  return { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }
}

export function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
