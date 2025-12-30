import { supabase } from '@/lib/supabase'

export interface HairProduct {
  id: string
  hair_type: string
  product_name: string
  product_description: string | null
  product_link: string | null
  product_image: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HairParameterProduct {
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

export interface HairParameter {
  id: string
  parameter_name: string
  parameter_description: string | null
  category: string
  severity_levels: string[]
}

/**
 * Get all products for a specific hair type
 */
export async function getHairProducts(hairType: string): Promise<HairProduct[]> {
  try {
    const { data, error } = await supabase
      .from('hair_type_products')
      .select('*')
      .eq('hair_type', hairType.toLowerCase())
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching hair products:', error)
      return []
    }

    return (data || []) as HairProduct[]
  } catch (error) {
    console.error('Error fetching hair products:', error)
    return []
  }
}

/**
 * Get all hair products (no longer grouped by hair type - all products together)
 */
export async function getAllHairProducts(): Promise<Record<string, HairProduct[]>> {
  try {
    const { data, error } = await supabase
      .from('hair_type_products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching all hair products:', error)
      return {}
    }

    // Return all products under 'all' key (no hair type categorization)
    return {
      all: (data || []) as HairProduct[]
    }
  } catch (error) {
    console.error('Error fetching all hair products:', error)
    return {}
  }
}

/**
 * Get all hair products (flat list)
 */
export async function getAllHairProductsList(): Promise<HairProduct[]> {
  try {
    const { data, error } = await supabase
      .from('hair_type_products')
      .select('*')
      .eq('is_active', true)
      .order('hair_type', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching all hair products:', error)
      return []
    }

    return (data || []) as HairProduct[]
  } catch (error) {
    console.error('Error fetching all hair products:', error)
    return []
  }
}

/**
 * Get all active hair parameters
 */
export async function getActiveHairParameters(): Promise<HairParameter[]> {
  try {
    const { data, error } = await supabase
      .from('hair_analysis_parameters')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching hair parameters:', error)
      return []
    }

    return (data || []).map((p) => ({
      ...p,
      severity_levels: p.severity_levels as string[],
    })) as HairParameter[]
  } catch (error) {
    console.error('Error fetching hair parameters:', error)
    return []
  }
}

/**
 * Get products for a specific hair parameter and severity level
 */
export async function getHairProductsForParameter(
  parameterId: string,
  severityLevel: string
): Promise<HairParameterProduct[]> {
  try {
    const { data, error } = await supabase
      .from('hair_parameter_products')
      .select('*')
      .eq('parameter_id', parameterId)
      .eq('severity_level', severityLevel)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching hair products:', error)
      return []
    }

    return (data || []) as HairParameterProduct[]
  } catch (error) {
    console.error('Error fetching hair products:', error)
    return []
  }
}

/**
 * Get hair parameter by name
 */
export async function getHairParameterByName(parameterName: string): Promise<HairParameter | null> {
  try {
    const { data, error } = await supabase
      .from('hair_analysis_parameters')
      .select('*')
      .eq('parameter_name', parameterName)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching hair parameter:', error)
      return null
    }

    return {
      ...data,
      severity_levels: data.severity_levels as string[],
    } as HairParameter
  } catch (error) {
    console.error('Error fetching hair parameter:', error)
    return null
  }
}







