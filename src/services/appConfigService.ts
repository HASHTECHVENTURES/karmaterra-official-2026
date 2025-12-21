import { supabase } from '@/lib/supabase'

export interface AppConfig {
  id: string
  maintenance_mode: boolean
  force_update: boolean
  min_app_version: string
  contact_email: string | null
  contact_phone: string | null
  support_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Get app configuration (only one row exists)
 */
export async function getAppConfigs(): Promise<AppConfig | null> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching app configs:', error)
      return null
    }

    return (data as AppConfig) || null
  } catch (error) {
    console.error('Error fetching app configs:', error)
    return null
  }
}

/**
 * Check if app is in maintenance mode
 */
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const config = await getAppConfigs()
    return config?.maintenance_mode || false
  } catch (error) {
    console.error('Error checking maintenance mode:', error)
    return false
  }
}

/**
 * Check if app update is required
 */
export async function isUpdateRequired(currentVersion: string): Promise<boolean> {
  try {
    const config = await getAppConfigs()
    if (!config?.force_update) return false
    
    // Simple version comparison (you might want to use a proper semver library)
    const minVersion = config.min_app_version || '0.0.0'
    return currentVersion < minVersion
  } catch (error) {
    console.error('Error checking update requirement:', error)
    return false
  }
}


