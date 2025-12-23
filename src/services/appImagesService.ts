import { supabase } from '@/lib/supabase'

export interface AppImage {
  id: string
  category: string
  image_name: string
  image_url: string
  recommended_width: number | null
  recommended_height: number | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

/**
 * Get all images for a specific category
 */
export async function getAppImages(category: string): Promise<AppImage[]> {
  try {
    const { data, error } = await supabase
      .from('app_images')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching app images:', error)
      return []
    }

    return (data || []) as AppImage[]
  } catch (error) {
    console.error('Error fetching app images:', error)
    return []
  }
}

/**
 * Get a single image by name
 */
export async function getAppImageByName(imageName: string): Promise<AppImage | null> {
  try {
    const { data, error } = await supabase
      .from('app_images')
      .select('*')
      .eq('image_name', imageName)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching app image:', error)
      return null
    }

    return data as AppImage
  } catch (error) {
    console.error('Error fetching app image:', error)
    return null
  }
}

/**
 * Get all app images grouped by category
 */
export async function getAllAppImages(): Promise<Record<string, AppImage[]>> {
  try {
    const { data, error } = await supabase
      .from('app_images')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching all app images:', error)
      return {}
    }

    // Group by category
    const grouped: Record<string, AppImage[]> = {}
    ;(data || []).forEach((image: AppImage) => {
      if (!grouped[image.category]) {
        grouped[image.category] = []
      }
      grouped[image.category].push(image)
    })

    return grouped
  } catch (error) {
    console.error('Error fetching all app images:', error)
    return {}
  }
}




