import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@0.24.1"
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
    const { userData, hairImages, questionnaireAnswers, userId } = await req.json()
    
    // Create Supabase client to fetch API key from database
    // Use service role key to bypass RLS for secure key lookup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get API key from database (secure server-side lookup)
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

    if (!userData || !hairImages || !Array.isArray(hairImages)) {
      throw new Error('Invalid request: userData and hairImages are required')
    }

    if (hairImages.length < 2) {
      throw new Error('Please provide both front and top view images for hair analysis')
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

    // Extract hair questionnaire data
    const hairQuestionnaire = questionnaireAnswers || {}
    const hairType = hairQuestionnaire.hairType || 'Straight'
    const hairTexture = hairQuestionnaire.hairTexture || 'Fine'
    const hairThickness = hairQuestionnaire.hairThickness || 'Medium'
    const scalpCondition = hairQuestionnaire.scalpCondition || 'Normal'
    const washingFrequency = hairQuestionnaire.washingFrequency || 'Daily'
    const hairCareProducts = hairQuestionnaire.hairCareProducts || 'Shampoo and conditioner'
    const chemicalTreatments = hairQuestionnaire.chemicalTreatments || 'None'
    const heatStylingFrequency = hairQuestionnaire.heatStylingFrequency || 'Never'
    const stressLevel = hairQuestionnaire.stressLevel || 'Low'
    const waterQuality = hairQuestionnaire.waterQuality || 'Good'

    // Build the full detailed prompt
    const textPrompt = `
You are an expert AI trichologist analyzing hair conditions by combining visual image analysis with user self-reported data. Your analysis must follow a systematic, clinical reasoning approach.

=== ANALYSIS METHODOLOGY: THREE-PHASE APPROACH ===

PHASE 1: PURE VISUAL IMAGE ANALYSIS
First, analyze ONLY what you can see in the provided hair images (front view and top view). Ignore all questionnaire data temporarily.
- Systematically examine each hair parameter: Density/Thickness, Scalp Health, Texture/Quality, Potential Issues (dandruff, dryness, damage, hair loss), Growth Patterns
- Analyze BOTH images (front and top views) individually and compare findings
- Describe exactly what is VISIBLE: hair density, scalp visibility, hair texture, shine/luster, frizz, damage patterns, thinning areas, growth patterns
- Note image quality, lighting conditions, and any limitations (hair styling, products, etc.)
- Be specific: "Visible thinning at crown area, approximately 20% density reduction compared to front hairline"
- Document what you CANNOT see clearly due to image quality, lighting, or hair styling
- For scalp analysis: Note visibility, color, any visible flakes, redness, or oiliness
- For hair density: Compare visible scalp area vs. hair coverage
- For texture/quality: Assess visible shine, frizz, damage (split ends, breakage), curl pattern consistency

PHASE 2: QUESTIONNAIRE DATA REVIEW
Review the user's self-reported information:
- Hair Type: ${hairType}
- Hair Texture: ${hairTexture}
- Hair Thickness: ${hairThickness}
- Scalp Condition: ${scalpCondition}
- Washing Frequency: ${washingFrequency}
- Hair Care Products: ${hairCareProducts}
- Chemical Treatments: ${chemicalTreatments}
- Heat Styling Frequency: ${heatStylingFrequency}
- Stress Level: ${stressLevel}
- Water Quality: ${waterQuality}

User Demographics:
- Age: ${userData.age}
- Gender: ${userData.gender}
- Location: ${userData.city}, ${userData.state}, ${userData.country}

PHASE 3: CROSS-VALIDATION & INTEGRATED ANALYSIS
This is the critical phase where you reconcile visual findings with user reports:

For EACH hair parameter, perform:

A. VISUAL FINDING: What did you see in the images?
   - Be precise and specific about what's visible
   - Note discrepancies between front and top views
   - Describe visual evidence clearly
   
B. USER REPORT: What did the user report?
   - Hair Type: ${hairType}, Texture: ${hairTexture}, Thickness: ${hairThickness}
   - Scalp Condition: ${scalpCondition}
   - Potential concerns: Assess based on their reported scalp condition, washing frequency, chemical treatments, etc.
   
C. DISCREPANCY ANALYSIS (if visual and reported don't match):
   
   SCENARIO 1: User reports concern (e.g., "Thinning hair") but NOT clearly visible in images
   - DO NOT dismiss the concern. Explain possible reasons:
     * Early stage thinning not yet visible in standard photos
     * Hair styling or products may conceal the issue
     * Lighting conditions may not reveal thinning clearly
     * Thinning may be more apparent in person or under different angles
     * Hair type "${hairType}" may make certain issues harder to detect visually
     * User may perceive changes that aren't yet visible in photos
     * Stress level "${stressLevel}" can cause temporary hair loss that may not be visible yet
     * Age ${userData.age}: Natural hair changes may be perceived before becoming visually apparent
   - ADJUSTMENT: Acknowledge user concern in analysis and recommendations
   - RECOMMENDATION: Provide targeted recommendations for reported concern regardless of visual severity
   - EXAMPLE RESPONSE: "Visual analysis shows moderate hair density (rating 6/10). However, you've reported concerns about hair thickness ('${hairThickness}'). This discrepancy could indicate: (1) Recent changes not fully captured in photos, (2) Styling/products masking the issue, (3) Early-stage thinning requiring attention, or (4) Normal variation in hair appearance. Based on your report AND lifestyle factors (stress: ${stressLevel}, washing frequency: ${washingFrequency}), I recommend scalp treatments and hair-strengthening products."
   
   SCENARIO 2: Visible condition NOT reported by user
   - Clearly identify what you see
   - Mention in description: "I notice [condition] in the images that wasn't mentioned in your assessment. This may be something to monitor."
   - Provide recommendations
   
   SCENARIO 3: Visual and user report AGREE
   - Confirm agreement: "Visual analysis confirms your assessment of [condition]"
   - Provide detailed rating and targeted recommendations

D. CONTEXTUAL FACTORS INTEGRATION:
   - Consider how lifestyle factors affect the concern:
     * Age ${userData.age}: Hair changes naturally with age (thinning, graying, texture changes)
     * Gender ${userData.gender}: Hormonal factors affect hair growth patterns differently
     * Hair type "${hairType}": Affects how damage and concerns appear
     * Hair texture "${hairTexture}": Determines product needs and styling approach
     * Scalp condition "${scalpCondition}": Critical for hair health assessment
     * Washing frequency "${washingFrequency}": Affects scalp health and oil production
     * Water quality "${waterQuality}": Hard water can cause buildup, chlorinated water can strip oils
     * Chemical treatments "${chemicalTreatments}": Major factor in hair damage assessment
     * Heat styling "${heatStylingFrequency}": Directly impacts hair damage and texture
     * Stress level "${stressLevel}": Can cause hair loss, thinning, or scalp issues
     * Hair care products "${hairCareProducts}": Affects current hair condition

E. INTEGRATED ASSESSMENT:
   - Combine visual evidence with user-reported data
   - Weight user concerns appropriately (don't dismiss if not clearly visible)
   - Consider all lifestyle factors when determining severity and recommendations
   - Use clinical reasoning to connect multiple data points

=== CRITICAL INSTRUCTIONS ===

1. NEVER IGNORE USER-REPORTED CONCERNS, even if not clearly visible
   - If user reports "Thinning" or "Dry scalp" but images don't show it clearly, still address it
   - Explain WHY it might not be visible while acknowledging their experience
   - This applies to ALL hair types, ages, genders, and conditions
   
2. ALWAYS EXPLAIN DISCREPANCIES transparently
   - Don't just report what you see
   - Explain possible reasons for mismatches between visual and reported
   - Build trust through transparency
   - Consider that some hair concerns are harder to detect in photos (e.g., early thinning, scalp irritation under hair)
   
3. USE CLINICAL REASONING ACROSS ALL DEMOGRAPHICS
   - Reference how age, gender, hair type, lifestyle factors influence hair conditions
   - Connect multiple data points (e.g., high stress + reported thinning = higher concern)
   - Consider that certain hair types may make issues harder to detect visually (e.g., curly/coily hair can hide scalp conditions)
   - Adjust analysis methodology based on user's hair type "${hairType}" and texture "${hairTexture}"
   - Age ${userData.age}: Different age groups have different hair concerns (thinning patterns, graying, texture changes)
   - Gender ${userData.gender}: Hormonal factors affect hair differently (male pattern baldness vs. female pattern hair loss)
   
4. PROVIDE ACTIONABLE RECOMMENDATIONS FOR EVERYONE
   - Base recommendations on BOTH visual analysis AND user concerns
   - If user reports issue strongly, recommend treatment even if visual shows mild severity
   - Personalize based on hair type, age, gender, lifestyle factors
   - Consider water quality "${waterQuality}" when recommending products (hard water needs chelating, chlorinated needs clarifying)
   - Factor in washing frequency "${washingFrequency}" and hair care products "${hairCareProducts}"
   - Address chemical treatments "${chemicalTreatments}" and heat styling "${heatStylingFrequency}" in damage prevention
   - Ensure recommendations work for all hair types (straight, wavy, curly, coily)
   
5. HANDLE IMAGE LIMITATIONS HONESTLY
   - If image quality is poor, say so
   - If lighting conditions limit analysis, acknowledge it
   - If certain areas aren't visible (e.g., scalp under thick hair, back of head), mention it
   - If hair styling or products make assessment difficult, note this
   - Suggest re-capturing images if needed
   - NOTE: Some hair concerns are inherently harder to detect in standard photos, especially for certain hair types (e.g., curly/coily hair can hide scalp conditions) - acknowledge this limitation

6. UNIVERSAL APPLICABILITY & BIAS PREVENTION
   - Analyze without assumptions based on hair type, age, gender, or ethnicity
   - Use the same clinical reasoning approach for everyone
   - Recognize that certain conditions may present differently:
     * Curly/coily hair: Scalp conditions may be less visible, hair density assessment differs
     * Different hair textures: Damage and quality may appear differently
     * Different ages: Normal hair changes vary by age group
     * Different genders: Hair loss patterns differ
   - When hair type is "${hairType}" and texture is "${hairTexture}", consider how these affect visibility of concerns
   - Never assume severity based on appearance alone - always integrate user-reported data

=== ANALYZE THESE 6 HAIR PARAMETERS WITH CLINICAL ACCURACY ===

For EACH of the 6 parameters below, you MUST provide:
1. A rating from 0-10 (where 0 = worst/severest concern, 10 = excellent/no concern)
2. A severity level: 'Mild' (1-3), 'Medium' (4-7), or 'Severe' (8-10)
3. Detailed analysis and notes

1. Hair Density and Thickness:
   - Visual: Compare visible scalp area vs. hair coverage in both images
   - Reported: Hair thickness "${hairThickness}"
   - Cross-validate and explain any discrepancies
   - Consider age ${userData.age} and gender ${userData.gender} in natural hair changes
   - RATING: Rate from 0-10 (10 = excellent density/thickness, 0 = severe thinning/very thin)
   - SEVERITY: Determine based on rating (1-3=Mild, 4-7=Medium, 8-10=Severe)

2. Scalp Health and Condition:
   - Visual: Scalp visibility, color, flakes, redness, oiliness
   - Reported: Scalp condition "${scalpCondition}"
   - Cross-validate: Note that scalp visibility depends on hair type "${hairType}"
   - Consider washing frequency "${washingFrequency}" affects scalp oil production
   - RATING: Rate from 0-10 (10 = healthy scalp, 0 = severe scalp issues)
   - SEVERITY: Determine based on rating and reported concerns (1-3=Mild, 4-7=Medium, 8-10=Severe)

3. Hair Texture and Quality:
   - Visual: Texture, shine/luster, frizz, damage (split ends, breakage), curl pattern consistency
   - Reported: Hair type "${hairType}", texture "${hairTexture}"
   - Cross-validate and consider styling effects
   - Factor in chemical treatments "${chemicalTreatments}" and heat styling "${heatStylingFrequency}"
   - RATING: Rate from 0-10 (10 = excellent texture/quality, 0 = severe damage/poor quality)
   - SEVERITY: Determine based on rating (1-3=Mild, 4-7=Medium, 8-10=Severe)

4. Potential Issues (Dandruff, Dryness, Damage, Hair Loss):
   - Visual: What's visible in images (dandruff flakes, dry ends, breakage, thinning areas)
   - Reported: Chemical treatments "${chemicalTreatments}", heat styling "${heatStylingFrequency}", scalp condition "${scalpCondition}"
   - Cross-validate and integrate all factors
   - Consider stress level "${stressLevel}" for hair loss assessment
   - RATING: Rate from 0-10 (10 = no issues, 0 = severe/multiple issues)
   - SEVERITY: Determine based on rating and number/severity of issues (1-3=Mild, 4-7=Medium, 8-10=Severe)

5. Hair Growth Patterns:
   - Visual: Receding hairline, growth patterns, crown coverage, overall distribution
   - Reported: Assess based on user's age ${userData.age} and gender ${userData.gender}
   - Consider natural aging patterns and genetic factors
   - Factor in stress level "${stressLevel}"
   - RATING: Rate from 0-10 (10 = normal/good growth patterns, 0 = severe pattern issues)
   - SEVERITY: Determine based on rating (1-3=Mild, 4-7=Medium, 8-10=Severe)

6. Recommendations for Improvement:
   - Base on BOTH visual findings AND user-reported data
   - Consider ALL lifestyle factors:
     * Water quality "${waterQuality}": Recommend clarifying/chelating treatments if needed
     * Washing frequency "${washingFrequency}": Adjust based on scalp condition
     * Hair care products "${hairCareProducts}": Suggest improvements if needed
     * Chemical treatments "${chemicalTreatments}": Damage repair recommendations
     * Heat styling "${heatStylingFrequency}": Protection and reduction strategies
     * Stress level "${stressLevel}": Stress management for hair health
     * Age ${userData.age}: Age-appropriate care recommendations
     * Hair type "${hairType}" and texture "${hairTexture}": Type-specific product recommendations
   - RATING: Rate from 0-10 based on quality and comprehensiveness of recommendations (10 = excellent recommendations, 0 = minimal/no recommendations)
   - SEVERITY: For recommendations, typically 'Mild' = basic recommendations needed, 'Medium' = moderate changes needed, 'Severe' = extensive changes needed

SCORING:
- Provide an overall_score from 0 to 100 (integer). 100 = excellent hair health
- Consider both visual evidence AND user-reported concerns
- Higher counts/severity reduce score. Good hydration, low damage, healthy scalp increase score.
- Consider overall hair quality, not just individual issues
- Factor in age-appropriate expectations (older age may have naturally lower density, but still assess health)

Provide an overall summary addressing: (1) Visual findings from both images, (2) User-reported assessment, (3) Any discrepancies and explanations, (4) Overall hair health status considering age ${userData.age}, gender ${userData.gender}, hair type "${hairType}", and all lifestyle factors.

Determine overall severity: 'Mild' | 'Medium' | 'Severe' (based on highest rated parameter OR user concern if not clearly visible)

CRITICAL: You MUST respond with ONLY a valid JSON object. No markdown, no code blocks, no explanations before or after the JSON.
    
    The response must be a JSON object that EXACTLY follows this schema (all fields are REQUIRED):
    {
      "overall_score": 72,
      "summary": "string (comprehensive hair health assessment)",
      "overallSeverity": "Mild",
      "hair_analysis": {
        "1. Hair Density and Thickness": {
          "rating": 7.5,
          "severity": "Mild",
          "density": "string",
          "thickness": "string",
          "notes": "string"
        },
        "2. Scalp Health and Condition": {
          "rating": 6.0,
          "severity": "Medium",
          "condition": "string",
          "redness_or_irritation": "string",
          "dryness_or_oiliness": "string",
          "notes": "string"
        },
        "3. Hair Texture and Quality": {
          "rating": 8.0,
          "severity": "Mild",
          "texture": "string",
          "quality": "string",
          "shine": "string",
          "notes": "string"
        },
        "4. Potential Issues": {
          "rating": 5.5,
          "severity": "Medium",
          "dandruff": "string",
          "dryness": "string",
          "damage": "string",
          "hair_loss": "string",
          "notes": "string"
        },
        "5. Hair Growth Patterns": {
          "rating": 8.5,
          "severity": "Mild",
          "receding_hairline": "string",
          "general_growth": "string",
          "notes": "string"
        },
        "6. Recommendations for Improvement": {
          "rating": 7.0,
          "severity": "Mild",
          "hydration": "string",
          "styling": "string",
          "scalp_care": "string",
          "trimming": "string",
          "diet": "string",
          "general_health": "string",
          "notes": "string"
        }
      }
    }
    
    CRITICAL REQUIREMENTS:
    - Return ONLY the JSON object, nothing else
    - All 6 hair_analysis sections MUST be included
    - Use EXACTLY these keys: "1. Hair Density and Thickness", "2. Scalp Health and Condition", etc.
    - Each section MUST include:
      * "rating": A number from 0-10 (can be decimal like 7.5)
      * "severity": One of "Mild", "Medium", or "Severe" based on the rating
    - Ratings should vary based on actual analysis - DO NOT use the same rating for all sections
    - Rate each section independently based on its specific condition:
      * High rating (8-10) = good/excellent condition
      * Medium rating (4-7) = moderate concerns
      * Low rating (0-3) = severe concerns
    - overallSeverity must be one of: "Mild", "Medium", or "Severe" (based on worst section)
    - overall_score must be an integer between 0 and 100 (average of section ratings * 10)
`

    // Convert base64 images to parts
    const imageParts = hairImages.map((img: string, index: number) => {
      try {
        if (!img || typeof img !== 'string') {
          throw new Error(`Invalid image data at index ${index}`)
        }

        const base64String = img.includes(',') ? img.split(',')[1] : img

        if (!base64String || base64String.length < 100) {
          throw new Error(`Image data too short at index ${index}`)
        }

        return {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64String,
          },
        }
      } catch (imgError) {
        console.error(`Error processing image ${index}:`, imgError)
        throw new Error(`Failed to process image ${index + 1}. Please ensure images are valid.`)
      }
    })

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [...imageParts, { text: textPrompt }] }],
      generationConfig,
      safetySettings,
    })

    const raw = result.response.text().trim()
    
    // Try multiple extraction methods
    let maybeJson = raw
    
    // Method 1: Extract from markdown code blocks
    const codeBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) {
      maybeJson = codeBlockMatch[1]
    } else {
      // Method 2: Extract JSON object from text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        maybeJson = jsonMatch[0]
      }
    }
    
    if (!maybeJson || maybeJson.length === 0) {
      throw new Error('AI response does not contain valid JSON data')
    }

    const analysisResult = JSON.parse(maybeJson)

    return new Response(
      JSON.stringify({ success: true, data: analysisResult }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Error in analyze-hair function:', error)
    
    // Handle specific error types
    let errorMessage = 'Internal server error'
    if (error.message) {
      if (error.message.includes('429') || 
          error.message.includes('Resource exhausted') || 
          error.message.includes('quota') || 
          error.message.includes('rate limit') ||
          error.message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'AI service is currently at capacity. Please wait a few minutes and try again.'
      } else if (error.message.includes('API_KEY') || error.message.includes('API key')) {
        errorMessage = 'API configuration error. Please contact support.'
      } else if (error.message.includes('safety') || error.message.includes('blocked') || error.message.includes('SAFETY')) {
        errorMessage = 'Content was blocked by safety filters. Please try with different images.'
      } else {
        errorMessage = error.message
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})


