import { supabase } from '@/lib/supabase'

export interface ParameterProduct {
  id: string
  parameter_id: string
  severity_level: string
  product_name: string
  product_description: string | null
  product_link: string | null
  product_image: string | null
  display_order: number
  is_active: boolean
  is_primary: boolean
}

export interface Parameter {
  id: string
  parameter_name: string
  parameter_description: string | null
  category: string
  severity_levels: string[]
}

/**
 * Get all active parameters
 */
export async function getActiveParameters(): Promise<Parameter[]> {
  try {
    const { data, error } = await supabase
      .from('skin_analysis_parameters')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching parameters:', error)
      return []
    }

    return (data || []).map((p) => ({
      ...p,
      severity_levels: p.severity_levels as string[],
    })) as Parameter[]
  } catch (error) {
    console.error('Error fetching parameters:', error)
    return []
  }
}

/**
 * Get products for a specific parameter and severity level
 */
export async function getProductsForParameter(
  parameterId: string,
  severityLevel: string
): Promise<ParameterProduct[]> {
  try {
    const { data, error } = await supabase
      .from('skin_parameter_products')
      .select('*')
      .eq('parameter_id', parameterId)
      .eq('severity_level', severityLevel)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching products:', error)
      return []
    }

    return (data || []) as ParameterProduct[]
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

/**
 * Get products for multiple parameters and their severities
 * Used when user has multiple parameters detected
 */
export async function getProductsForParameters(
  parameterSeverities: Array<{ parameterId: string; severity: string }>
): Promise<ParameterProduct[]> {
  try {
    const allProducts: ParameterProduct[] = []

    for (const { parameterId, severity } of parameterSeverities) {
      const products = await getProductsForParameter(parameterId, severity)
      allProducts.push(...products)
    }

    // Remove duplicates and sort by primary first, then display order
    const uniqueProducts = Array.from(
      new Map(allProducts.map((p) => [p.id, p])).values()
    ).sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1
      }
      return a.display_order - b.display_order
    })

    return uniqueProducts
  } catch (error) {
    console.error('Error fetching products for parameters:', error)
    return []
  }
}

/**
 * Get parameter by name
 */
export async function getParameterByName(parameterName: string): Promise<Parameter | null> {
  try {
    const { data, error } = await supabase
      .from('skin_analysis_parameters')
      .select('*')
      .eq('parameter_name', parameterName)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching parameter:', error)
      return null
    }

    return {
      ...data,
      severity_levels: data.severity_levels as string[],
    } as Parameter
  } catch (error) {
    console.error('Error fetching parameter:', error)
    return null
  }
}






