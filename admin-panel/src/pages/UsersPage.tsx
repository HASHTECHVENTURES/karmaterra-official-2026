import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Search, Trash2, Download, Eye, X, Sparkles, Scissors, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { SkeletonLoader, TableSkeleton } from '@/components/SkeletonLoader'

interface UserStats {
  skinAnalysisCount: number
  hairAnalysisCount: number
  askKarmaCount: number
  skinAnalyses: any[]
  hairAnalyses: any[]
  conversations: any[]
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data: users, isLoading, error: usersError } = useQuery({
    queryKey: ['users', searchTerm, page],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone_number, gender, country, state, city, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await query.range(from, to)

      if (error) {
        console.error('Error fetching users:', error)
        throw error
      }
      return { data: data || [], count: count || 0 }
    },
    onError: (error: any) => {
      console.error('Users query error:', error)
      toast.error('Failed to load users: ' + (error.message || 'Unknown error'))
    },
  })

  // Fetch user stats when a user is selected
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', selectedUser?.id],
    queryFn: async (): Promise<UserStats | null> => {
      if (!selectedUser?.id) return null

      try {
        // Get skin analyses
        const { data: skinData, error: skinError } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('user_id', selectedUser.id)
          .eq('analysis_type', 'skin')
          .order('created_at', { ascending: false })

        if (skinError) console.error('Error fetching skin analyses:', skinError)

        // Get hair analyses
        const { data: hairData, error: hairError } = await supabase
          .from('analysis_history')
          .select('*')
          .eq('user_id', selectedUser.id)
          .eq('analysis_type', 'hair')
          .order('created_at', { ascending: false })

        if (hairError) console.error('Error fetching hair analyses:', hairError)

        // Get ASK KARMA conversations with message counts in a single query
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            *,
            messages(count)
          `)
          .eq('user_id', selectedUser.id)
          .order('created_at', { ascending: false })

        if (conversationsError) console.error('Error fetching conversations:', conversationsError)

        // Get message counts for all conversations in a single query
        const conversationIds = (conversationsData || []).map(conv => conv.id)
        let messageCountsMap: Record<string, number> = {}
        
        if (conversationIds.length > 0) {
          const { data: messageCounts, error: countsError } = await supabase
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', conversationIds)
          
          if (countsError) {
            console.error('Error counting messages:', countsError)
          } else {
            // Count messages per conversation
            messageCounts?.forEach(msg => {
              messageCountsMap[msg.conversation_id] = (messageCountsMap[msg.conversation_id] || 0) + 1
            })
          }
        }

        const conversationsWithCounts = (conversationsData || []).map(conv => ({
          ...conv,
          message_count: messageCountsMap[conv.id] || 0
        }))

        return {
          skinAnalysisCount: skinData?.length || 0,
          hairAnalysisCount: hairData?.length || 0,
          askKarmaCount: conversationsData?.length || 0,
          skinAnalyses: skinData || [],
          hairAnalyses: hairData || [],
          conversations: conversationsWithCounts || []
        }
      } catch (error) {
        console.error('Error fetching user stats:', error)
        return null
      }
    },
    enabled: !!selectedUser?.id,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted successfully')
    },
  })

  const exportUsers = () => {
    if (!users) return

    const csv = [
      ['Name', 'Email', 'Phone', 'Gender', 'City', 'State', 'Country', 'Created At'].join(','),
      ...(users?.data || []).map((u: any) =>
        [
          u.full_name || '',
          u.email || '',
          u.phone_number || '',
          u.gender || '',
          u.city || '',
          u.state || '',
          u.country || '',
          new Date(u.created_at).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Users exported successfully')
  }

  const handleViewDetails = async (user: any) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <SkeletonLoader variant="text" width="300px" className="mb-2" />
          <SkeletonLoader variant="text" width="200px" />
        </div>
        <TableSkeleton rows={10} cols={6} />
      </div>
    )
  }

  if (usersError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Users</h2>
          <p className="text-red-600">{usersError instanceof Error ? usersError.message : 'Unknown error occurred'}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">View and manage app users</p>
      </div>
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={exportUsers}
            className="flex items-center gap-2 px-4 py-2 bg-[#7a9c5e] text-white rounded-lg hover:bg-[#7a9c5e]/90"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.data?.map((user: any) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.phone_number || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {[user.city, user.state, user.country].filter(Boolean).join(', ') || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${user.full_name || 'this user'}?`)) {
                            deleteMutation.mutate(user.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users?.data?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {users && users.count > pageSize && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, users.count)} of {users.count} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {page} of {Math.ceil((users.count || 0) / pageSize)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil((users.count || 0) / pageSize)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          stats={userStats}
          isLoading={statsLoading}
          onClose={() => {
            setShowUserDetails(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}

function UserDetailsModal({
  user,
  stats,
  isLoading,
  onClose,
}: {
  user: any
  stats: UserStats | null
  isLoading: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
            <p className="text-sm text-gray-500 mt-1">{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* User Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">{user.phone_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="text-sm font-medium text-gray-900">{user.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900">
                  {[user.city, user.state, user.country].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Joined</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* AI Service Usage Stats */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Service Usage</h3>
            {isLoading ? (
              <div className="text-center py-8">Loading stats...</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-6 h-6 text-[#d4a574]" />
                    <div>
                      <p className="text-sm text-gray-500">Know Your Skin</p>
                      <p className="text-2xl font-bold text-[#d4a574]">{stats?.skinAnalysisCount || 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Analysis Reports</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Scissors className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Know Your Hair</p>
                      <p className="text-2xl font-bold text-purple-600">{stats?.hairAnalysisCount || 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Analysis Reports</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Ask Karma</p>
                      <p className="text-2xl font-bold text-blue-600">{stats?.askKarmaCount || 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Conversations</p>
                </div>
              </div>
            )}
          </div>

          {/* Skin Analysis Reports */}
          {stats && stats.skinAnalyses.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#d4a574]" />
                Know Your Skin Reports ({stats.skinAnalyses.length})
              </h3>
              <div className="space-y-3">
                {stats.skinAnalyses.map((analysis: any) => {
                  const report = analysis.analysis_result
                  return (
                    <div key={analysis.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(analysis.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {report?.result?.overallSeverity && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                report.result.overallSeverity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                                report.result.overallSeverity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {report.result.overallSeverity}
                              </span>
                            )}
                          </div>
                          {report?.result?.summary && (
                            <p className="text-sm text-gray-600 line-clamp-2">{report.result.summary}</p>
                          )}
                          {report?.result?.parameters && (
                            <p className="text-xs text-gray-500 mt-1">
                              {report.result.parameters.length} parameters analyzed
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hair Analysis Reports */}
          {stats && stats.hairAnalyses.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-purple-600" />
                Know Your Hair Reports ({stats.hairAnalyses.length})
              </h3>
              <div className="space-y-3">
                {stats.hairAnalyses.map((analysis: any) => {
                  const report = analysis.analysis_result
                  return (
                    <div key={analysis.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(analysis.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {report?.hair_analysis?.["Overall Hair Health"]?.severity && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                report.hair_analysis["Overall Hair Health"].severity === 'Mild' ? 'bg-[#d4a574]/10 text-[#b8956a]' :
                                report.hair_analysis["Overall Hair Health"].severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {report.hair_analysis["Overall Hair Health"].severity}
                              </span>
                            )}
                          </div>
                          {report?.hair_analysis?.["Overall Hair Health"]?.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {report.hair_analysis["Overall Hair Health"].description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ask Karma Conversations */}
          {stats && stats.conversations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Ask Karma Conversations ({stats.conversations.length})
              </h3>
              <div className="space-y-3">
                {stats.conversations.map((conversation: any) => (
                  <div key={conversation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">{conversation.title}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {conversation.message_count || 0} messages
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Started: {new Date(conversation.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {conversation.updated_at && (
                          <p className="text-xs text-gray-500">
                            Last active: {new Date(conversation.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {stats && stats.skinAnalyses.length === 0 && stats.hairAnalyses.length === 0 && stats.conversations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No AI service usage data available for this user.</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


