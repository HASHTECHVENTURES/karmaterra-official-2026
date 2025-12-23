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




