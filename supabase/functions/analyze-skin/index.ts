import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@0.24.1"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SKIN_PARAMETERS = [
  'Skin Type',
  'Skin Tone',
  'Glow',
  'Ageing',
  'Dark Spots',
  'Under Eye',
  'Crow''s Feet',
  'Tan',
  'Pigmentation',
  'Sebum'
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const { userData, faceImages, userId } = await req.json()
    
    // Create Supabase client to fetch API key from database
    // Use service role key to bypass RLS for secure key lookup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get API key from database (secure server-side lookup)
    // This uses the get_api_key_for_user function which handles round-robin or user assignments
    let GEMINI_API_KEY: string | null = null
    
    if (userId) {
      try {
        const { data, error } = await supabase.rpc('get_api_key_for_user', { p_user_id: userId })
        if (!error && data) {
          GEMINI_API_KEY = data
          console.log('✅ Using API key from database for user:', userId)
        }
      } catch (e) {
        console.log('⚠️ Could not fetch API key from database, using fallback:', e)
      }
    }
    
    // Fallback to global key from environment
    if (!GEMINI_API_KEY) {
      GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
      console.log('ℹ️ Using global API key (fallback)')
    }
    
    if (!GEMINI_API_KEY) {
      throw new Error('No API key available. Please contact support or add API keys in admin panel.')
    }

    if (!userData || !faceImages || !Array.isArray(faceImages)) {
      throw new Error('Invalid request: userData and faceImages are required')
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const generationConfig = {
      temperature: 0.4,
      topP: 1,
      topK: 32,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    }

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]

    // Extract and validate skin-specific data
    const skinData = userData || {}
    
    // Ensure userData has required fields with defaults
    const safeUserData = {
      age: userData?.age || 30,
      gender: userData?.gender || 'Not specified',
      city: userData?.city || 'Unknown',
      state: userData?.state || 'Unknown',
      country: userData?.country || 'Unknown',
      profession: userData?.profession || '',
      workingTime: userData?.workingTime || '',
      acUsage: userData?.acUsage || '',
      smoking: userData?.smoking || '',
      waterQuality: userData?.waterQuality || 'Unknown',
    }
    
    const primaryConcern = Array.isArray(skinData.primarySkinConcern) 
      ? skinData.primarySkinConcern.join(', ')
      : (skinData.primarySkinConcern || 'Aging')
    const skinType = skinData.skinType || 'Normal'
    const skinTone = skinData.skinTone || 'Medium'
    const glow = skinData.glow || 'Moderate Glow'
    const middayFeel = skinData.middaySkinFeel || 'Neither smooth nor rough'
    const sunscreen = skinData.sunscreenUsage || 'I do not apply sunscreen'
    const activity = skinData.physicalActivity || 'Sometimes'
    const sleep = skinData.sleepingHabits || 'Moderate Sleep'
    const treatment = skinData.skinTreatment || 'None'
    
    console.log('📊 User data extracted:', {
      age: safeUserData.age,
      gender: safeUserData.gender,
      primaryConcern,
      skinType,
      skinTone
    })

    // Build the full detailed prompt
    const textPrompt = `
You are an expert AI dermatologist analyzing skin conditions by combining visual image analysis with user self-reported data. Your analysis must follow a systematic, clinical reasoning approach.

=== ANALYSIS METHODOLOGY: THREE-PHASE APPROACH ===

PHASE 1: PURE VISUAL IMAGE ANALYSIS
First, analyze ONLY what you can see in the provided facial image(s). Ignore all questionnaire data temporarily.
- Systematically examine each skin parameter: ${SKIN_PARAMETERS.join(', ')}
- Describe exactly what is VISIBLE: colors, textures, patterns, irregularities
- Rate each parameter based SOLELY on visual evidence (1-10 scale)
- Note image quality, lighting conditions, and any limitations
- Be specific: "Visible dark spots on left cheek, approximately 3-4mm diameter"
- Document what you CANNOT see clearly due to image quality or lighting

PHASE 2: QUESTIONNAIRE DATA REVIEW
Review the user's self-reported information:
- Primary Skin Concern: ${primaryConcern}
- Skin Type: ${skinType}
- Skin Tone: ${skinTone}
- Skin Glow: ${glow}
- Midday Skin Feel: ${middayFeel}
- Sunscreen Usage: ${sunscreen}
- Physical Activity: ${activity}
- Sleeping Habits: ${sleep}
- Skin Treatments: ${treatment}
${safeUserData.profession ? `- Profession: ${safeUserData.profession}` : ''}
${safeUserData.workingTime ? `- Working Hours: ${safeUserData.workingTime}` : ''}
${safeUserData.acUsage ? `- AC Usage: ${safeUserData.acUsage}` : ''}
${safeUserData.smoking ? `- Smoking: ${safeUserData.smoking}` : ''}
${safeUserData.waterQuality ? `- Water Quality: ${safeUserData.waterQuality}` : ''}

User Demographics:
- Age: ${safeUserData.age}
- Gender: ${safeUserData.gender}
- Location: ${safeUserData.city}, ${safeUserData.state}, ${safeUserData.country}

PHASE 3: CROSS-VALIDATION & INTEGRATED ANALYSIS
This is the critical phase where you reconcile visual findings with user reports:

For EACH skin parameter (${SKIN_PARAMETERS.join(', ')}), perform:

A. VISUAL FINDING: What did you see in the image?
   - Be precise and specific
   - Rate: X/10 based on visual evidence
   
B. USER CONCERN: Does the user report this issue?
   - If reported in primary concerns (${primaryConcern}), acknowledge it
   
C. DISCREPANCY ANALYSIS (if visual and reported don't match):
   
   SCENARIO 1: User reports concern (e.g., "Dark Spots") but NOT clearly visible in image
   - DO NOT dismiss the concern. Explain possible reasons:
     * Early stage condition not yet visible in standard lighting
     * Faded/treated condition (they mentioned treatment: ${treatment})
     * Condition may be more visible under different conditions (UV light, different angles)
     * Image quality/lighting limitations preventing clear visualization
     * User may perceive subtle changes not captured in photo
     * Skin tone "${skinTone}": Some hyperpigmentation patterns are harder to detect in standard lighting on certain skin tones
     * Condition may be more apparent in natural sunlight or under different lighting conditions
   - ADJUSTMENT: Rate based on visual evidence BUT acknowledge user concern in description
   - RECOMMENDATION: Still provide targeted recommendations for reported concern
   - EXAMPLE RESPONSE: "Visual analysis shows minimal dark spots visible (rating 3/10). However, you've reported dark spots as a primary concern. This discrepancy could indicate: (1) subtle hyperpigmentation not fully captured in this lighting, (2) improvement from previous treatments, (3) condition more visible under different conditions, or (4) on ${skinTone} skin tone, some hyperpigmentation patterns may be subtler in standard imaging. I recommend products targeting hyperpigmentation regardless."
   
   SCENARIO 2: Visible condition NOT reported by user
   - Clearly identify what you see
   - Provide rating based on visual evidence
   - Mention in description: "I notice [condition] that wasn't mentioned in your concerns. This may be something to monitor."
   - Provide recommendations
   
   SCENARIO 3: Visual and user report AGREE
   - Confirm agreement: "Visual analysis confirms your concern about [issue]"
   - Provide rating based on visual evidence
   - Provide targeted recommendations

D. INTEGRATED RATING:
   - Start with visual-based rating
   - If user reports concern strongly but visual shows less severity, you may adjust rating upward by 1-2 points to reflect user experience
   - ALWAYS explain adjustments in the description field
   - Format: "Visual rating: X/10. Adjusted to Y/10 due to [reason]"

E. CONTEXTUAL FACTORS INTEGRATION:
   - Consider how lifestyle factors affect the concern:
     * Age ${safeUserData.age}: Natural aging processes
     * Sunscreen usage "${sunscreen}": Protection level impacts dark spots, tanning
     * Skin tone "${skinTone}": Affects visibility of certain conditions
     * Skin type "${skinType}": Determines treatment approach
     * Water quality "${safeUserData.waterQuality}": Can affect skin barrier
     * AC usage: Can cause dryness
     * Sleep "${sleep}": Affects skin repair and appearance

F. SEVERITY ASSESSMENT:
   For each parameter, determine severity:
   - Mild (1-3): Minor concern, easily managed
   - Medium (4-7): Noticeable concern requiring attention
   - Severe (8-10): Significant concern requiring professional consultation

=== CRITICAL INSTRUCTIONS ===

1. NEVER IGNORE USER-REPORTED CONCERNS, even if not visible
   - If user says "dark spots" but image doesn't show them clearly, still address it
   - Explain WHY it might not be visible while acknowledging their experience
   - This applies to ALL skin tones, ages, genders, and conditions
   
2. ALWAYS EXPLAIN DISCREPANCIES transparently
   - Don't just report what you see
   - Explain possible reasons for mismatches
   - Build trust through transparency
   - Consider that some conditions present differently across skin tones
   
3. USE CLINICAL REASONING ACROSS ALL DEMOGRAPHICS
   - Reference how age, skin type, lifestyle factors influence conditions
   - Connect multiple data points (e.g., poor sunscreen usage + reported dark spots = higher risk)
   - Consider that certain conditions are less visible on darker skin tones (e.g., redness, inflammation)
   - Adjust analysis methodology based on user's skin tone "${skinTone}" - some conditions may be harder to detect visually on darker skin
   - Age ${safeUserData.age}: Different age groups have different skin concerns and healing abilities
   - Gender ${safeUserData.gender}: Consider hormonal factors that may affect skin conditions
   
4. PROVIDE ACTIONABLE RECOMMENDATIONS FOR EVERYONE
   - Base recommendations on BOTH visual analysis AND user concerns
   - If user reports issue strongly, recommend treatment even if visual shows mild severity
   - Personalize based on skin type, age, lifestyle factors
   - Ensure recommendations work for all skin tones and types
   - Consider accessibility and availability of recommended products across different regions

5. HANDLE IMAGE LIMITATIONS HONESTLY
   - If image quality is poor, say so
   - If lighting conditions limit analysis, acknowledge it
   - If certain areas aren't visible, mention it
   - Suggest re-capturing images if needed
   - NOTE: Some conditions are inherently harder to detect in standard lighting, especially on darker skin tones - acknowledge this limitation

6. UNIVERSAL APPLICABILITY & BIAS PREVENTION
   - Analyze without assumptions based on skin tone, age, gender, or ethnicity
   - Use the same clinical reasoning approach for everyone
   - Recognize that certain conditions may present differently:
     * Darker skin tones: Redness/inflammation may appear as purple/brown/gray instead of red
     * Darker skin tones: Hyperpigmentation patterns may be more subtle in standard lighting
     * All skin tones: Early-stage conditions may not be visible yet
     * All ages: Skin concerns vary but deserve equal attention
   - When skin tone is "${skinTone}", consider that standard imaging may not capture all nuances
   - Never assume severity based on appearance alone - always integrate user-reported data

=== OUTPUT FORMAT ===

Provide a comprehensive JSON response with this structure:

{
  "summary": "Comprehensive assessment addressing: (1) Visual findings, (2) User-reported concerns (${primaryConcern}), (3) Any discrepancies and explanations, (4) Overall skin health status considering age ${safeUserData.age}, skin type ${skinType}, skin tone ${skinTone}, and lifestyle factors. Address the primary concern directly while integrating visual evidence.",
  
  "overallSeverity": "Mild" | "Medium" | "Severe" (based on highest rated parameter or user concern if not visible),
  
  "parameters": [
    {
      "category": "${SKIN_PARAMETERS[0]}",
      "rating": <1-10 number>,
      "severity": "Mild" | "Medium" | "Severe" | "N/A",
      "description": "<CRITICAL: Must include>
        - Visual findings: What you see (or don't see clearly)
        - User concern match: Does this align with their reported concerns (${primaryConcern})?
        - Discrepancy explanation (if any): Why might visual and user report differ?
        - Contextual factors: How age, skin type, lifestyle affect this parameter
        - Recommendation reasoning: Why these specific recommendations"
    }
    // Repeat for all parameters: ${SKIN_PARAMETERS.join(', ')}
  ],
  
  "routine": {
    "morning": [
      "Step 1: Personalized for skin type ${skinType}, addressing ${primaryConcern}",
      "Step 2: Considering sunscreen usage pattern (${sunscreen})",
      "Step 3: Age-appropriate care for ${safeUserData.age} years old",
      "Step 4: Additional steps based on visual findings AND user concerns"
    ],
    "evening": [
      "Step 1: Personalized for skin type ${skinType}, addressing ${primaryConcern}",
      "Step 2: Repair-focused considering sleep habits (${sleep})",
      "Step 3: Treatment for reported concerns, even if mild in images",
      "Step 4: Additional steps integrating all factors"
    ]
  }
}

=== SPECIAL HANDLING FOR COMMON SCENARIOS ===

Scenario A: User reports "Dark Spots" but image shows minimal visible spots
- Visual rating: 3/10 (minimal visible)
- User concern: HIGH (reported as primary concern)
- Description: "Visual analysis shows minimal dark spots (rating 3/10). However, you've identified dark spots as a primary concern. Possible explanations: (1) Hyperpigmentation may be subtle and not fully captured in standard lighting, (2) Previous treatments (${treatment}) may have faded visible marks, (3) Spots may be more apparent under UV light or in natural sunlight. Based on your concern AND lifestyle factors (sunscreen usage: ${sunscreen}), I recommend: Vitamin C serum in morning, niacinamide in evening, daily broad-spectrum sunscreen, and quarterly dermatologist consultation."
- Adjusted rating: 5/10 (acknowledging user experience while respecting visual evidence)

Scenario B: Image shows significant "Crow's Feet" but user didn't report it
- Visual rating: 7/10 (moderate-visible crow's feet)
- User concern: NOT explicitly reported
- Description: "Visual analysis detects moderate crow's feet (rating 7/10), particularly around the outer corners of the eyes. While this wasn't listed in your primary concerns, it's visible in the analysis. Given your age (${safeUserData.age}) and [lifestyle factors], I recommend preventative anti-aging routine: Retinol at night, peptide serums, eye creams with peptides, and increased hydration."

Scenario C: Image and user report AGREE on concern
- Visual rating: 8/10 (severe visible)
- User concern: HIGH (reported)
- Description: "Visual analysis confirms your concern about [issue]. Rating 8/10 - this is clearly visible and requires attention. [Provide targeted treatment recommendations]"

=== FINAL NOTES ===

- Be empathetic and professional with ALL users regardless of skin tone, age, gender, or background
- Use plain language while maintaining medical accuracy
- Always explain your reasoning
- Build trust through transparency about discrepancies
- Provide actionable, personalized recommendations that work for everyone
- When in doubt between visual and user report, lean toward addressing user concerns while explaining visual findings
- Recognize that skin analysis must be equitable and accurate across all skin tones (Fair, Light, Medium, Tan, Dark, Deep)
- Some conditions are inherently harder to detect visually on darker skin tones - this is a known medical limitation, not user error
- Age, gender, and lifestyle factors affect skin differently - account for these in analysis
- The methodology must work universally: same systematic approach, adjusted for individual characteristics
`

    // Validate and convert base64 images to parts
    if (!faceImages || faceImages.length === 0) {
      throw new Error('No face images provided for analysis')
    }

    console.log('📸 Processing images:', { count: faceImages.length })
    
    const imageParts = faceImages.map((img: string, index: number) => {
      try {
        if (!img || typeof img !== 'string') {
          throw new Error(`Invalid image data at index ${index}`)
        }

        const base64Data = img.includes(',') ? img.split(',')[1] : img

        if (!base64Data || base64Data.length < 100) {
          throw new Error(`Image data too short at index ${index}`)
        }

        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        }
      } catch (imgError) {
        console.error(`❌ Error processing image ${index}:`, imgError)
        throw new Error(`Failed to process image ${index + 1}: ${imgError.message}`)
      }
    })

    console.log('✅ Image parts prepared:', imageParts.length)

    console.log('🚀 Calling Gemini API for skin analysis...')
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [...imageParts, { text: textPrompt }] }],
      generationConfig,
      safetySettings,
    })

    console.log('✅ Received response from Gemini API')
    
    const raw = result.response.text().trim()
    console.log('📄 Raw response length:', raw.length)
    
    if (!raw || raw.length === 0) {
      throw new Error('Empty response received from AI model')
    }

    // Try multiple extraction methods
    let maybeJson = raw
    
    // Method 1: Extract from markdown code blocks
    const codeBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) {
      maybeJson = codeBlockMatch[1]
      console.log('📄 Extracted JSON from code block')
    } else {
      // Method 2: Extract JSON object from text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        maybeJson = jsonMatch[0]
        console.log('📄 Extracted JSON from text')
      }
    }
    
    if (!maybeJson || maybeJson.length === 0) {
      console.error('❌ No JSON found in response')
      console.error('❌ Full raw response:', raw.substring(0, 500))
      throw new Error('AI response does not contain valid JSON data')
    }

    console.log('📄 Extracted JSON (first 500 chars):', maybeJson.substring(0, 500))

    let analysisResult
    try {
      analysisResult = JSON.parse(maybeJson)
      console.log('✅ Successfully parsed JSON response')
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      console.error('❌ JSON string (first 1000 chars):', maybeJson.substring(0, 1000))
      throw new Error(`Failed to parse JSON response: ${parseError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, data: analysisResult }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('❌ Error in analyze-skin function:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error name:', error.name)
    console.error('❌ Error status:', error.status)
    
    // Handle specific error types
    let errorMessage = 'Internal server error'
    let statusCode = 500
    let retryAfter: number | undefined
    
    // Check for Gemini API quota errors
    if (error.status === 429 || error.message?.includes('429') || 
        error.message?.includes('quota') || 
        error.message?.includes('Quota exceeded')) {
      statusCode = 429
      
      // Try to extract retry delay from error details
      if (error.errorDetails) {
        const retryInfo = error.errorDetails.find((detail: any) => 
          detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        )
        if (retryInfo?.retryDelay) {
          // Parse retry delay (format: "18s" or "18.9s")
          const delayMatch = retryInfo.retryDelay.match(/(\d+(?:\.\d+)?)s?/)
          if (delayMatch) {
            retryAfter = Math.ceil(parseFloat(delayMatch[1]))
          }
        }
      }
      
      // Extract retry delay from message if available
      if (!retryAfter && error.message) {
        const retryMatch = error.message.match(/retry in ([\d.]+)s/i)
        if (retryMatch) {
          retryAfter = Math.ceil(parseFloat(retryMatch[1]))
        }
      }
      
      if (error.message?.includes('free_tier') || error.message?.includes('FreeTier')) {
        errorMessage = `AI service quota exceeded. ${retryAfter ? `Please try again in ${retryAfter} seconds.` : 'Please wait a few minutes and try again, or check your API plan and billing details.'}`
      } else {
        errorMessage = `AI service is currently at capacity. ${retryAfter ? `Please try again in ${retryAfter} seconds.` : 'Please wait a few minutes and try again.'}`
      }
    } else if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      errorMessage = 'API configuration error. Please contact support.'
      statusCode = 500
    } else if (error.message?.includes('safety') || error.message?.includes('blocked') || error.message?.includes('SAFETY')) {
      errorMessage = 'Content was blocked by safety filters. Please try with different images.'
      statusCode = 400
    } else if (error.message?.includes('GEMINI_API_KEY is not configured')) {
      errorMessage = 'API configuration error. Please contact support.'
      statusCode = 500
    } else {
      errorMessage = error.message || 'Failed to analyze skin'
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        retryAfter: retryAfter,
        statusCode: statusCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      },
    )
  }
})


