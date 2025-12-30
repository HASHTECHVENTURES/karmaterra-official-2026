import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Users, TrendingUp, MapPin, Calendar, BarChart3, Bell, Smartphone, MessageSquare, Scissors, Sparkles, Activity } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      // Basic counts
      const [usersRes, analysisRes, blogsRes, notificationsRes, conversationsRes, deviceTokensRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('analysis_history').select('id', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('notifications').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('device_tokens').select('id', { count: 'exact', head: true }),
      ])

      // User growth (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      // User growth (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { count: weekUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      // Daily user growth (last 7 days)
      const dailyGrowth = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString())

        dailyGrowth.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: count || 0
        })
      }

      // Analysis trends (last 30 days) - FIXED: Added user_id to select, moved before serviceUsage
      const { data: recentAnalyses } = await supabase
        .from('analysis_history')
        .select('analysis_type, created_at, user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Service usage breakdown - FIXED: Now uses recentAnalyses (last 30 days) instead of all-time data
      const serviceUsage = {
        skin: recentAnalyses?.filter(a => a.analysis_type === 'skin').length || 0,
        hair: recentAnalyses?.filter(a => a.analysis_type === 'hair').length || 0,
        askKarma: (conversationsRes.count || 0),
      }

      // Platform breakdown
      const { data: deviceData } = await supabase
        .from('device_tokens')
        .select('platform, user_id')

      const platformBreakdown = {
        android: new Set(deviceData?.filter(d => d.platform === 'android').map(d => d.user_id) || []).size,
        ios: new Set(deviceData?.filter(d => d.platform === 'ios').map(d => d.user_id) || []).size,
      }

      // Notification performance - use same query for consistency
      const { data: notificationData } = await supabase
        .from('notifications')
        .select('id, sent_at, created_at, target_audience')

      const notificationsSent = notificationData?.filter(n => n.sent_at).length || 0
      const notificationsPending = notificationData?.filter(n => !n.sent_at).length || 0
      // Use actual count from fetched data instead of separate count query for consistency
      const totalNotificationsActual = notificationData?.length || 0

      // Ask Karma usage
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id, created_at')

      const askKarmaMessages = messagesData?.length || 0
      const avgMessagesPerConversation = conversationsRes.count 
        ? Math.round(askKarmaMessages / conversationsRes.count) 
        : 0

      // Gender breakdown
      const { data: genderData } = await supabase
        .from('profiles')
        .select('gender')
      
      const genderBreakdown = genderData?.reduce((acc: any, user: any) => {
        const gender = user.gender || 'Unknown'
        acc[gender] = (acc[gender] || 0) + 1
        return acc
      }, {})

      // Top locations
      const { data: locationData } = await supabase
        .from('profiles')
        .select('city, state, country')
        .limit(100)

      const locationCounts: any = {}
      locationData?.forEach((user: any) => {
        const location = [user.city, user.state, user.country].filter(Boolean).join(', ') || 'Unknown'
        locationCounts[location] = (locationCounts[location] || 0) + 1
      })

      const topLocations = Object.entries(locationCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([location, count]: any) => ({ location, count }))

      // Active users (users who did analysis in last 30 days) - FIXED: Now properly filters out undefined user_ids
      const activeUserIds = new Set(
        recentAnalyses
          ?.map(a => a.user_id)
          .filter((id): id is string => id !== null && id !== undefined) || []
      )
      const activeUsers = activeUserIds.size

      // Most common analysis type - FIXED: Now uses recentAnalyses (30 days) and handles tie-break properly
      const analysisTypeCounts = {
        skin: recentAnalyses?.filter(a => a.analysis_type === 'skin').length || 0,
        hair: recentAnalyses?.filter(a => a.analysis_type === 'hair').length || 0,
      }
      const mostPopularService = analysisTypeCounts.skin > analysisTypeCounts.hair 
        ? 'Skin Analysis' 
        : analysisTypeCounts.hair > analysisTypeCounts.skin 
          ? 'Hair Analysis' 
          : 'Equal'

      // Calculate total platform users (sum of unique users across platforms)
      const totalPlatformUsers = platformBreakdown.android + platformBreakdown.ios

      return {
        totalUsers: usersRes.count || 0,
        recentUsers: recentUsers || 0,
        weekUsers: weekUsers || 0,
        totalAnalyses: analysisRes.count || 0,
        publishedBlogs: blogsRes.count || 0,
        totalNotifications: totalNotificationsActual || notificationsRes.count || 0, // Use actual count from data for consistency
        notificationsSent,
        notificationsPending,
        totalConversations: conversationsRes.count || 0,
        totalMessages: askKarmaMessages,
        avgMessagesPerConversation,
        totalDevices: totalPlatformUsers, // Changed to show unique users with devices, not total device tokens
        genderBreakdown: genderBreakdown || {},
        topLocations,
        dailyGrowth,
        serviceUsage,
        platformBreakdown,
        activeUsers,
        mostPopularService,
        recentAnalysesCount: recentAnalyses?.length || 0,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#7a9c5e]"></div>
        <p className="mt-4 text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  const maxDailyCount = Math.max(...(stats?.dailyGrowth?.map(d => d.count) || [0]), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive app usage statistics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
            <Users className="w-12 h-12 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            +{stats?.recentUsers || 0} in last 30 days • +{stats?.weekUsers || 0} this week
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Analyses</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalAnalyses || 0}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.activeUsers || 0} active users (30 days)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Notifications Sent</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.notificationsSent || 0}</p>
            </div>
            <Bell className="w-12 h-12 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.notificationsPending || 0} pending • {stats?.totalNotifications || 0} total
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ask Karma</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalConversations || 0}</p>
            </div>
            <MessageSquare className="w-12 h-12 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.totalMessages || 0} messages • {stats?.avgMessagesPerConversation || 0} avg/conv
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            User Growth (Last 7 Days)
          </h2>
          <div className="space-y-2">
            {stats?.dailyGrowth?.map((day, index) => {
              const percentage = (day.count / maxDailyCount) * 100
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-20">{day.date}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${percentage}%` }}
                    >
                      {day.count > 0 && (
                        <span className="text-xs text-white font-medium">{day.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-700 font-medium w-8 text-right">{day.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Service Usage Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 flex-shrink-0" />
            Service Usage
          </h2>
          <div className="space-y-4">
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate">Know Your Skin</span>
                </div>
                <span className="text-sm text-gray-600 font-semibold flex-shrink-0">{stats?.serviceUsage?.skin || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-2 rounded-full max-w-full"
                  style={{ 
                    width: `${Math.min(stats?.totalAnalyses ? ((stats.serviceUsage?.skin || 0) / stats.totalAnalyses * 100) : 0, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Scissors className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate">Know Your Hair</span>
                </div>
                <span className="text-sm text-gray-600 font-semibold flex-shrink-0">{stats?.serviceUsage?.hair || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full max-w-full"
                  style={{ 
                    width: `${Math.min(stats?.totalAnalyses ? ((stats.serviceUsage?.hair || 0) / stats.totalAnalyses * 100) : 0, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate">Ask Karma</span>
                </div>
                <span className="text-sm text-gray-600 font-semibold flex-shrink-0">{stats?.serviceUsage?.askKarma || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full max-w-full"
                  style={{ 
                    width: `${Math.min(stats?.totalUsers ? ((stats.serviceUsage?.askKarma || 0) / stats.totalUsers * 100) : 0, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 truncate">
                Most Popular: <span className="font-semibold text-gray-700">{stats?.mostPopularService || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform & Demographics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Platform Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Platform Distribution
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Android</span>
                <span className="text-sm text-gray-600">{stats?.platformBreakdown?.android || 0} users</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${(stats?.platformBreakdown?.android || 0) + (stats?.platformBreakdown?.ios || 0) > 0 
                      ? ((stats.platformBreakdown?.android || 0) / ((stats.platformBreakdown?.android || 0) + (stats.platformBreakdown?.ios || 0)) * 100) 
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">iOS</span>
                <span className="text-sm text-gray-600">{stats?.platformBreakdown?.ios || 0} users</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ 
                    width: `${(stats?.platformBreakdown?.android || 0) + (stats?.platformBreakdown?.ios || 0) > 0 
                      ? ((stats.platformBreakdown?.ios || 0) / ((stats.platformBreakdown?.android || 0) + (stats.platformBreakdown?.ios || 0)) * 100) 
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Users with Devices: <span className="font-semibold text-gray-700">{stats?.totalDevices || 0}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                (Total Users: {stats?.totalUsers || 0})
              </p>
            </div>
          </div>
        </div>

        {/* Gender Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Gender Distribution</h2>
          <div className="space-y-3">
            {Object.entries(stats?.genderBreakdown || {}).map(([gender, count]: any) => {
              const percentage = stats?.totalUsers
                ? Math.round((count / stats.totalUsers) * 100)
                : 0
              return (
                <div key={gender}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{gender}</span>
                    <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Locations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Top Locations
          </h2>
          <div className="space-y-3">
            {stats?.topLocations?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{item.location}</span>
                <span className="text-sm text-gray-600 font-semibold">{item.count} users</span>
              </div>
            ))}
            {(!stats?.topLocations || stats.topLocations.length === 0) && (
              <p className="text-sm text-gray-500">No location data available</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
