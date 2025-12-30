import { supabase } from '@/lib/supabase'
import { UserData, AnalysisResult } from '../types'
import { SKIN_PARAMETERS } from '../lib/constants'

// Export HairAnalysisResult type for use in other files
export interface HairAnalysisResult {
  overall_score: number
  summary: string
  overallSeverity: 'Mild' | 'Medium' | 'Severe'
  hair_analysis: {
    "1. Hair Density and Thickness": {
      rating: number
      severity: 'Mild' | 'Medium' | 'Severe'
      density: string
      thickness: string
      notes: string
    }
    "2. Scalp Health and Condition": {
      rating: number
      severity: 'Mild' | 'Medium' | 'Severe'
      condition: string
      redness_or_irritation: string
      dryness_or_oiliness: string
      notes: string
    }
    "3. Hair Texture and Quality": {
      rating: number
      severity: 'Mild' | 'Medium' | 'Severe'
      texture: string
      quality: string
      shine: string
      notes: string
    }
    "4. Potential Issues": {
      rating: number
      severity: 'Mild' | 'Medium' | 'Severe'
      dandruff: string
      dryness: string
      damage: string
      hair_loss: string
      notes: string
    }
    "5. Hair Growth Patterns": {
      rating: number
      severity: 'Mild' | 'Medium' | 'Severe'
      receding_hairline: string
      general_growth: string
      notes: string
    }
    "6. Recommendations for Improvement": {
      rating: number
      severity: 'Mild' | 'Medium' | 'Severe'
      hydration: string
      styling: string
      scalp_care: string
      trimming: string
      diet: string
      general_health: string
      notes: string
    }
    "Overall Hair Health"?: {
      rating?: number
      severity?: 'Mild' | 'Medium' | 'Severe'
      description?: string
    }
  }
}

/**
 * Call Supabase Edge Function for skin analysis
 */
