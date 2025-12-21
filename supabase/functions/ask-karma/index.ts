import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const { userMessage, conversationHistory, userContext, knowledgeContext, userId } = await req.json()
    
    // Get API key from database or environment
    let GEMINI_API_KEY: string | null = null
    
    // Try to get API key from database if we have a userId
    if (userId) {
      try {
        // Get Supabase URL and keys from environment (automatically available in edge functions)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          const { data, error } = await supabase.rpc('get_api_key_for_user', { p_user_id: userId })
          
          if (!error && data) {
            GEMINI_API_KEY = data
            console.log('✅ Using API key from database for user:', userId)
          } else if (error) {
            console.log('⚠️ RPC error (will use fallback):', error.message)
          }
        }
      } catch (e) {
        console.log('⚠️ Could not fetch API key from database, using fallback:', e)
      }
    }
    
    // Fallback to global key from environment
    if (!GEMINI_API_KEY) {
      GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
      if (GEMINI_API_KEY) {
        console.log('ℹ️ Using global API key from environment (fallback)')
      }
    }
    
    if (!GEMINI_API_KEY) {
      console.error('❌ No API key available')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No API key available. Please add API keys in admin panel or contact support.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    if (!userMessage) {
      throw new Error('userMessage is required')
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Build system prompt
    const systemPrompt = `You are Karma, a friendly and knowledgeable AI assistant for Karma Terra, a skincare and haircare wellness platform. 
You provide personalized, evidence-based advice about skincare, haircare, wellness, and related topics.
${userContext ? `User context: ${JSON.stringify(userContext)}` : ''}
${knowledgeContext ? `\nKnowledge base context:\n${knowledgeContext}` : ''}`

    // Build conversation context
    const conversationContext = conversationHistory && conversationHistory.length > 0
      ? conversationHistory
          .slice(-10) // Last 10 messages for context
          .map((msg: any) => `${msg.is_user_message ? 'User' : 'Karma'}: ${msg.content}`)
          .join('\n')
      : ''

    const fullPrompt = `${systemPrompt}

${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ''}

User's current question: ${userMessage}

Please provide a comprehensive, personalized response that:
1. Directly addresses their question with specific, actionable advice
2. References their previous questions or concerns if relevant
3. Provides evidence-based recommendations
4. Suggests relevant Karma Terra products when appropriate (but don't be overly promotional)
5. Maintains a warm, friendly, and supportive tone
6. Uses simple language while being thorough
7. If discussing skincare/haircare, consider their ${userContext?.gender || 'individual'} needs
8. Includes practical tips they can implement immediately
9. Encourages follow-up questions if they need clarification

CRITICAL FORMATTING RULES:
- Write in plain text with simple formatting
- For bullet lists, use "•" or "-" at the start of lines
- For numbered lists, use "1.", "2.", "3." at the start of lines
- Use double line breaks between paragraphs
- DO NOT use markdown syntax like **, __, [], (), {}, etc.
- DO NOT use special characters or symbols except bullet points
- Keep formatting clean and simple
- Write naturally as if speaking to a friend

Keep responses between 150-300 words unless more detail is specifically requested.`

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    })

    const responseText = result.response.text()

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          text: responseText,
          metadata: {
            model: "gemini-2.0-flash",
            response_time: Date.now(),
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in ask-karma function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})


