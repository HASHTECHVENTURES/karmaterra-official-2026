import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Search, CheckCircle, XCircle, Clock, AlertTriangle, User, Flag } from 'lucide-react'
import { toast } from 'sonner'

export default function ServiceReportsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const queryClient = useQueryClient()

  const { data: reports, isLoading, error: fetchError } = useQuery({
    queryKey: ['service-reports', searchTerm, statusFilter, serviceFilter],
    queryFn: async () => {
      let query = supabase
        .from('service_reports')
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

      if (serviceFilter !== 'all') {
        query = query.eq('service_name', serviceFilter)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Optimized: Add pagination (keep full select for joins)
      const pageSize = 20
      const page = 1
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data, error } = await query.range(from, to)

      if (error) {
        console.error('Error fetching service reports:', error)
        throw error
      }
      return data || []
    },
    onError: (error: any) => {
      console.error('Service reports query error:', error)
      toast.error('Failed to load service reports: ' + (error.message || 'Unknown error'))
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const { error } = await supabase
        .from('service_reports')
        .update({ status, admin_notes: adminNotes })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-reports'] })
      toast.success('Service report status updated')
      setSelectedReport(null)
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
        return <AlertTriangle className="w-4 h-4" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />
      case 'closed':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatServiceName = (serviceName: string) => {
    return serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Reports</h1>
        <p className="text-gray-600">View and manage service issue reports</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
          />
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
        >
          <option value="all">All Services</option>
          <option value="know_your_skin">Know Your Skin</option>
          <option value="know_your_hair">Know Your Hair</option>
          <option value="ask_karma">Ask Karma</option>
        </select>
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
      {fetchError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error loading service reports</p>
          <p className="text-red-600 text-sm mt-1">
            {fetchError instanceof Error ? fetchError.message : 'Unknown error occurred'}
          </p>
          <p className="text-red-500 text-xs mt-2">
            Please check your database connection and ensure the service_reports table exists.
          </p>
        </div>
      )}

      {/* Reports List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4a574]"></div>
          <p className="mt-4 text-gray-600">Loading service reports...</p>
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report: any) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.profiles?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">{report.profiles?.email || report.profiles?.phone_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                        {formatServiceName(report.service_name)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                        {report.report_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{report.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{report.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedReport(report)}
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
          <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No service reports found</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Service Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <div className="text-gray-900">
                    {selectedReport.profiles?.full_name || 'Unknown'} ({selectedReport.profiles?.email || selectedReport.profiles?.phone_number})
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <span className="px-2 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800">
                    {formatServiceName(selectedReport.service_name)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <span className="px-2 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
                    {selectedReport.report_type}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <div className="text-gray-900">{selectedReport.title}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">{selectedReport.description}</div>
                </div>

                {selectedReport.screenshot_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot</label>
                    <img src={selectedReport.screenshot_url} alt="Screenshot" className="max-w-full h-auto rounded border" />
                  </div>
                )}

                {selectedReport.device_info && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Info</label>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                      {JSON.stringify(selectedReport.device_info, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedReport.status}
                    onChange={(e) => {
                      setSelectedReport({ ...selectedReport, status: e.target.value })
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
                    value={selectedReport.admin_notes || ''}
                    onChange={(e) => {
                      setSelectedReport({ ...selectedReport, admin_notes: e.target.value })
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
                        id: selectedReport.id,
                        status: selectedReport.status,
                        adminNotes: selectedReport.admin_notes,
                      })
                    }}
                    className="flex-1 bg-[#d4a574] text-white py-2 px-4 rounded-lg hover:bg-[#d4a574]/90 transition"
                  >
                    Update Status
                  </button>
                  <button
                    onClick={() => setSelectedReport(null)}
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

