import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_PROJECT_ID = 'karmaterra-auth'

interface PushNotificationRequest {
  notification_id: string
}

// Helper function to get numeric date (Unix timestamp)
function getNumericDate(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

// Get OAuth2 access token for FCM using service account
async function getAccessToken(): Promise<string> {
  try {
    const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
    
    if (!serviceAccountJson) {
      throw new Error('FCM_SERVICE_ACCOUNT_JSON is not set')
    }

    console.log('📝 Parsing service account JSON...')
    const serviceAccount = JSON.parse(serviceAccountJson)
    console.log('✅ Service account parsed, client_email:', serviceAccount.client_email)
    
    // Create JWT for OAuth2
    const now = getNumericDate(new Date())
    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    console.log('🔐 Creating JWT token...')
    // Get private key in PEM format
    const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n')
    
    // Convert PEM to DER format for Web Crypto API
    const pemHeader = '-----BEGIN PRIVATE KEY-----'
    const pemFooter = '-----END PRIVATE KEY-----'
    const pemContents = privateKeyPem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '')
    
    // Decode base64 to get DER format
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
    
    // Create JWT manually using Web Crypto API
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    }
    
    // Base64URL encode header and payload
    const base64UrlEncode = (str: string): string => {
      return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    }
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header))
    const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload))
    const unsignedToken = `${encodedHeader}.${encodedPayload}`
    
    // Import private key for signing (DER format)
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    )
    
    // Sign the token
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(unsignedToken)
    )
    
    // Base64URL encode the signature
    const encodedSignature = base64UrlEncode(
      String.fromCharCode(...new Uint8Array(signature))
    )
    
    const jwt = `${unsignedToken}.${encodedSignature}`
    console.log('✅ JWT created successfully')

    // Exchange JWT for access token
    console.log('🔄 Exchanging JWT for access token...')
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ OAuth2 token exchange failed:', errorText)
      throw new Error(`Failed to get access token: ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ Access token obtained successfully')
    return data.access_token
  } catch (error: any) {
    console.error('❌ Error in getAccessToken:', error)
    throw new Error(`getAccessToken failed: ${error.message}`)
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { notification_id } = await req.json() as PushNotificationRequest

    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: 'notification_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get notification details
    const { data: notification, error: notifError } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single()

    if (notifError || !notification) {
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get device tokens based on target audience
    let deviceTokens: { token: string; user_id: string }[] = []
    
    console.log('📊 Notification target_audience:', notification.target_audience)
    
    if (notification.target_audience === 'specific') {
      // For specific users, get tokens only for users in user_notifications
      console.log('👥 Fetching specific users for notification:', notification_id)
      const { data: userNotifications, error: userNotifError } = await supabaseClient
        .from('user_notifications')
        .select('user_id')
        .eq('notification_id', notification_id)

      if (userNotifError) {
        console.error('❌ Error fetching user notifications:', userNotifError)
        throw new Error(`Error fetching user notifications: ${userNotifError.message}`)
      }

      console.log('👥 Found user_notifications:', userNotifications?.length || 0)

      if (!userNotifications || userNotifications.length === 0) {
        console.log('⚠️ No specific users found for this notification')
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No specific users selected for this notification.',
            sent: 0,
            error: 'NO_SPECIFIC_USERS'
          }),
          { 
            status: 200, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }

      const userIds = userNotifications.map(un => un.user_id)
      console.log('👥 User IDs to send to:', userIds)
      
      const { data: tokens, error: tokensError } = await supabaseClient
        .from('device_tokens')
        .select('token, user_id')
        .in('user_id', userIds)

      if (tokensError) {
        console.error('❌ Error fetching device tokens:', tokensError)
        throw new Error(`Error fetching device tokens: ${tokensError.message}`)
      }

      console.log('📱 Found device tokens for specific users:', tokens?.length || 0)
      deviceTokens = tokens || []
    } else {
      // For 'all' users, get all device tokens
      const { data: tokens, error: tokensError } = await supabaseClient
        .from('device_tokens')
        .select('token, user_id')

      if (tokensError) {
        throw new Error(`Error fetching device tokens: ${tokensError.message}`)
      }

      deviceTokens = tokens || []
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      // Don't mark as sent if no tokens - keep it pending
      console.log('⚠️ No device tokens found in database')
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No device tokens found. Users need to log into the app and grant notification permissions first.',
          sent: 0,
          error: 'NO_DEVICE_TOKENS'
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    // Get access token for FCM
    console.log('🔑 Getting FCM access token...')
    const accessToken = await getAccessToken()
    console.log('✅ Access token obtained, sending to', deviceTokens.length, 'devices...')

    // Determine priority based on notification priority field
    const androidPriority = notification.priority === 'high' ? 'high' : 
                           notification.priority === 'low' ? 'normal' : 'high'
    
    // Send push notifications using FCM v1 API
    const sendPromises = deviceTokens.map(async (deviceToken) => {
      try {
        const fcmMessage: any = {
          message: {
            token: deviceToken.token,
            notification: {
              title: notification.title,
              body: notification.message,
            },
            data: {
              notification_id: notification.id,
              type: notification.type || 'info',
              link: notification.link || '',
              priority: notification.priority || 'normal',
              template_name: notification.template_name || '',
            },
            android: {
              priority: androidPriority,
              notification: {
                sound: 'default',
                channel_id: 'default',
                icon: 'https://rputuujndhlocoitsbxn.supabase.co/storage/v1/object/public/app-images/notifications/ic_stat_icon.png', // Notification icon from Supabase storage
                // Add image if available
                ...(notification.image_url && {
                  image: notification.image_url,
                }),
              },
            },
          },
        }

        // Add image to notification for better display (FCM supports this)
        if (notification.image_url) {
          fcmMessage.message.notification.image = notification.image_url
        }

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmMessage),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to send to token ${deviceToken.token.substring(0, 20)}...: ${errorText}`)
          return { success: false, token: deviceToken.token }
        }

        return { success: true, token: deviceToken.token }
      } catch (error) {
        console.error(`Error sending to token:`, error)
        return { success: false, token: deviceToken.token, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    // Update notification as sent
    await supabaseClient
      .from('notifications')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', notification_id)

    // Create user_notifications entries for all users who received it
    // (Only for 'all' audience - 'specific' already has entries created during notification creation)
    if (notification.target_audience === 'all') {
      const userIds = [...new Set(deviceTokens.map(dt => dt.user_id))]
      const userNotificationEntries = userIds.map(userId => ({
        user_id: userId,
        notification_id: notification.id,
        is_read: false,
      }))

      // Use upsert to avoid duplicates
      await supabaseClient
        .from('user_notifications')
        .upsert(userNotificationEntries, { onConflict: 'user_id,notification_id' })
    }
    // For 'specific' audience, user_notifications entries are already created when notification was created

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successful} notifications, ${failed} failed`,
        sent: successful,
        failed: failed,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    console.error('❌ Edge Function Error:', error)
    console.error('❌ Error name:', error?.name)
    console.error('❌ Error message:', error?.message)
    console.error('❌ Error stack:', error?.stack)
    
    // Provide more detailed error information
    let errorMessage = error?.message || 'Unknown error occurred'
    let errorDetails = error?.toString() || 'No additional details'
    
    // Check for specific error types
    if (errorMessage.includes('FCM_SERVICE_ACCOUNT_JSON')) {
      errorMessage = 'FCM Service Account JSON secret is not configured. Please set it in Supabase secrets.'
    } else if (errorMessage.includes('access token')) {
      errorMessage = 'Failed to authenticate with Firebase. Check your service account credentials.'
    } else if (errorMessage.includes('JWT')) {
      errorMessage = 'Failed to create JWT token. Check your service account private key.'
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        type: error?.name || 'Error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})








