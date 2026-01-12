import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from "@google/generative-ai";
import { UserData, AnalysisResult, AnalysisParameter } from '../types';
import { SKIN_PARAMETERS } from '../lib/constants';

const MODEL_NAME = "gemini-2.0-flash"; // single model per requirement
const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || 'AIzaSyCLUJAs3qAWx5c-etSDD9MxlnhfD2DAY2U';

const getGenAI = () => {
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not defined.");
  }
  // Construct the URL to use the v1 API
  const genAI = new GoogleGenerativeAI(API_KEY);
  return genAI;
};

export const analyzeSkin = async (userData: UserData, faceImages: string[]): Promise<AnalysisResult> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig: GenerationConfig = {
    temperature: 0.4,
    topP: 1,
    topK: 32,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  // Extract new skin-specific data from userData
  const skinData = userData as any;
  const primaryConcern = Array.isArray(skinData.primarySkinConcern) 
    ? skinData.primarySkinConcern.join(', ')
    : (skinData.primarySkinConcern || 'Aging'); // Handle both array and single value
  const skinType = skinData.skinType || 'Normal';
  const skinTone = skinData.skinTone || 'Medium';
  const glow = skinData.glow || 'Moderate Glow';
  const middayFeel = skinData.middaySkinFeel || 'Neither smooth nor rough';
  const sunscreen = skinData.sunscreenUsage || 'I do not apply sunscreen';
  const activity = skinData.physicalActivity || 'Sometimes';
  const sleep = skinData.sleepingHabits || 'Moderate Sleep';
  const treatment = skinData.skinTreatment || 'None';

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
${userData.profession ? `- Profession: ${userData.profession}` : ''}
${userData.workingTime ? `- Working Hours: ${userData.workingTime}` : ''}
${userData.acUsage ? `- AC Usage: ${userData.acUsage}` : ''}
${userData.smoking ? `- Smoking: ${userData.smoking}` : ''}
${userData.waterQuality ? `- Water Quality: ${userData.waterQuality}` : ''}

User Demographics:
- Age: ${userData.age}
- Gender: ${userData.gender}
- Location: ${userData.city}, ${userData.state}, ${userData.country}

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
     * Age ${userData.age}: Natural aging processes
     * Sunscreen usage "${sunscreen}": Protection level impacts dark spots, tanning
     * Skin tone "${skinTone}": Affects visibility of certain conditions
     * Skin type "${skinType}": Determines treatment approach
     * Water quality "${userData.waterQuality || 'Unknown'}": Can affect skin barrier
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
   - Age ${userData.age}: Different age groups have different skin concerns and healing abilities
   - Gender ${userData.gender}: Consider hormonal factors that may affect skin conditions
   
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
  "summary": "Comprehensive assessment addressing: (1) Visual findings, (2) User-reported concerns (${primaryConcern}), (3) Any discrepancies and explanations, (4) Overall skin health status considering age ${userData.age}, skin type ${skinType}, skin tone ${skinTone}, and lifestyle factors. Address the primary concern directly while integrating visual evidence.",
  
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
      "Step 3: Age-appropriate care for ${userData.age} years old",
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

image.pngScenario B: Image shows significant "Crow's Feet" but user didn't report it
- Visual rating: 7/10 (moderate-visible crow's feet)
- User concern: NOT explicitly reported
- Description: "Visual analysis detects moderate crow's feet (rating 7/10), particularly around the outer corners of the eyes. While this wasn't listed in your primary concerns, it's visible in the analysis. Given your age (${userData.age}) and [lifestyle factors], I recommend preventative anti-aging routine: Retinol at night, peptide serums, eye creams with peptides, and increased hydration."

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
  `;
  
  const imageParts = faceImages.map(base64Data => ({
      inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data.split(',')[1],
      },
  }));

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [...imageParts, { text: textPrompt }] }],
      generationConfig,
      safetySettings,
    });

    const raw = result.response.text().trim();
    const maybeJson = raw.match(/\{[\s\S]*\}$/)?.[0] || raw;
    const analysis = JSON.parse(maybeJson) as AnalysisResult;
    
    // Ensure all parameters are present, adding placeholders if Gemini omits any
    // Use flexible matching to handle variations in naming (e.g., apostrophes, case differences)
    const normalizeParamName = (name: string): string => {
      return name.toLowerCase().replace(/'/g, '').replace(/\s+/g, ' ').trim();
    };
    
    const completeParameters: AnalysisParameter[] = SKIN_PARAMETERS.map(paramName => {
        // Try exact match first
        let foundParam = analysis.parameters.find(p => p.category === paramName);
        
        // If not found, try normalized matching (handles apostrophes, case differences)
        if (!foundParam) {
          const normalizedTarget = normalizeParamName(paramName);
          foundParam = analysis.parameters.find(p => {
            const normalizedCategory = normalizeParamName(p.category);
            return normalizedCategory === normalizedTarget;
          });
        }
        
        // If still not found, try partial matching (e.g., "Crow's Feet" vs "Crows Feet")
        if (!foundParam) {
          const targetWords = normalizeParamName(paramName).split(' ');
          foundParam = analysis.parameters.find(p => {
            const categoryWords = normalizeParamName(p.category).split(' ');
            return targetWords.every(word => categoryWords.some(catWord => catWord.includes(word) || word.includes(catWord)));
          });
        }
        
        if (foundParam) {
            // Ensure the category name matches exactly what we expect
            return {
                ...foundParam,
                category: paramName
            };
        }
        
        // If parameter was in user's primary concerns, give it more attention even if not visible
        const isUserConcern = primaryConcern.toLowerCase().includes(normalizeParamName(paramName));
        
        return {
            category: paramName,
            rating: isUserConcern ? 5 : 1, // Higher default if user reported it
            severity: isUserConcern ? 'Medium' : 'N/A',
            description: isUserConcern 
              ? `User reported "${paramName}" as a primary concern. Visual analysis did not detect significant signs of this condition in the provided images. This could be due to: (1) early-stage condition not yet visible, (2) subtle presentation not captured in standard lighting, (3) condition more apparent under different conditions, or (4) image quality limitations. Recommendation: Monitor this area and consider preventative care.`
              : 'No significant concerns detected in this area.'
        };
    });

    analysis.parameters = completeParameters;

    return analysis;

  } catch (error) {
      console.error("❌ Error calling Gemini API for skin analysis:", error);
      
      // Handle specific error types
      if (error instanceof Error) {
        // Check for rate limit errors (429)
        if (error.message.includes('429') || 
            error.message.includes('Resource exhausted') || 
            error.message.includes('quota') || 
            error.message.includes('rate limit') ||
            error.message.includes('RESOURCE_EXHAUSTED')) {
          throw new Error("AI service is currently at capacity. Please wait a few minutes and try again. Our API has reached its rate limit for now.");
        }
        
        // Check for API key errors
        if (error.message.includes("API_KEY") || error.message.includes("API key")) {
          throw new Error("API configuration error. Please contact support.");
        }
        
        // Check for safety filter errors
        if (error.message.includes("safety") || error.message.includes("blocked") || error.message.includes("SAFETY")) {
          throw new Error("Content was blocked by safety filters. Please try with different images.");
        }
        
        // If it's already a user-friendly error, re-throw it
        if (error.message.includes("Failed to") || error.message.includes("Please")) {
          throw error;
        }
        
        // Log the original error for debugging
        console.error('Original error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        throw new Error(`Failed to analyze skin: ${error.message}`);
      }
      
      // Fallback for unknown errors
      throw new Error("Failed to analyze skin. The AI model may be temporarily unavailable. Please try again in a few moments.");
  }
};

export interface HairAnalysisResult {
  overall_score: number; // 0-100
  summary: string;
  overallSeverity: 'Mild' | 'Medium' | 'Severe';
  hair_analysis: {
    "1. Hair Density and Thickness": {
      rating: number; // 0-10 rating for this section
      severity: 'Mild' | 'Medium' | 'Severe';
      density: string;
      thickness: string;
      notes: string;
    };
    "2. Scalp Health and Condition": {
      rating: number; // 0-10 rating for this section
      severity: 'Mild' | 'Medium' | 'Severe';
      condition: string;
      redness_or_irritation: string;
      dryness_or_oiliness: string;
      notes: string;
    };
    "3. Hair Texture and Quality": {
      rating: number; // 0-10 rating for this section
      severity: 'Mild' | 'Medium' | 'Severe';
      texture: string;
      quality: string;
      shine: string;
      notes: string;
    };
    "4. Potential Issues": {
      rating: number; // 0-10 rating for this section
      severity: 'Mild' | 'Medium' | 'Severe';
      dandruff: string;
      dryness: string;
      damage: string;
      hair_loss: string;
      notes: string;
    };
    "5. Hair Growth Patterns": {
      rating: number; // 0-10 rating for this section
      severity: 'Mild' | 'Medium' | 'Severe';
      receding_hairline: string;
      general_growth: string;
      notes: string;
    };
    "6. Recommendations for Improvement": {
      rating: number; // 0-10 rating for this section (typically higher = better recommendations)
      severity: 'Mild' | 'Medium' | 'Severe';
      hydration: string;
      styling: string;
      scalp_care: string;
      trimming: string;
      diet: string;
      general_health: string;
      notes: string;
    };
  };
}

export const analyzeHair = async (userData: UserData, hairImages: string[], hairQuestionnaire: any): Promise<HairAnalysisResult> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig: GenerationConfig = {
    temperature: 0.4,
    topP: 1,
    topK: 32,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

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
- Hair Type: ${hairQuestionnaire.hairType}
- Hair Texture: ${hairQuestionnaire.hairTexture}
- Hair Thickness: ${hairQuestionnaire.hairThickness}
- Scalp Condition: ${hairQuestionnaire.scalpCondition}
- Washing Frequency: ${hairQuestionnaire.washingFrequency}
- Hair Care Products: ${hairQuestionnaire.hairCareProducts}
- Chemical Treatments: ${hairQuestionnaire.chemicalTreatments}
- Heat Styling Frequency: ${hairQuestionnaire.heatStylingFrequency}
- Stress Level: ${hairQuestionnaire.stressLevel}
- Water Quality: ${hairQuestionnaire.waterQuality}

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
   - Hair Type: ${hairQuestionnaire.hairType}, Texture: ${hairQuestionnaire.hairTexture}, Thickness: ${hairQuestionnaire.hairThickness}
   - Scalp Condition: ${hairQuestionnaire.scalpCondition}
   - Potential concerns: Assess based on their reported scalp condition, washing frequency, chemical treatments, etc.
   
C. DISCREPANCY ANALYSIS (if visual and reported don't match):
   
   SCENARIO 1: User reports concern (e.g., "Thinning hair") but NOT clearly visible in images
   - DO NOT dismiss the concern. Explain possible reasons:
     * Early stage thinning not yet visible in standard photos
     * Hair styling or products may conceal the issue
     * Lighting conditions may not reveal thinning clearly
     * Thinning may be more apparent in person or under different angles
     * Hair type "${hairQuestionnaire.hairType}" may make certain issues harder to detect visually
     * User may perceive changes that aren't yet visible in photos
     * Stress level "${hairQuestionnaire.stressLevel}" can cause temporary hair loss that may not be visible yet
     * Age ${userData.age}: Natural hair changes may be perceived before becoming visually apparent
   - ADJUSTMENT: Acknowledge user concern in analysis and recommendations
   - RECOMMENDATION: Provide targeted recommendations for reported concern regardless of visual severity
   - EXAMPLE RESPONSE: "Visual analysis shows moderate hair density (rating 6/10). However, you've reported concerns about hair thickness ('${hairQuestionnaire.hairThickness}'). This discrepancy could indicate: (1) Recent changes not fully captured in photos, (2) Styling/products masking the issue, (3) Early-stage thinning requiring attention, or (4) Normal variation in hair appearance. Based on your report AND lifestyle factors (stress: ${hairQuestionnaire.stressLevel}, washing frequency: ${hairQuestionnaire.washingFrequency}), I recommend scalp treatments and hair-strengthening products."
   
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
     * Hair type "${hairQuestionnaire.hairType}": Affects how damage and concerns appear
     * Hair texture "${hairQuestionnaire.hairTexture}": Determines product needs and styling approach
     * Scalp condition "${hairQuestionnaire.scalpCondition}": Critical for hair health assessment
     * Washing frequency "${hairQuestionnaire.washingFrequency}": Affects scalp health and oil production
     * Water quality "${hairQuestionnaire.waterQuality}": Hard water can cause buildup, chlorinated water can strip oils
     * Chemical treatments "${hairQuestionnaire.chemicalTreatments}": Major factor in hair damage assessment
     * Heat styling "${hairQuestionnaire.heatStylingFrequency}": Directly impacts hair damage and texture
     * Stress level "${hairQuestionnaire.stressLevel}": Can cause hair loss, thinning, or scalp issues
     * Hair care products "${hairQuestionnaire.hairCareProducts}": Affects current hair condition

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
   - Adjust analysis methodology based on user's hair type "${hairQuestionnaire.hairType}" and texture "${hairQuestionnaire.hairTexture}"
   - Age ${userData.age}: Different age groups have different hair concerns (thinning patterns, graying, texture changes)
   - Gender ${userData.gender}: Hormonal factors affect hair differently (male pattern baldness vs. female pattern hair loss)
   
4. PROVIDE ACTIONABLE RECOMMENDATIONS FOR EVERYONE
   - Base recommendations on BOTH visual analysis AND user concerns
   - If user reports issue strongly, recommend treatment even if visual shows mild severity
   - Personalize based on hair type, age, gender, lifestyle factors
   - Consider water quality "${hairQuestionnaire.waterQuality}" when recommending products (hard water needs chelating, chlorinated needs clarifying)
   - Factor in washing frequency "${hairQuestionnaire.washingFrequency}" and hair care products "${hairQuestionnaire.hairCareProducts}"
   - Address chemical treatments "${hairQuestionnaire.chemicalTreatments}" and heat styling "${hairQuestionnaire.heatStylingFrequency}" in damage prevention
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
   - When hair type is "${hairQuestionnaire.hairType}" and texture is "${hairQuestionnaire.hairTexture}", consider how these affect visibility of concerns
   - Never assume severity based on appearance alone - always integrate user-reported data

=== ANALYZE THESE 6 HAIR PARAMETERS WITH CLINICAL ACCURACY ===

For EACH of the 6 parameters below, you MUST provide:
1. A rating from 0-10 (where 0 = worst/severest concern, 10 = excellent/no concern)
2. A severity level: 'Mild' (1-3), 'Medium' (4-7), or 'Severe' (8-10)
3. Detailed analysis and notes

1. Hair Density and Thickness:
   - Visual: Compare visible scalp area vs. hair coverage in both images
   - Reported: Hair thickness "${hairQuestionnaire.hairThickness}"
   - Cross-validate and explain any discrepancies
   - Consider age ${userData.age} and gender ${userData.gender} in natural hair changes
   - RATING: Rate from 0-10 (10 = excellent density/thickness, 0 = severe thinning/very thin)
   - SEVERITY: Determine based on rating (1-3=Mild, 4-7=Medium, 8-10=Severe)

2. Scalp Health and Condition:
   - Visual: Scalp visibility, color, flakes, redness, oiliness
   - Reported: Scalp condition "${hairQuestionnaire.scalpCondition}"
   - Cross-validate: Note that scalp visibility depends on hair type "${hairQuestionnaire.hairType}"
   - Consider washing frequency "${hairQuestionnaire.washingFrequency}" affects scalp oil production
   - RATING: Rate from 0-10 (10 = healthy scalp, 0 = severe scalp issues)
   - SEVERITY: Determine based on rating and reported concerns (1-3=Mild, 4-7=Medium, 8-10=Severe)

3. Hair Texture and Quality:
   - Visual: Texture, shine/luster, frizz, damage (split ends, breakage), curl pattern consistency
   - Reported: Hair type "${hairQuestionnaire.hairType}", texture "${hairQuestionnaire.hairTexture}"
   - Cross-validate and consider styling effects
   - Factor in chemical treatments "${hairQuestionnaire.chemicalTreatments}" and heat styling "${hairQuestionnaire.heatStylingFrequency}"
   - RATING: Rate from 0-10 (10 = excellent texture/quality, 0 = severe damage/poor quality)
   - SEVERITY: Determine based on rating (1-3=Mild, 4-7=Medium, 8-10=Severe)

4. Potential Issues (Dandruff, Dryness, Damage, Hair Loss):
   - Visual: What's visible in images (dandruff flakes, dry ends, breakage, thinning areas)
   - Reported: Chemical treatments "${hairQuestionnaire.chemicalTreatments}", heat styling "${hairQuestionnaire.heatStylingFrequency}", scalp condition "${hairQuestionnaire.scalpCondition}"
   - Cross-validate and integrate all factors
   - Consider stress level "${hairQuestionnaire.stressLevel}" for hair loss assessment
   - RATING: Rate from 0-10 (10 = no issues, 0 = severe/multiple issues)
   - SEVERITY: Determine based on rating and number/severity of issues (1-3=Mild, 4-7=Medium, 8-10=Severe)

5. Hair Growth Patterns:
   - Visual: Receding hairline, growth patterns, crown coverage, overall distribution
   - Reported: Assess based on user's age ${userData.age} and gender ${userData.gender}
   - Consider natural aging patterns and genetic factors
   - Factor in stress level "${hairQuestionnaire.stressLevel}"
   - RATING: Rate from 0-10 (10 = normal/good growth patterns, 0 = severe pattern issues)
   - SEVERITY: Determine based on rating (1-3=Mild, 4-7=Medium, 8-10=Severe)

6. Recommendations for Improvement:
   - Base on BOTH visual findings AND user-reported data
   - Consider ALL lifestyle factors:
     * Water quality "${hairQuestionnaire.waterQuality}": Recommend clarifying/chelating treatments if needed
     * Washing frequency "${hairQuestionnaire.washingFrequency}": Adjust based on scalp condition
     * Hair care products "${hairQuestionnaire.hairCareProducts}": Suggest improvements if needed
     * Chemical treatments "${hairQuestionnaire.chemicalTreatments}": Damage repair recommendations
     * Heat styling "${hairQuestionnaire.heatStylingFrequency}": Protection and reduction strategies
     * Stress level "${hairQuestionnaire.stressLevel}": Stress management for hair health
     * Age ${userData.age}: Age-appropriate care recommendations
     * Hair type "${hairQuestionnaire.hairType}" and texture "${hairQuestionnaire.hairTexture}": Type-specific product recommendations
   - RATING: Rate from 0-10 based on quality and comprehensiveness of recommendations (10 = excellent recommendations, 0 = minimal/no recommendations)
   - SEVERITY: For recommendations, typically 'Mild' = basic recommendations needed, 'Medium' = moderate changes needed, 'Severe' = extensive changes needed

SCORING:
- Provide an overall_score from 0 to 100 (integer). 100 = excellent hair health
- Consider both visual evidence AND user-reported concerns
- Higher counts/severity reduce score. Good hydration, low damage, healthy scalp increase score.
- Consider overall hair quality, not just individual issues
- Factor in age-appropriate expectations (older age may have naturally lower density, but still assess health)

Provide an overall summary addressing: (1) Visual findings from both images, (2) User-reported assessment, (3) Any discrepancies and explanations, (4) Overall hair health status considering age ${userData.age}, gender ${userData.gender}, hair type "${hairQuestionnaire.hairType}", and all lifestyle factors.

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
  `;
  
  // Validate images before processing
  if (!hairImages || hairImages.length === 0) {
    throw new Error("No hair images provided for analysis.");
  }

  if (hairImages.length < 2) {
    throw new Error("Please provide both front and top view images for hair analysis.");
  }

  console.log('📸 Processing hair images:', {
    imageCount: hairImages.length,
    firstImageLength: hairImages[0]?.length || 0,
    secondImageLength: hairImages[1]?.length || 0
  });

  const imageParts = hairImages.map((base64Data, index) => {
    try {
      // Check if image data is valid
      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error(`Invalid image data at index ${index}`);
      }

      // Extract base64 data (remove data:image/xxx;base64, prefix if present)
      const base64String = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;

      if (!base64String || base64String.length < 100) {
        throw new Error(`Image data too short at index ${index}`);
      }

      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64String,
        },
      };
    } catch (imgError) {
      console.error(`❌ Error processing image ${index}:`, imgError);
      throw new Error(`Failed to process image ${index + 1}. Please ensure images are valid.`);
    }
  });

  console.log('✅ Image parts prepared:', imageParts.length);

  try {
    console.log('🚀 Calling Gemini API for hair analysis...');
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [...imageParts, { text: textPrompt }] }],
      generationConfig,
      safetySettings,
    });

    console.log('✅ Received response from Gemini API');

    const raw = result.response.text().trim();
    console.log('🔍 Raw AI response (full):', raw);
    console.log('🔍 Raw AI response length:', raw.length);
    
    if (!raw || raw.length === 0) {
      throw new Error("Empty response received from AI model.");
    }

    // Try multiple extraction methods
    let maybeJson = raw;
    
    // Method 1: Extract from markdown code blocks (```json ... ```)
    const codeBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      maybeJson = codeBlockMatch[1];
      console.log('📄 Extracted JSON from code block');
    } else {
      // Method 2: Extract JSON object from text
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        maybeJson = jsonMatch[0];
        console.log('📄 Extracted JSON from text');
      }
    }
    
    if (!maybeJson || maybeJson.length === 0) {
      console.error('❌ No JSON found in response');
      console.error('❌ Full raw response:', raw);
      throw new Error("AI response does not contain valid JSON data.");
    }

    console.log('📄 Extracted JSON (first 500 chars):', maybeJson.substring(0, 500));

    let analysis: HairAnalysisResult;
    try {
      // Clean up the JSON string - remove any trailing commas, etc.
      maybeJson = maybeJson.trim();
      // Remove any trailing commas before closing braces/brackets
      maybeJson = maybeJson.replace(/,(\s*[}\]])/g, '$1');
      
      analysis = JSON.parse(maybeJson) as HairAnalysisResult;
      console.log('✅ Successfully parsed JSON');
      console.log('📊 Parsed analysis keys:', Object.keys(analysis));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Attempted to parse (first 1000 chars):', maybeJson.substring(0, 1000));
      console.error('❌ Full raw response:', raw);
      throw new Error("Failed to parse AI response. The response format is invalid.");
    }

    // Validate the structure - log what we received
    console.log('🔍 Analysis structure check:', {
      hasOverallScore: 'overall_score' in analysis,
      overallScore: analysis.overall_score,
      hasSummary: 'summary' in analysis,
      summary: analysis.summary?.substring(0, 50),
      hasOverallSeverity: 'overallSeverity' in analysis,
      overallSeverity: analysis.overallSeverity,
      hasHairAnalysis: 'hair_analysis' in analysis,
      hairAnalysisType: typeof analysis.hair_analysis,
      hairAnalysisKeys: analysis.hair_analysis ? Object.keys(analysis.hair_analysis) : 'N/A'
    });

    if (!analysis.hair_analysis) {
      console.warn('⚠️ Missing hair_analysis in response, creating default structure');
      console.warn('⚠️ Full analysis object received:', JSON.stringify(analysis, null, 2));
      console.warn('⚠️ Analysis keys:', Object.keys(analysis));
      
      // Create default hair_analysis structure instead of throwing error
      analysis.hair_analysis = {
        "1. Hair Density and Thickness": {
          rating: 5.0,
          severity: "Medium",
          density: "Unable to assess - please retry with clearer images",
          thickness: "Unable to assess - please retry with clearer images",
          notes: "Analysis incomplete. Please ensure images are clear and well-lit."
        },
        "2. Scalp Health and Condition": {
          rating: 5.0,
          severity: "Medium",
          condition: "Unable to assess - please retry with clearer images",
          redness_or_irritation: "Unable to assess",
          dryness_or_oiliness: "Unable to assess",
          notes: "Analysis incomplete. Please retry with better image quality."
        },
        "3. Hair Texture and Quality": {
          rating: 5.0,
          severity: "Medium",
          texture: "Unable to assess - please retry with clearer images",
          quality: "Unable to assess",
          shine: "Unable to assess",
          notes: "Analysis incomplete. Please retry analysis."
        },
        "4. Potential Issues": {
          rating: 5.0,
          severity: "Medium",
          dandruff: "Unable to assess",
          dryness: "Unable to assess",
          damage: "Unable to assess",
          hair_loss: "Unable to assess",
          notes: "Analysis incomplete. Please retry with clearer images."
        },
        "5. Hair Growth Patterns": {
          rating: 5.0,
          severity: "Medium",
          receding_hairline: "Unable to assess",
          general_growth: "Unable to assess",
          notes: "Analysis incomplete. Please retry analysis."
        },
        "6. Recommendations for Improvement": {
          rating: 5.0,
          severity: "Medium",
          hydration: "Please retry analysis for personalized recommendations",
          styling: "Please retry analysis for personalized recommendations",
          scalp_care: "Please retry analysis for personalized recommendations",
          trimming: "Please retry analysis for personalized recommendations",
          diet: "Please retry analysis for personalized recommendations",
          general_health: "Please retry analysis for personalized recommendations",
          notes: "Analysis incomplete. Please retry with better quality images for accurate recommendations."
        }
      };
      
      console.log('✅ Created default hair_analysis structure');
    }

    // Ensure required fields exist
    if (!analysis.overall_score && analysis.overall_score !== 0) {
      console.warn('⚠️ Missing overall_score, defaulting to 50');
      analysis.overall_score = 50;
    }
    
    if (!analysis.summary) {
      console.warn('⚠️ Missing summary, creating default');
      analysis.summary = "Hair analysis completed.";
    }
    
    if (!analysis.overallSeverity) {
      console.warn('⚠️ Missing overallSeverity, defaulting to Medium');
      analysis.overallSeverity = "Medium";
    }

    // Check if hair_analysis has the required keys
    const requiredKeys = [
      "1. Hair Density and Thickness",
      "2. Scalp Health and Condition",
      "3. Hair Texture and Quality",
      "4. Potential Issues",
      "5. Hair Growth Patterns",
      "6. Recommendations for Improvement"
    ];

    const missingKeys = requiredKeys.filter(key => !analysis.hair_analysis![key]);
    if (missingKeys.length > 0) {
      console.error('❌ Missing required hair_analysis keys:', missingKeys);
      console.error('❌ Available keys:', Object.keys(analysis.hair_analysis));
      
      // Create default entries for missing keys
      missingKeys.forEach(key => {
        console.warn(`⚠️ Creating default entry for missing key: ${key}`);
        if (key === "1. Hair Density and Thickness") {
          analysis.hair_analysis![key] = {
            rating: 5.0,
            severity: "Medium",
            density: "Unable to assess",
            thickness: "Unable to assess",
            notes: "Analysis incomplete - image quality may need improvement"
          };
        } else if (key === "2. Scalp Health and Condition") {
          analysis.hair_analysis![key] = {
            rating: 5.0,
            severity: "Medium",
            condition: "Unable to assess",
            redness_or_irritation: "Unable to assess",
            dryness_or_oiliness: "Unable to assess",
            notes: "Analysis incomplete - image quality may need improvement"
          };
        } else if (key === "3. Hair Texture and Quality") {
          analysis.hair_analysis![key] = {
            rating: 5.0,
            severity: "Medium",
            texture: "Unable to assess",
            quality: "Unable to assess",
            shine: "Unable to assess",
            notes: "Analysis incomplete - image quality may need improvement"
          };
        } else if (key === "4. Potential Issues") {
          analysis.hair_analysis![key] = {
            rating: 5.0,
            severity: "Medium",
            dandruff: "Unable to assess",
            dryness: "Unable to assess",
            damage: "Unable to assess",
            hair_loss: "Unable to assess",
            notes: "Analysis incomplete - image quality may need improvement"
          };
        } else if (key === "5. Hair Growth Patterns") {
          analysis.hair_analysis![key] = {
            rating: 5.0,
            severity: "Medium",
            receding_hairline: "Unable to assess",
            general_growth: "Unable to assess",
            notes: "Analysis incomplete - image quality may need improvement"
          };
        } else if (key === "6. Recommendations for Improvement") {
          analysis.hair_analysis![key] = {
            rating: 5.0,
            severity: "Medium",
            hydration: "Please retake analysis for recommendations",
            styling: "Please retake analysis for recommendations",
            scalp_care: "Please retake analysis for recommendations",
            trimming: "Please retake analysis for recommendations",
            diet: "Please retake analysis for recommendations",
            general_health: "Please retake analysis for recommendations",
            notes: "Analysis incomplete - please retry with better images"
          };
        }
      });
      
      console.log('✅ Created default entries for missing keys');
    }

    console.log('✅ Parsed hair analysis result structure:', {
      hasHairAnalysis: !!analysis.hair_analysis,
      hasDensityThickness: !!analysis.hair_analysis["1. Hair Density and Thickness"],
      hasScalpHealth: !!analysis.hair_analysis["2. Scalp Health and Condition"],
      hasHairTexture: !!analysis.hair_analysis["3. Hair Texture and Quality"],
      hasPotentialIssues: !!analysis.hair_analysis["4. Potential Issues"],
      hasGrowthPatterns: !!analysis.hair_analysis["5. Hair Growth Patterns"],
      hasRecommendations: !!analysis.hair_analysis["6. Recommendations for Improvement"],
      keys: Object.keys(analysis.hair_analysis || {})
    });

    return analysis;

  } catch (error) {
    console.error("❌ Error calling Gemini API for hair analysis:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // If it's already a user-friendly error, re-throw it
      if (error.message.includes("Failed to") || error.message.includes("Please")) {
        throw error;
      }
      
      // Check for specific error types
      if (error.message.includes("API_KEY")) {
        throw new Error("API configuration error. Please contact support.");
      }
      
      if (error.message.includes('429') || 
          error.message.includes('Resource exhausted') || 
          error.message.includes("quota") || 
          error.message.includes("limit") ||
          error.message.includes("rate limit") ||
          error.message.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("AI service is currently at capacity. Please wait a few minutes and try again. Our API has reached its rate limit for now.");
      }
      
      if (error.message.includes("safety") || error.message.includes("blocked")) {
        throw new Error("Content was blocked by safety filters. Please try with different images.");
      }
      
      // Log the original error for debugging
      console.error('Original error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      throw new Error(`Failed to analyze hair: ${error.message}`);
    }
    
    // Fallback for unknown errors
    throw new Error("Failed to analyze hair. The AI model may be temporarily unavailable. Please try again.");
  }
};
