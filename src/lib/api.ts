export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * The access code travels in the link, so a shared URL just works. This is
 * obfuscation against crawlers, not security: it is visible to anyone who
 * looks. See DEPLOY.md.
 */
export function accessCode(): string {
  return new URLSearchParams(window.location.search).get('k') ?? ''
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-demo-key': accessCode(),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'could not reach the server')
  }

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new ApiError(
      response.status,
      detail?.error ?? `the request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

export async function generateSketch(prompt: string): Promise<string> {
  const { code } = await post<{ code: string }>('/api/generate', { prompt })
  return code
}

export type PlanItem = {
  property: string
  description: string
}

export type Plan = {
  summary: string
  change: PlanItem[]
  preserve: PlanItem[]
}

export function planModification(
  code: string,
  request: string,
): Promise<Plan> {
  return post<Plan>('/api/plan', { code, request })
}

export type ApprovedPlan = {
  approvedChanges: PlanItem[]
  preserved: PlanItem[]
  extraInstruction: string
}

export async function applyModification(
  code: string,
  request: string,
  approved: ApprovedPlan,
): Promise<string> {
  const result = await post<{ code: string }>('/api/apply', {
    code,
    request,
    ...approved,
  })
  return result.code
}
