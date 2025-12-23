import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Send, Bell, Users, RefreshCw, X, Search, Image as ImageIcon, FileText, Sparkles, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  link?: string
  target_audience: string
  scheduled_at?: string
  sent_at?: string
  created_at: string
  image_url?: string
  priority?: string
  template_name?: string
}

// Notification Templates - Tailored for Karma Terra Services
const NOTIFICATION_TEMPLATES = {
  analysis_ready: {
    name: 'Analysis Results Ready',
    title: 'Your Skin/Hair Analysis is Ready! 🔬',
    message: 'Your personalized analysis results are ready! Check your recommendations and product suggestions.',
    type: 'info',
    priority: 'high',
    template_name: 'analysis_ready',
    link: '/analysis-results',
  },
  product_recommendation: {
    name: 'New Product Recommendation',
    title: 'Perfect Product Match Found! ✨',
    message: 'We found products that match your skin/hair profile! Check them out now.',
    type: 'promo',
    priority: 'normal',
    template_name: 'product_recommendation',
    link: '/products',
  },
  analysis_reminder: {
    name: 'Analysis Reminder',
    title: 'Time for Your Analysis! ⏰',
    message: 'It\'s been a while since your last analysis. Update your profile to get fresh recommendations!',
    type: 'info',
    priority: 'normal',
    template_name: 'analysis_reminder',
    link: '/skin-analysis', // or /hair-analysis
  },
  new_blog_post: {
    name: 'New Blog Post',
    title: 'New Beauty Tips Available! 📖',
    message: 'Check out our latest blog post with expert skincare and haircare tips!',
    type: 'info',
    priority: 'normal',
    template_name: 'new_blog_post',
    link: '/blogs',
  },
  daily_tip: {
    name: 'Daily Beauty Tip',
    title: 'Your Daily Beauty Tip! 💡',
    message: 'Did you know? [Tip about skincare/haircare]. Learn more in the app!',
    type: 'info',
    priority: 'low',
    template_name: 'daily_tip',
    link: '/',
  },
  ask_karma_reminder: {
    name: 'Ask Karma Reminder',
    title: 'Ask Karma Anything! 🤖',
    message: 'Have questions about your skin or hair? Ask Karma AI for personalized advice!',
    type: 'info',
    priority: 'normal',
    template_name: 'ask_karma_reminder',
    link: '/ask-karma',
  },
  maintenance: {
    name: 'Maintenance Alert',
    title: 'Scheduled Maintenance 🔧',
    message: 'We\'ll be performing maintenance on [date]. Service may be temporarily unavailable.',
    type: 'alert',
    priority: 'high',
    template_name: 'maintenance',
    link: '/',
  },
  welcome: {
    name: 'Welcome Message',
    title: 'Welcome to Karma Terra! 🌱',
    message: 'Thank you for joining us! Start your journey by analyzing your skin or hair to get personalized recommendations.',
    type: 'info',
    priority: 'normal',
    template_name: 'welcome',
    link: '/skin-analysis',
  },
  product_launch: {
    name: 'New Product Launch',
    title: 'Exciting New Product Launch! 🎉',
    message: 'We\'ve just launched a new product that might be perfect for you! Check it out now.',
    type: 'promo',
    priority: 'normal',
    template_name: 'product_launch',
    link: '/products',
  },
  seasonal_tip: {
    name: 'Seasonal Care Tip',
    title: 'Seasonal Skincare/Haircare Tip! 🍂',
    message: 'As the season changes, your skin and hair needs change too. Get seasonal care tips!',
    type: 'info',
    priority: 'normal',
    template_name: 'seasonal_tip',
    link: '/blogs',
  },
}

