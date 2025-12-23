import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications'
import { supabase } from '@/lib/supabase'
import { Capacitor } from '@capacitor/core'

// Track if we've already initialized to prevent duplicate initialization
let isInitialized = false
let registrationListener: any = null
let registrationErrorListener: any = null

/**
 * Initialize push notifications
 * Call this when the app starts
 */
export async function initializePushNotifications(userId?: string): Promise<void> {
  console.log('🔔 initializePushNotifications called', { userId, platform: Capacitor.getPlatform(), isNative: Capacitor.isNativePlatform(), isInitialized })
  
  // Only initialize on native platforms (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Push notifications only work on native platforms. Current platform:', Capacitor.getPlatform())
    return
  }

  // Prevent duplicate initialization
  if (isInitialized) {
    console.log('⚠️ Push notifications already initialized, skipping...')
    return
  }

  try {
    // IMPORTANT: Set up listeners BEFORE registering!
    // Listen for registration success
    console.log('👂 Setting up registration listener...')
    registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('📱 Push registration success, token:', token.value)
      console.log('📱 Full token object:', JSON.stringify(token, null, 2))
      
      // Save token to database if user is logged in
      if (userId) {
        console.log('💾 Saving token for user:', userId)
        await saveDeviceToken(userId, token.value)
      } else {
        console.warn('⚠️ No userId provided, cannot save token')
      }
    })

    // Listen for registration errors
    registrationErrorListener = await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Error on registration:', error)
      console.error('❌ Registration error details:', JSON.stringify(error, null, 2))
    })

    // Listen for push notifications received while app is open
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('📬 Push notification received:', notification)
    })

    // Listen for push notification actions (when user taps notification)
    PushNotifications.addListener('pushNotificationActionPerformed', async (action: ActionPerformed) => {
      console.log('👆 Push notification action performed:', action)
      const data = action.notification.data
      
      if (data?.link) {
        // Handle deep linking
        const link = data.link
        
        // If it's a full URL, open in browser
        if (link.startsWith('http://') || link.startsWith('https://')) {
          window.location.href = link
        } 
        // If it's an app route, navigate within app
        else if (link.startsWith('/')) {
          window.location.href = link
        }
        // Handle special deep link patterns
        else if (link.startsWith('app://')) {
          const route = link.replace('app://', '/')
          window.location.href = route
        }
        // Default: try to navigate
        else {
          window.location.href = link
        }
      }
      
      // Mark notification as read if notification_id is provided
      if (data?.notification_id && userId) {
        try {
          await supabase
            .from('user_notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('notification_id', data.notification_id)
        } catch (error) {
          console.error('Error marking notification as read:', error)
        }
      }
    })
    
    console.log('✅ All listeners set up')

    console.log('📱 Requesting push notification permissions...')
    // Request permission to use push notifications
    const permissionResult = await PushNotifications.requestPermissions()
    console.log('📱 Permission result:', permissionResult)
    
    if (permissionResult.receive === 'granted') {
      console.log('✅ Permission granted, registering for push notifications...')
      // Register with Apple / Google to receive push notifications
      await PushNotifications.register()
      console.log('✅ Push notifications registered successfully - waiting for token...')
      
      // Sometimes the token comes immediately, sometimes with a delay
      // Set a timeout to check if token was received
      setTimeout(() => {
        console.log('⏰ Checking registration status after 3 seconds...')
      }, 3000)
    } else if (permissionResult.receive === 'prompt') {
      console.log('⏳ Permission prompt shown, waiting for user response...')
      // User hasn't responded yet, but we can still register
      await PushNotifications.register()
      console.log('✅ Push notifications registered (awaiting user response)')
      
      // Check again after user might have responded
      setTimeout(() => {
        console.log('⏰ Checking registration status after 5 seconds (user may have responded)...')
      }, 5000)
    } else {
      console.log('❌ Push notification permission denied or not available:', permissionResult)
      console.log('💡 User may need to enable notifications in device settings')
      return
    }

    // Mark as initialized
    isInitialized = true
    console.log('✅ Push notification initialization complete')

  } catch (error) {
    console.error('❌ Error initializing push notifications:', error)
    isInitialized = false // Reset on error so we can try again
  }
}

/**
 * Clean up push notification listeners
 */
export async function removePushNotificationListeners(): Promise<void> {
  if (registrationListener) {
    await registrationListener.remove()
    registrationListener = null
  }
  if (registrationErrorListener) {
    await registrationErrorListener.remove()
    registrationErrorListener = null
  }
  isInitialized = false
  console.log('🧹 Push notification listeners removed')
}

/**
 * Save device token to database
 */
async function saveDeviceToken(userId: string, token: string): Promise<void> {
  try {
    console.log('💾 Attempting to save device token for user:', userId)
    console.log('📱 Token:', token.substring(0, 20) + '...')
    
    // Use upsert to handle both insert and update in one operation
    // This avoids the 409 conflict error
    const { data, error } = await supabase
      .from('device_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: Capacitor.getPlatform(),
        last_used: new Date().toISOString()
      }, {
        onConflict: 'user_id,token',
        ignoreDuplicates: false
      })
      .select()
    
    if (error) {
      console.error('❌ Error saving device token:', error)
      console.error('❌ Error code:', error.code)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error details:', error.details)
      console.error('❌ Error hint:', error.hint)
      
      // If upsert fails, try insert (might fail if exists, that's okay)
      if (error.code === '23505') { // Unique violation
        console.log('🔄 Token already exists, updating last_used...')
        const { error: updateError } = await supabase
          .from('device_tokens')
          .update({ last_used: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('token', token)
        
        if (updateError) {
          console.error('❌ Error updating token:', updateError)
        } else {
          console.log('✅ Device token updated (already existed)')
        }
      }
      return
    }
    
    console.log('✅ Device token saved to database:', data)
  } catch (error: any) {
    console.error('❌ Error saving device token:', error)
    console.error('❌ Error message:', error?.message)
    // Don't throw - we don't want to break the app if token saving fails
  }
}

/**
 * Remove device token when user logs out
 */
export async function removeDeviceToken(userId: string, token: string): Promise<void> {
  try {
    await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token)
    console.log('✅ Device token removed')
  } catch (error) {
    console.error('❌ Error removing device token:', error)
  }
}




