export class SecretRequestError extends Error {
   constructor(
      readonly status: number,
      readonly data: Record<string, unknown> = {}
   ) {
      super(`Request failed with status ${status}`)
   }
}

async function failure(response: Response): Promise<SecretRequestError> {
   const body = await response.json().catch(() => ({}))
   return new SecretRequestError(response.status, body?.data ?? {})
}

const CREATE_ATTEMPTS = 3

export async function createSecret(content: SecretContent, pin?: string): Promise<string> {
   for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
      const master = generateMasterKey()
      const keys = await deriveSecretKeys(master, pin)
      const response = await fetch('/', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/octet-stream',
            'X-Secret-Id': await deriveSecretId(master),
            'X-Read-Token': keys.readToken,
            'X-Delete-Token': keys.deleteToken,
            'X-Pin': pin ? '1' : '0',
         },
         body: await sealSecret(content, keys.encryptionKey),
      })
      if (response.status === 409) continue
      if (!response.ok) throw await failure(response)
      return `${(await response.text()).trim()}#${toBase64Url(master)}`
   }
   throw new SecretRequestError(409)
}

export async function fetchSecretInfo(id: string): Promise<SecretInfo | null> {
   const response = await fetch(`/api/secrets/${id}/info`)
   if (response.status === 404) return null
   if (!response.ok) throw await failure(response)
   return response.json()
}

export async function revealSecret(id: string, keys: SecretKeys): Promise<SecretContent> {
   const response = await fetch(`/api/secrets/${id}`, {
      headers: { 'X-Read-Token': keys.readToken },
   })
   if (!response.ok) throw await failure(response)
   return openSecret(new Uint8Array(await response.arrayBuffer()), keys.encryptionKey)
}

export async function destroySecret(id: string, keys: SecretKeys): Promise<void> {
   const response = await fetch(`/api/secrets/${id}`, {
      method: 'DELETE',
      headers: { 'X-Delete-Token': keys.deleteToken },
   })
   if (!response.ok && response.status !== 404) throw await failure(response)
}

export function formatDate(timestamp: number): string {
   return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
   }).format(timestamp)
}
