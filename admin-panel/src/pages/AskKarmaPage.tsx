import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Search, Trash2, Eye, MessageSquare, X, Brain, CheckCircle, AlertCircle, Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  is_archived: boolean
  user?: {
    full_name?: string
    email?: string
  }
  message_count?: number
}

interface Message {
  id: string
  conversation_id: string
  user_id: string
  content: string
  is_user_message: boolean
  created_at: string
}

interface Document {
  id: string
  title: string
  category: string
  file_url: string
  file_type: string
  extracted_text?: string
  created_at: string
}

export default function AskKarmaPage() {
  const [activeTab, setActiveTab] = useState<'conversations' | 'knowledge'>('conversations')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showMessages, setShowMessages] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: conversations } = useQuery({
    queryKey: ['ask-karma-conversations', searchTerm],
    queryFn: async () => {
      // Build query with joins - search will be applied after fetching if needed
      let query = supabase
        .from('conversations')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('updated_at', { ascending: false })

      // Apply search filter at database level for title (conversation field)
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error

      // Filter by user profile fields if search term provided (after fetching)
      let filteredData = data || []
      if (searchTerm) {
        filteredData = filteredData.filter((conv: any) => {
          const titleMatch = conv.title?.toLowerCase().includes(searchTerm.toLowerCase())
          const nameMatch = conv.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
          const emailMatch = conv.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
          return titleMatch || nameMatch || emailMatch
        })
      }

      // Get all conversation IDs for batch message count query
      const conversationIds = filteredData.map((conv: any) => conv.id)
      let messageCountsMap: Record<string, number> = {}
      
      if (conversationIds.length > 0) {
        // Get message counts for all conversations in a single query
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
        
        if (messagesError) {
          console.error('Error fetching message counts:', messagesError)
        } else {
          // Count messages per conversation
          messages?.forEach(msg => {
            messageCountsMap[msg.conversation_id] = (messageCountsMap[msg.conversation_id] || 0) + 1
          })
        }
      }

      // Map conversations with user profiles and message counts
      const conversationsWithDetails = filteredData.map((conv: any) => ({
        ...conv,
        user: conv.profiles || null,
        message_count: messageCountsMap[conv.id] || 0
      }))

      return conversationsWithDetails as Conversation[]
    },
  })

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return []
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data as Message[]) || []
    },
    enabled: !!selectedConversation?.id && showMessages,
  })

  // Fetch knowledge base documents
  const { data: knowledgeDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as Document[]) || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('conversations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ask-karma-conversations'] })
      toast.success('Conversation deleted successfully')
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_documents').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
      toast.success('Document deleted successfully')
    },
  })

  const handleViewMessages = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowMessages(true)
  }

  const activeDocs = knowledgeDocs?.filter(doc => doc.extracted_text) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">Ask Karma</h1><p className="text-gray-600">Manage and view Ask Karma</p></div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'conversations'
                ? 'border-[#d4a574] text-[#d4a574]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Conversations
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'knowledge'
                ? 'border-[#d4a574] text-[#d4a574]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Brain className="w-4 h-4 inline mr-2" />
            AI Knowledge Base
          </button>
        </div>
      </div>

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Knowledge Base Documents</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload documents to enhance Ask Karma responses. All documents are automatically included in every conversation.
              </p>
            </div>
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-5 h-5" />
              Upload Document
            </button>
          </div>

          {/* Status */}
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  Knowledge Base Status
                  {activeDocs.length > 0 ? (
                    <CheckCircle className="w-5 h-5 text-[#d4a574]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                </h3>
                {activeDocs.length > 0 ? (
                  <p className="text-sm text-gray-700">
                    ✅ <strong>{activeDocs.length}</strong> document(s) are actively being used in Ask Karma responses.
                  </p>
                ) : (
                  <p className="text-sm text-yellow-700">
                    ⚠️ No knowledge documents found. Upload documents to enhance Ask Karma responses.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Documents Grid */}
          {docsLoading ? (
            <div className="text-center py-12">Loading documents...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {knowledgeDocs?.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <FileText className="w-8 h-8 text-purple-600" />
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {doc.category || 'General'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{doc.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {doc.file_type.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                    {doc.extracted_text && (
                      <p className="text-xs text-gray-500 mb-4 line-clamp-3">
                        {doc.extracted_text.substring(0, 150)}...
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {doc.extracted_text ? (
                        <span className="text-xs bg-[#d4a574]/10 text-[#b8956a] px-2 py-1 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          No Text Extracted
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this document?')) {
                            deleteDocMutation.mutate(doc.id)
                          }
                        }}
                        className="ml-auto text-red-600 hover:text-red-900 text-sm"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {knowledgeDocs?.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Upload Your First Document
                  </button>
                </div>
              )}
            </>
          )}

          {showUploadForm && (
            <UploadForm
              onClose={() => setShowUploadForm(false)}
              onSuccess={() => {
                setShowUploadForm(false)
                queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
              }}
            />
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by conversation title, user name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-transparent"
              />
            </div>
          </div>

          {/* Knowledge Base Status in Conversations Tab */}
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  AI Knowledge Base Status
                  {activeDocs.length > 0 ? (
                    <CheckCircle className="w-5 h-5 text-[#d4a574]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                </h3>
                {activeDocs.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      ✅ <strong>{activeDocs.length}</strong> knowledge document(s) are actively being used in Ask Karma responses.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activeDocs.slice(0, 5).map((doc) => (
                        <span 
                          key={doc.id}
                          className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full"
                        >
                          {doc.title}
                        </span>
                      ))}
                      {activeDocs.length > 5 && (
                        <span className="text-xs text-gray-600 px-2 py-1">
                          +{activeDocs.length - 5} more
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      All uploaded documents are automatically included in every Ask Karma conversation. 
                      <button
                        onClick={() => setActiveTab('knowledge')}
                        className="text-purple-600 hover:text-purple-800 font-medium ml-1"
                      >
                        Manage documents →
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-700">
                      ⚠️ No knowledge documents found. Ask Karma will work but won't have access to your custom knowledge base.
                    </p>
                    <p className="text-xs text-gray-600">
                      <button
                        onClick={() => setActiveTab('knowledge')}
                        className="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Upload documents in AI Knowledge Base →
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conversations Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversations?.map((conversation) => (
                    <tr key={conversation.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{conversation.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {conversation.user?.full_name || conversation.user?.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{conversation.message_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(conversation.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(conversation.updated_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewMessages(conversation)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Messages"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this conversation?')) {
                                deleteMutation.mutate(conversation.id)
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

            {conversations?.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No conversations found</p>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Showing {conversations?.length || 0} conversation(s)
          </div>
        </>
      )}

      {/* Messages Modal */}
      {showMessages && selectedConversation && (
        <MessagesModal
          conversation={selectedConversation}
          messages={messages || []}
          isLoading={messagesLoading}
          onClose={() => {
            setShowMessages(false)
            setSelectedConversation(null)
          }}
        />
      )}
    </div>
  )
}

function MessagesModal({
  conversation,
  messages,
  isLoading,
  onClose,
}: {
  conversation: Conversation
  messages: Message[]
  isLoading: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{conversation.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {conversation.user?.full_name || conversation.user?.email || 'Unknown User'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No messages in this conversation</div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_user_message ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.is_user_message
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.is_user_message ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
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

function UploadForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    file: null as File | null,
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!formData.file) throw new Error('Please select a file')

      // Upload file to Supabase Storage
      const fileExt = formData.file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `knowledge-base/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(filePath, formData.file)

      if (uploadError) {
        // Provide more helpful error messages
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
          throw new Error('Storage bucket "knowledge-base" not found. Please create it in Supabase Dashboard > Storage, or contact your administrator.')
        }
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('knowledge-base').getPublicUrl(filePath)

      // Extract text if PDF (simplified - you'd need PDF.js for actual extraction)
      let extractedText = null
      if (formData.file.type === 'application/pdf') {
        // Placeholder - implement PDF text extraction
        extractedText = 'PDF text extraction would happen here'
      } else if (formData.file.type === 'text/plain') {
        extractedText = await formData.file.text()
      }

      // Save document record
      const { error } = await supabase.from('knowledge_documents').insert([
        {
          title: formData.title,
          category: formData.category,
          file_url: publicUrl,
          file_type: formData.file.type,
          extracted_text: extractedText,
        },
      ])

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully')
      onSuccess()
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to upload document'
      toast.error(errorMessage)
      console.error('Upload error:', error)
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">Upload Document</h2>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Skincare, Haircare"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF or TXT) *</label>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending || !formData.title || !formData.file}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}






