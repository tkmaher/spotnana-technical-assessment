import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Bindings = {
  GEMINI_API_KEY: string
  CHAT_SESSIONS: KVNamespace  
}

const app = new Hono<{ Bindings: Bindings }>()

const verifyHeader = (req) => {
  const authHeader = req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  } else {
    return ""
  }
}

// OPTIONS endpoint for fielding CORS requests

app.use('/chat', cors())

// GET endpoint for getting history

app.get('/chat', async (c) => {
  const sessionId = verifyHeader(c.req)
  if (sessionId != "") {
    const stored = await c.env.CHAT_SESSIONS.get(sessionId)
    const chatHistory = stored ? JSON.parse(stored) : []
    return c.json({ history: chatHistory })
  } else {
    return c.json({ error: 'sessionId is required' }, 400)
  }
})

// DELETE endpoint for deleting history

app.delete('/chat', async (c) => {
  const sessionId = verifyHeader(c.req)
  if (sessionId != "") {
    await c.env.CHAT_SESSIONS.delete(sessionId)
    return c.json({ msg: "deletion successful!" })
  } else {
    return c.json({ error: 'sessionId is required' }, 400)
  }
})

// POST endpoint for updating history

app.post('/chat', async (c) => {
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' })

  const { message } = await c.req.json()

  const sessionId = verifyHeader(c.req)
  if (sessionId == "")
    return c.json({ error: 'sessionId is required' }, 400)

  const stored = await c.env.CHAT_SESSIONS.get(sessionId)
  const chatHistory = stored ? JSON.parse(stored) : []

  const chat = model.startChat({
    history: chatHistory,
    generationConfig: { maxOutputTokens: 1000 },
  })

  const result = await chat.sendMessage(message)
  const updatedHistory = await chat.getHistory()

  await c.env.CHAT_SESSIONS.put(
    sessionId,
    JSON.stringify(updatedHistory),
    { expirationTtl: 60 * 60 * 24 * 30 }
  )

  return c.json({ response: result.response.text() })
})

export default app