export default function NotificationsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null)
  const [showDeviceDetails, setShowDeviceDetails] = useState(false)
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as Notification[]) || []
    },
  })

  // Check device tokens count - get both total devices and unique users
  const { data: deviceStats } = useQuery({
    queryKey: ['device-tokens-count'],
    queryFn: async () => {
      // Get total device tokens count
      const { count: totalDevices, error: countError } = await supabase
        .from('device_tokens')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error('Error counting device tokens:', countError)
        return { totalDevices: 0, uniqueUsers: 0 }
      }

      // Get unique users count (users who have at least one device token)
      const { count: uniqueUsers, error: usersError } = await supabase
        .from('device_tokens')
        .select('user_id', { count: 'exact', head: true })
      
      if (usersError) {
        console.error('Error counting unique users:', usersError)
        return { totalDevices: totalDevices || 0, uniqueUsers: 0 }
      }

      // Actually count distinct users properly
      const { data: distinctUsers, error: distinctError } = await supabase
        .from('device_tokens')
        .select('user_id')
      
      if (distinctError) {
        console.error('Error getting distinct users:', distinctError)
        return { totalDevices: totalDevices || 0, uniqueUsers: 0 }
      }

      const uniqueUserIds = new Set(distinctUsers?.map(d => d.user_id) || [])
      
      return {
        totalDevices: totalDevices || 0,
        uniqueUsers: uniqueUserIds.size
      }
    },
  })

  // Fetch device tokens with user details
  const { data: deviceTokensData } = useQuery({
    queryKey: ['device-tokens-details'],
    queryFn: async () => {
      const { data: tokens, error } = await supabase
        .from('device_tokens')
        .select(`
          id,
          user_id,
          token,
          platform,
          last_used,
          created_at,
          profiles(phone_number, full_name)
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching device tokens:', error)
        return []
      }
      return tokens || []
    },
    enabled: showDeviceDetails,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete user_notifications first (due to foreign key constraint)
      const { error: userNotifError } = await supabase
        .from('user_notifications')
        .delete()
        .eq('notification_id', id)

      if (userNotifError) {
        console.error('Error deleting user_notifications:', userNotifError)
        // Continue anyway - might not have user_notifications
      }

      // Delete the notification
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Notification deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: any) => {
      console.error('❌ Delete notification error:', error)
      toast.error(error.message || 'Failed to delete notification')
    },
  })

  const deleteDeviceTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('id', tokenId)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Device token deleted')
      queryClient.invalidateQueries({ queryKey: ['device-tokens-count'] })
      queryClient.invalidateQueries({ queryKey: ['device-tokens-details'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete device token')
    },
  })

  const cleanupOldTokensMutation = useMutation({
    mutationFn: async () => {
      // Get all device tokens grouped by user_id and platform
      const { data: allTokens, error: fetchError } = await supabase
        .from('device_tokens')
        .select('id, user_id, platform, last_used, created_at')
        .order('last_used', { ascending: false })
      
      if (fetchError) throw fetchError
      if (!allTokens || allTokens.length === 0) return { deleted: 0 }

      // Group by user_id and platform, keep only the most recent one
      const tokensToKeep = new Set<string>()
      const tokensToDelete: string[] = []
      const seen = new Map<string, boolean>() // key: user_id:platform

      for (const token of allTokens) {
        const key = `${token.user_id}:${token.platform}`
        if (!seen.has(key)) {
          // Keep the first (most recent) token for this user+platform
          tokensToKeep.add(token.id)
          seen.set(key, true)
        } else {
          // Mark older tokens for deletion
          tokensToDelete.push(token.id)
        }
      }

      if (tokensToDelete.length === 0) {
        return { deleted: 0, message: 'No duplicate tokens found' }
      }

      // Delete old tokens
      const { error: deleteError } = await supabase
        .from('device_tokens')
        .delete()
        .in('id', tokensToDelete)
      
      if (deleteError) throw deleteError

      return { deleted: tokensToDelete.length }
    },
    onSuccess: (result: any) => {
      toast.success(`Cleaned up ${result.deleted || 0} old/duplicate device token(s)`)
      queryClient.invalidateQueries({ queryKey: ['device-tokens-count'] })
      queryClient.invalidateQueries({ queryKey: ['device-tokens-details'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cleanup old tokens')
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      setSendingNotificationId(id)
      try {
        // Call the edge function to send push notifications
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
          body: { notification_id: id },
        })

        if (error) {
          console.error('❌ Edge Function error:', error)
          // Try to extract error message from error object
          let errorMessage = error.message || 'Failed to send notification'
          
          // Check if error has context with response body
          if (error.context?.body) {
            try {
              const errorBody = typeof error.context.body === 'string' 
                ? JSON.parse(error.context.body) 
                : error.context.body
              if (errorBody.error) {
                errorMessage = errorBody.error
              }
              if (errorBody.details) {
                errorMessage += `: ${errorBody.details}`
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
          
          throw new Error(errorMessage)
        }

        if (data?.error === 'NO_DEVICE_TOKENS') {
          throw new Error('No devices registered. Users need to log into the app and grant notification permissions first.')
        }

        if (data?.error) {
          throw new Error(data.error + (data.details ? `: ${data.details}` : ''))
        }

        if (data?.sent === 0) {
          toast.warning('Notification queued, but no devices are registered yet. Users need to log into the app first.')
        } else {
          toast.success(`Notification sent! ${data?.sent || 0} device(s) notified`)
        }
      } catch (error: any) {
        console.error('❌ Error in sendMutation:', error)
        throw error
      }
    },
    onSuccess: () => {
      setSendingNotificationId(null)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['device-tokens-count'] })
    },
    onError: (error: any) => {
      setSendingNotificationId(null)
      console.error('❌ Send notification error:', error)
      toast.error(error.message || 'Failed to send notification')
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading notifications...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1><p className="text-gray-600">Manage and view Notifications</p></div>
          <p className="text-sm text-gray-600 mt-1">
            {deviceStats !== undefined && (
              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => setShowDeviceDetails(!showDeviceDetails)}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  <Bell className="w-4 h-4" />
                  {deviceStats.totalDevices === 0 ? (
                    <span className="text-orange-600 font-medium">
                      No devices registered. Users need to log into the app first.
                    </span>
                  ) : (
                    <span className="text-[#d4a574] font-medium cursor-pointer">
                      {deviceStats.uniqueUsers} user{deviceStats.uniqueUsers !== 1 ? 's' : ''} with {deviceStats.totalDevices} device{deviceStats.totalDevices !== 1 ? 's' : ''} ready to receive notifications
                      <span className="ml-2 text-xs text-gray-500">(Click to view details)</span>
                    </span>
                  )}
                </button>
                
                {showDeviceDetails && deviceStats.totalDevices > 0 && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">Device Tokens Details</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Multiple tokens per user may indicate app reinstalls. Use "Cleanup" to keep only the most recent token per user+platform.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (confirm('This will delete old/duplicate device tokens, keeping only the most recent token for each user+platform combination. Continue?')) {
                              cleanupOldTokensMutation.mutate()
                            }
                          }}
                          disabled={cleanupOldTokensMutation.isPending}
                          className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 flex items-center gap-1"
                          title="Remove old/duplicate tokens (keeps only the most recent token per user+platform)"
                        >
                          {cleanupOldTokensMutation.isPending ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Cleaning...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3" />
                              Cleanup Old Tokens
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeviceDetails(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {deviceTokensData === undefined ? (
                      <div className="text-center py-4 text-gray-500">Loading device details...</div>
                    ) : deviceTokensData.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No device tokens found</div>
                    ) : (
                      <div className="space-y-3">
                        {deviceTokensData.map((device: any) => (
                          <div key={device.id} className="border-b border-gray-100 pb-3 last:border-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900">
                                    {device.profiles?.full_name || 'No Name'}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                    {device.platform}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">
                                  Phone: {device.profiles?.phone_number || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-500 font-mono break-all">
                                  Token: {device.token.substring(0, 50)}...
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Created: {new Date(device.created_at).toLocaleString()}
                                  {device.last_used && (
                                    <> • Last used: {new Date(device.last_used).toLocaleString()}</>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this device token? This will prevent notifications from being sent to this device.')) {
                                    deleteDeviceTokenMutation.mutate(device.id)
                                  }
                                }}
                                disabled={deleteDeviceTokenMutation.isPending}
                                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                                title="Delete this device token"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['device-tokens-count'] })
              toast.info('Refreshed device count')
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium shadow-sm"
            title="Refresh device count"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7a9c5e] text-white rounded-lg hover:bg-[#7a9c5e]/90"
          >
            <Plus className="w-5 h-5" />
            Create Notification
          </button>
        </div>
      </div>

      {showAddForm && (
        <NotificationForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false)
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          }}
        />
      )}

      <div className="space-y-4">
        {notifications?.map((notification) => (
          <div key={notification.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Image Preview */}
                {notification.image_url && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img
                      src={notification.image_url}
                      alt={notification.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    notification.type === 'info' ? 'bg-blue-100 text-blue-800' :
                    notification.type === 'promo' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                    notification.type === 'alert' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {notification.type}
                  </span>
                  {notification.priority && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                      notification.priority === 'low' ? 'bg-gray-100 text-gray-600' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {notification.priority}
                    </span>
                  )}
                  {notification.template_name && (
                    <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {notification.template_name}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-2">{notification.message}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {notification.target_audience === 'all' ? 'All Users' : 'Specific Users'}
                  </span>
                  {notification.sent_at ? (
                    <span>Sent: {new Date(notification.sent_at).toLocaleString()}</span>
                  ) : (
                    <span className="text-orange-600">Pending</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!notification.sent_at && (
                  <button
                    onClick={() => sendMutation.mutate(notification.id)}
                    disabled={deviceStats?.totalDevices === 0 || sendingNotificationId === notification.id}
                    className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={deviceStats?.totalDevices === 0 ? 'No devices registered yet' : 'Send notification'}
                  >
                    {sendingNotificationId === notification.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Now
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
                      deleteMutation.mutate(notification.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No notifications created yet</p>
        </div>
      )}
    </div>
  )
}

interface User {
  id: string
  phone_number: string
  full_name?: string
}

function NotificationForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    link: '',
    target_audience: 'all',
    scheduled_at: '',
    priority: 'normal',
    image_url: '',
    template_name: '',
  })
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const userPickerRef = useRef<HTMLDivElement>(null)

  // Close user picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userPickerRef.current && !userPickerRef.current.contains(event.target as Node)) {
        setShowUserPicker(false)
      }
    }

    if (showUserPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserPicker])

  // Fetch users for selection
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users', userSearchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, phone_number, full_name')
        .order('created_at', { ascending: false })
        .limit(100)

      if (userSearchTerm) {
        query = query.or(`phone_number.ilike.%${userSearchTerm}%,full_name.ilike.%${userSearchTerm}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data as User[]) || []
    },
    enabled: formData.target_audience === 'specific',
  })

  // Handle image upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return formData.image_url || null

    setUploadingImage(true)
    try {
      const fileExt = selectedImage.name.split('.').pop()
      const fileName = `notification-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `notifications/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('app-images')
        .upload(filePath, selectedImage, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket "app-images" not found. Please create it in Supabase Dashboard > Storage.')
        }
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('app-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error: any) {
      console.error('Image upload error:', error)
      throw new Error(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const applyTemplate = (templateKey: keyof typeof NOTIFICATION_TEMPLATES) => {
    const template = NOTIFICATION_TEMPLATES[templateKey]
    setFormData({
      ...formData,
      title: template.title,
      message: template.message,
      type: template.type,
      priority: template.priority,
      template_name: template.template_name,
      link: template.link || formData.link, // Preserve existing link or use template link
    })
    toast.success(`Template "${template.name}" applied!`)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate specific users selection
      if (formData.target_audience === 'specific' && selectedUserIds.length === 0) {
        throw new Error('Please select at least one user for specific users notification')
      }

      // Upload image if selected
      let imageUrl = formData.image_url || null
      if (selectedImage) {
        imageUrl = await uploadImage()
      }

      // Clean the data: convert empty strings to null for optional fields
      const dataToInsert = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        target_audience: formData.target_audience,
        link: formData.link.trim() || null,
        scheduled_at: formData.scheduled_at.trim() || null,
        priority: formData.priority || 'normal',
        image_url: imageUrl,
        template_name: formData.template_name || null,
      }
      
      // Insert notification
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert([dataToInsert])
        .select()
        .single()

      if (notifError) throw notifError

      // If specific users, create user_notifications entries
      if (formData.target_audience === 'specific' && notification && selectedUserIds.length > 0) {
        const userNotificationEntries = selectedUserIds.map(userId => ({
          user_id: userId,
          notification_id: notification.id,
          is_read: false,
        }))

        const { error: userNotifError } = await supabase
          .from('user_notifications')
          .insert(userNotificationEntries)

        if (userNotifError) {
          console.error('Error creating user_notifications:', userNotifError)
          // Don't throw - notification is already created
          toast.warning('Notification created, but some user mappings failed')
        }
      }
    },
    onSuccess: () => {
      toast.success('Notification created')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create notification')
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Create Notification</h2>

        {/* Notification Templates */}
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#d4a574]" />
            <label className="block text-sm font-semibold text-gray-800">Quick Templates for Karma Terra</label>
          </div>
          <p className="text-xs text-gray-600 mb-3">Click any template to auto-fill the form with relevant content</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(NOTIFICATION_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key as keyof typeof NOTIFICATION_TEMPLATES)}
                className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 hover:shadow-sm transition-all text-left bg-white"
                title={template.message}
              >
                <div className="font-medium text-gray-900 text-xs">{template.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    template.priority === 'high' ? 'bg-red-500' :
                    template.priority === 'low' ? 'bg-gray-400' :
                    'bg-yellow-500'
                  }`}></span>
                  {template.type}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="info">Info</option>
                <option value="promo">Promo</option>
                <option value="alert">Alert</option>
                <option value="update">Update</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="low">Low (Marketing)</option>
                <option value="normal">Normal (Default)</option>
                <option value="high">High (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <select
                value={formData.target_audience}
                onChange={(e) => {
                  setFormData({ ...formData, target_audience: e.target.value })
                  if (e.target.value === 'all') {
                    setSelectedUserIds([])
                    setShowUserPicker(false)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Users</option>
                <option value="specific">Specific Users</option>
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Notification Image/Banner (Optional)
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={uploadingImage}
              />
              <p className="text-xs text-gray-500">Max size: 5MB. Recommended: 1200x600px for best display</p>
              
              {/* Image Preview */}
              {(imagePreview || formData.image_url) && (
                <div className="relative mt-2">
                  <img
                    src={imagePreview || formData.image_url || ''}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null)
                      setSelectedImage(null)
                      setFormData({ ...formData, image_url: '' })
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* URL Option */}
              <div className="mt-2">
                <label className="block text-xs text-gray-600 mb-1">Or enter image URL:</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value })
                    if (e.target.value) {
                      setImagePreview(e.target.value)
                      setSelectedImage(null)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* User Selection for Specific Users */}
          {formData.target_audience === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Users ({selectedUserIds.length} selected)
              </label>
              
              {/* Selected Users Display */}
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg min-h-[60px]">
                  {selectedUserIds.map((userId) => {
                    const user = users?.find(u => u.id === userId)
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {user?.full_name || user?.phone_number || 'Unknown'}
                        <button
                          onClick={() => setSelectedUserIds(prev => prev.filter(id => id !== userId))}
                          className="ml-1 hover:text-blue-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* User Picker */}
              <div className="relative" ref={userPickerRef}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      onFocus={() => setShowUserPicker(true)}
                      placeholder="Search users by phone or name..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => setShowUserPicker(!showUserPicker)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {showUserPicker ? 'Hide' : 'Show'} Users
                  </button>
                </div>

                {/* User List Dropdown */}
                {showUserPicker && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-sm border border-gray-100-lg max-h-60 overflow-y-auto">
                    {usersLoading ? (
                      <div className="p-4 text-center text-gray-500">Loading users...</div>
                    ) : users && users.length > 0 ? (
                      <div className="divide-y">
                        {users.map((user) => {
                          const isSelected = selectedUserIds.includes(user.id)
                          return (
                            <div
                              key={user.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedUserIds(prev => prev.filter(id => id !== user.id))
                                } else {
                                  setSelectedUserIds(prev => [...prev, user.id])
                                }
                              }}
                              className={`p-3 cursor-pointer hover:bg-gray-50 ${
                                isSelected ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {user.full_name || 'No Name'}
                                  </div>
                                  <div className="text-sm text-gray-500">{user.phone_number}</div>
                                </div>
                                {isSelected && (
                                  <span className="text-blue-600 font-semibold">✓</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">No users found</div>
                    )}
                  </div>
                )}
              </div>

              {selectedUserIds.length === 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  Please select at least one user to send this notification
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending || 
              uploadingImage ||
              !formData.title || 
              !formData.message ||
              (formData.target_audience === 'specific' && selectedUserIds.length === 0)
            }
            className="px-4 py-2 bg-[#7a9c5e] text-white rounded-lg hover:bg-[#7a9c5e]/90 disabled:opacity-50"
          >
            {uploadingImage ? 'Uploading Image...' : saveMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}




