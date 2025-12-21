import { useState, useEffect } from 'react'
import { Bell, X, AlertCircle, CheckCircle, Info, AlertTriangle, Trash2 } from 'lucide-react'
import { getUserNotifications, markNotificationAsRead, deleteUserNotification, UserNotification } from '@/services/notificationsService'
import { useAuth } from '@/App'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadNotifications()
      // Refresh notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.id])

  const loadNotifications = async () => {
    if (!user?.id) return
    
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
      // Count only unread notifications
      const unread = data.filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await markNotificationAsRead(notificationId)
      if (success) {
        loadNotifications()
      } else {
        console.error('Failed to mark notification as read')
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error)
      alert('Failed to mark notification as read. Please try again.')
    }
  }

  const handleDelete = async (userNotificationId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering mark as read
    try {
      await deleteUserNotification(userNotificationId)
      loadNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  if (!user?.id) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                <p className="text-red-600 font-medium mb-2">Oops! Something went wrong</p>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                  onClick={loadNotifications}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Try Again
                </button>
              </div>
            ) : loading ? (
              <div className="p-8 text-center text-gray-500">
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((userNotif) => {
                  const notif = userNotif.notification
                  if (!notif) return null

                  return (
                    <div
                      key={userNotif.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative ${
                        userNotif.is_read ? 'opacity-75' : ''
                      }`}
                      onClick={() => !userNotif.is_read && handleMarkAsRead(userNotif.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-gray-800">
                              {notif.title}
                            </h4>
                            {userNotif.is_read && (
                              <span className="text-xs text-gray-400">(Read)</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(userNotif.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


