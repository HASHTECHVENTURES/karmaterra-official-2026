import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Search, CheckCircle, XCircle, Clock, Star, MessageSquare, User } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/SkeletonLoader'

export default function FeedbackPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null)
  const queryClient = useQueryClient()

  const { data: feedbacks, isLoading, error: feedbackError } = useQuery({
    queryKey: ['feedbacks', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_feedback')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            phone_number
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (searchTerm) {
        query = query.or(`subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.limit(100)

      if (error) {
        console.error('Error fetching feedback:', error)
        throw error
      }
      return data || []
    },
  })

  // Handle errors using useEffect
  useEffect(() => {
    if (feedbackError) {
      console.error('Feedback query error:', feedbackError)
      toast.error('Failed to load feedback: ' + ((feedbackError as any)?.message || 'Unknown error'))
    }
  }, [feedbackError])

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status, admin_notes: adminNotes })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      toast.success('Feedback status updated')
      setSelectedFeedback(null)
    },
    onError: (error: any) => {
      toast.error('Failed to update status: ' + (error.message || 'Unknown error'))
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'reviewed':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-[#d4a574]/10 text-[#b8956a]'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'reviewed':
        return <MessageSquare className="w-4 h-4" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />
      case 'closed':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Feedback</h1>
        <p className="text-gray-600">View and manage user feedback submissions</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Error Message */}
      {feedbackError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error loading feedback</p>
          <p className="text-red-600 text-sm mt-1">
            {feedbackError instanceof Error ? feedbackError.message : 'Unknown error occurred'}
          </p>
          <p className="text-red-500 text-xs mt-2">
            Please check your database connection and ensure the user_feedback table exists.
          </p>
        </div>
      )}

      {/* Feedback List */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : feedbacks && Array.isArray(feedbacks) && feedbacks.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feedbacks.map((feedback: any) => (
                  <tr key={feedback.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {feedback.profiles?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">{feedback.profiles?.email || feedback.profiles?.phone_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {feedback.feedback_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{feedback.subject || 'No subject'}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{feedback.message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {feedback.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{feedback.rating}/5</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(feedback.status)}`}>
                        {getStatusIcon(feedback.status)}
                        {feedback.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedFeedback(feedback)}
                        className="text-[#d4a574] hover:text-[#b8956a]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No feedback found</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Feedback Details</h2>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <div className="text-gray-900">
                    {selectedFeedback.profiles?.full_name || 'Unknown'} ({selectedFeedback.profiles?.email || selectedFeedback.profiles?.phone_number})
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <span className="px-2 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                    {selectedFeedback.feedback_type}
                  </span>
                </div>

                {selectedFeedback.subject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <div className="text-gray-900">{selectedFeedback.subject}</div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">{selectedFeedback.message}</div>
                </div>

                {selectedFeedback.rating && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-medium">{selectedFeedback.rating}/5</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedFeedback.status}
                    onChange={(e) => {
                      setSelectedFeedback({ ...selectedFeedback, status: e.target.value })
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                  <textarea
                    value={selectedFeedback.admin_notes || ''}
                    onChange={(e) => {
                      setSelectedFeedback({ ...selectedFeedback, admin_notes: e.target.value })
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
                    placeholder="Add admin notes..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({
                        id: selectedFeedback.id,
                        status: selectedFeedback.status,
                        adminNotes: selectedFeedback.admin_notes,
                      })
                    }}
                    className="flex-1 bg-[#d4a574] text-white py-2 px-4 rounded-lg hover:bg-[#d4a574]/90 transition"
                  >
                    Update Status
                  </button>
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