export const analyzeSkin = async (userData: UserData, faceImages: string[], userId?: string): Promise<AnalysisResult> => {
  try {
    console.log('📞 Calling analyze-skin edge function...')
    
    // Edge function will fetch API key from database server-side (more secure)
    // We just need to pass userId
    const { data, error } = await supabase.functions.invoke('analyze-skin', {
      body: {
        userData,
        faceImages,
        userId, // Edge function will look up API key from database
      },
    })

    if (error) {
      console.error('❌ Edge function error:', error)
      console.error('❌ Error full object:', JSON.stringify(error, null, 2))
      
      // Try to get error details from the response
      let errorMessage = error.message || 'Failed to analyze skin'
      let retryAfter: number | undefined
      
      // Check if it's a 429 (rate limit) error
      const is429 = error.message?.includes('429') || 
                    error.message?.includes('Too Many Requests') ||
                    (error as any).context?.status === 429 ||
                    (error as any).status === 429
      
      // Try to extract error body from various places
      if (error.context) {
        // Try from context.body
        if (error.context.body) {
          try {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body
            if (errorBody.error) {
              errorMessage = errorBody.error
            }
            if (errorBody.retryAfter) {
              retryAfter = errorBody.retryAfter
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Try from context.data if available
        if ((error.context as any).data) {
          try {
            const errorData = (error.context as any).data
            if (errorData.error) {
              errorMessage = errorData.error
            }
            if (errorData.retryAfter) {
              retryAfter = errorData.retryAfter
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      // For 429 errors, provide helpful message
      if (is429) {
        if (retryAfter) {
          errorMessage = `AI service quota exceeded. Please try again in ${retryAfter} seconds.`
        } else {
          // Default message for quota exceeded
          errorMessage = 'AI service quota exceeded. The Gemini API free tier quota has been reached. Please wait a few minutes for the quota to reset, or upgrade your API plan at https://ai.google.dev/pricing'
        }
      }
      
      throw new Error(errorMessage)
    }

    if (!data) {
      throw new Error('No response data received from edge function')
    }

    if (!data.success) {
      throw new Error(data.error || 'Analysis failed')
    }

    console.log('✅ Edge function response received successfully')
    
    // Ensure all parameters are present in the analysis result
    // The AI might omit some parameters, so we need to add them
    let analysisResult = data.data as AnalysisResult
    
    if (analysisResult && analysisResult.parameters) {
      // Extract primary concerns from userData for better handling of missing parameters
      const primaryConcern = Array.isArray((userData as any).primarySkinConcern)
        ? (userData as any).primarySkinConcern.join(', ').toLowerCase()
        : ((userData as any).primarySkinConcern || '').toLowerCase()
      
      // Helper function to normalize parameter names for matching
      const normalizeParamName = (name: string): string => {
        return name.toLowerCase().replace(/'/g, '').replace(/\s+/g, ' ').trim()
      }
      
      // Ensure all parameters are present
      const completeParameters = SKIN_PARAMETERS.map(paramName => {
        // Try exact match first
        let foundParam = analysisResult.parameters.find(p => p.category === paramName)
        
        // If not found, try normalized matching (handles apostrophes, case differences)
        if (!foundParam) {
          const normalizedTarget = normalizeParamName(paramName)
          foundParam = analysisResult.parameters.find(p => {
            const normalizedCategory = normalizeParamName(p.category)
            return normalizedCategory === normalizedTarget
          })
        }
        
        // If still not found, try partial matching
        if (!foundParam) {
          const targetWords = normalizeParamName(paramName).split(' ')
          foundParam = analysisResult.parameters.find(p => {
            const categoryWords = normalizeParamName(p.category).split(' ')
            return targetWords.every(word => categoryWords.some(catWord => catWord.includes(word) || word.includes(catWord)))
          })
        }
        
        if (foundParam) {
          // Ensure the category name matches exactly what we expect
          return {
            ...foundParam,
            category: paramName
          }
        }
        
        // If parameter was in user's primary concerns, give it more attention
        const isUserConcern = primaryConcern.includes(normalizeParamName(paramName))
        
        return {
          category: paramName,
          rating: isUserConcern ? 5 : 1, // Higher default if user reported it
          severity: isUserConcern ? 'Medium' : 'N/A',
          description: isUserConcern 
            ? `User reported "${paramName}" as a primary concern. Visual analysis did not detect significant signs of this condition in the provided images. This could be due to: (1) early-stage condition not yet visible, (2) subtle presentation not captured in standard lighting, (3) condition more apparent under different conditions, or (4) image quality limitations. Recommendation: Monitor this area and consider preventative care.`
            : 'No significant concerns detected in this area.'
        }
      })
      
      analysisResult.parameters = completeParameters
      console.log(`✅ Ensured all ${SKIN_PARAMETERS.length} parameters are present in analysis`)
    }
    
    return analysisResult
  } catch (error: any) {
    console.error('❌ Error calling analyze-skin edge function:', error)
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    throw new Error(error.message || 'Failed to analyze skin')
  }
}

/**
 * Call Supabase Edge Function for hair analysis
 */
export const analyzeHair = async (
  userData: UserData,
  hairImages: string[],
  questionnaireAnswers?: any,
  userId?: string
): Promise<HairAnalysisResult> => {
  try {
    console.log('📞 Calling analyze-hair edge function...')
    
    // Edge function will fetch API key from database server-side (more secure)
    // We just need to pass userId
    const { data, error } = await supabase.functions.invoke('analyze-hair', {
      body: {
        userData,
        hairImages,
        questionnaireAnswers,
        userId, // Edge function will look up API key from database
      },
    })

    if (error) {
      console.error('❌ Edge function error:', error)
      // Try to extract error message from response
      let errorMessage = error.message || 'Failed to analyze hair'
      
      // If error has context, try to get more details
      if (error.context && error.context.body) {
        try {
          const errorBody = typeof error.context.body === 'string' 
            ? JSON.parse(error.context.body) 
            : error.context.body
          if (errorBody.error) {
            errorMessage = errorBody.error
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      throw new Error(errorMessage)
    }

    if (!data) {
      throw new Error('No response data received from edge function')
    }

    if (!data.success) {
      throw new Error(data.error || 'Analysis failed')
    }

    console.log('✅ Edge function response received successfully')
    return data.data as HairAnalysisResult
  } catch (error: any) {
    console.error('❌ Error calling analyze-hair edge function:', error)
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    })
    throw new Error(error.message || 'Failed to analyze hair')
  }
}







