import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExtractedProduct {
  product_name: string
  product_description: string
  product_image?: string
  parameter_name: string
  severity_level: string
  product_link?: string
  is_primary?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const { pdfPages, userId, parameters } = await req.json()
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get API key from database
    let GEMINI_API_KEY: string | null = null
    
    if (userId) {
      try {
        const { data, error } = await supabase.rpc('get_api_key_for_user', { p_user_id: userId })
        if (!error && data) {
          GEMINI_API_KEY = data
        }
      } catch (e) {
        console.log('⚠️ Could not fetch API key from database, using fallback')
      }
    }
    
    if (!GEMINI_API_KEY) {
      GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    }
    
    if (!GEMINI_API_KEY) {
      throw new Error('No API key available')
    }

    if (!pdfPages || !Array.isArray(pdfPages) || pdfPages.length === 0) {
      throw new Error('PDF pages data is required')
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const allExtractedProducts: ExtractedProduct[] = []

    // Process each PDF page
    for (const page of pdfPages) {
      const { pageNumber, text, images } = page

      // Build prompt for AI analysis
      const parametersList = parameters.map((p: any) => 
        `- ${p.parameter_name} (Category: ${p.category}, Severity Levels: ${p.severity_levels.join(', ')})`
      ).join('\n')

      const prompt = `You are analyzing a skincare product catalog page from a PDF. Extract all product information and categorize each product.

Available Parameters:
${parametersList}

For each product found on this page, extract:
1. Product name
2. Product description (brief, 2-3 sentences)
3. Which parameter this product addresses (must match one from the list above)
4. What severity level this product is for (Mild, Moderate, or Severe)
5. Product image URL if visible
6. Product link if available
7. Whether this is a primary recommendation (true/false)

Page Content:
${text}

${images.length > 0 ? `\nThis page contains ${images.length} image(s). Analyze the images to identify products.` : ''}

Return a JSON array of products in this format:
[
  {
    "product_name": "Product Name",
    "product_description": "Brief description",
    "parameter_name": "Exact parameter name from the list",
    "severity_level": "Mild|Moderate|Severe",
    "product_image": "image URL if found",
    "product_link": "link if found",
    "is_primary": true/false
  }
]

If no products are found, return an empty array [].`

      try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        
        // Parse JSON from response (handle markdown code blocks)
        let jsonText = text.trim()
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```\n?/g, '').trim()
        }

        const products = JSON.parse(jsonText)
        
        if (Array.isArray(products)) {
          allExtractedProducts.push(...products)
        }
      } catch (error) {
        console.error(`Error processing page ${pageNumber}:`, error)
        // Continue with next page
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          products: allExtractedProducts,
          totalPages: pdfPages.length,
          totalProducts: allExtractedProducts.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error processing PDF:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process PDF'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})


