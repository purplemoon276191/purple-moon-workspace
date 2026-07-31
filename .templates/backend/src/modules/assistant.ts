import { Router, Request, Response } from 'express'

export const assistantRouter = Router()

/**
 * AI assistant endpoint.
 *
 * If CODEBUDDY_API_KEY is configured and the @codebuddy/sdk package is
 * installed, this route bridges to the real CodeBuddy Agent SDK.
 * Otherwise it returns { mode: 'offline' } and the frontend uses its
 * built-in, context-aware offline helper so the assistant always works.
 */
assistantRouter.post('/assistant', async (req: Request, res: Response) => {
  const message = (req.body?.message as string) ?? ''
  if (!message.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  const apiKey = process.env.CODEBUDDY_API_KEY
  if (apiKey) {
    try {
      // Best-effort bridge to the CodeBuddy Agent SDK (installed on demand).
      const mod = (await import('@codebuddy/sdk')) as any
      if (mod && typeof mod.query === 'function') {
        const reply = await mod.query({ apiKey, message, context: req.body?.context })
        res.json({ reply: typeof reply === 'string' ? reply : JSON.stringify(reply) })
        return
      }
    } catch {
      // SDK not available — fall back to offline mode below.
    }
  }

  res.json({ mode: 'offline' })
})
