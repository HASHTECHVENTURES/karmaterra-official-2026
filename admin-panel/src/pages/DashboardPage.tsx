import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FileQuestion, Target, ShoppingBag, TrendingUp, Users, BookOpen } from 'lucide-react'

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const [questionsRes, parametersRes, productsRes] = await Promise.all([
          supabase.from('questionnaire_questions').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('skin_analysis_parameters').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('skin_parameter_products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        ])

        return {
          questions: questionsRes.count || 0,
          parameters: parametersRes.count || 0,
          products: productsRes.count || 0,
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        return {
          questions: 0,
          parameters: 0,
          products: 0,
        }
      }
    },
  })

  const statCards = [
    {
      title: 'Active Questions',
      value: stats?.questions || 0,
      icon: FileQuestion,
      color: 'bg-[#d4a574]',
    },
    {
      title: 'Analysis Parameters',
      value: stats?.parameters || 0,
      icon: Target,
      color: 'bg-[#7a9c5e]',
    },
    {
      title: 'Product Suggestions',
      value: stats?.products || 0,
      icon: ShoppingBag,
      color: 'bg-[#d4a574]',
    },
  ]

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a574]"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-semibold">Error loading dashboard</p>
          <p className="text-red-600 text-sm mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your KarmaTerra administration</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg shadow-sm border border-gray-100`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <a
            href="/users"
            className="p-4 border border-gray-200 rounded-lg hover:border-[#d4a574] hover:bg-[#d4a574]/10 transition-colors"
          >
            <Users className="w-6 h-6 text-[#d4a574] mb-2" />
            <h3 className="font-medium text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-600">View and manage app users</p>
          </a>
          <a
            href="/blogs"
            className="p-4 border border-gray-200 rounded-lg hover:border-[#d4a574] hover:bg-[#d4a574]/10 transition-colors"
          >
            <BookOpen className="w-6 h-6 text-[#d4a574] mb-2" />
            <h3 className="font-medium text-gray-900">Manage Blogs</h3>
            <p className="text-sm text-gray-600">Create and edit blog posts</p>
          </a>
          <a
            href="/questions"
            className="p-4 border border-gray-200 rounded-lg hover:border-[#d4a574] hover:bg-[#d4a574]/10 transition-colors"
          >
            <FileQuestion className="w-6 h-6 text-[#d4a574] mb-2" />
            <h3 className="font-medium text-gray-900">Skin Questions</h3>
            <p className="text-sm text-gray-600">Manage questionnaire questions</p>
          </a>
          <a
            href="/products"
            className="p-4 border border-gray-200 rounded-lg hover:border-[#d4a574] hover:bg-[#d4a574]/10 transition-colors"
          >
            <ShoppingBag className="w-6 h-6 text-[#d4a574] mb-2" />
            <h3 className="font-medium text-gray-900">Skin Products</h3>
            <p className="text-sm text-gray-600">Manage product suggestions</p>
          </a>
        </div>
      </div>
    </div>
  )
}


