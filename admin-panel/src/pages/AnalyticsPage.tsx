import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Users, TrendingUp, MapPin, Calendar, BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const [usersRes, analysisRes, blogsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('analysis_history').select('id', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('is_published', true),
      ])

      // Get user growth (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Get gender breakdown
      const { data: genderData } = await supabase
        .from('profiles')
        .select('gender')
      
      const genderBreakdown = genderData?.reduce((acc: any, user: any) => {
        const gender = user.gender || 'Unknown'
        acc[gender] = (acc[gender] || 0) + 1
        return acc
      }, {})

      // Get top locations
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

      return {
        totalUsers: usersRes.count || 0,
        recentUsers: recentUsers || 0,
        totalAnalyses: analysisRes.count || 0,
        publishedBlogs: blogsRes.count || 0,
        genderBreakdown: genderBreakdown || {},
        topLocations,
      }
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading analytics...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">View app usage statistics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
            <Users className="w-12 h-12 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            +{stats?.recentUsers || 0} in last 30 days
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
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Published Blogs</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.publishedBlogs || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Growth Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalUsers
                  ? Math.round(((stats.recentUsers || 0) / stats.totalUsers) * 100)
                  : 0}
                %
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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



