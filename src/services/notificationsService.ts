import { supabase } from '@/lib/supabase'

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  target_audience: string
  is_active: boolean
  scheduled_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface UserNotification {
  id: string
  user_id: string
  notification_id: string
  is_read: boolean
  read_at: string | null
  created_at: string
  notification?: Notification
}

/**
 * Get active notifications for a user
 * @param userId - User ID
 * @param includeRead - Whether to include read notifications (default: true)
 */
export async function getUserNotifications(userId: string, includeRead: boolean = true): Promise<UserNotification[]> {
  try {
    let query = supabase
      .from('user_notifications')
      .select(`
        *,
        notification:notifications(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // If includeRead is false, only get unread notifications
    if (!includeRead) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user notifications:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      // Throw error so component can handle it
      throw new Error(error.message || 'Failed to load notifications')
    }

    return (data || []) as UserNotification[]
  } catch (error: any) {
    console.error('Error fetching user notifications:', error)
    // Re-throw to let component handle it
    throw error
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(userNotificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', userNotificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      throw new Error(error.message || 'Failed to mark notification as read')
    }

    return true
  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error getting unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

/**
 * Delete a user notification (remove it from user's notification list)
 */
export async function deleteUserNotification(userNotificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', userNotificationId)

    if (error) {
      console.error('Error deleting user notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting user notification:', error)
    return false
  }
}


