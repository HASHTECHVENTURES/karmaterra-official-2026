import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Save, Settings, Key, Plus, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface AppConfig {
  id?: string
  maintenance_mode: boolean
  force_update: boolean
  min_app_version: string
  contact_email: string
  contact_phone: string
  support_url: string
}

interface ApiKey {
  id: string
  key_name: string
  api_key: string
  is_active: boolean
  usage_count: number
  last_used_at: string | null
  created_at: string
  notes: string | null
}

export default function ConfigPage() {
  const queryClient = useQueryClient()
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({})
  const [newApiKey, setNewApiKey] = useState({ key_name: '', api_key: '', notes: '' })

  const { data: config, isLoading } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return (data as AppConfig) || {
        maintenance_mode: false,
        force_update: false,
        min_app_version: '1.0.0',
        contact_email: '',
        contact_phone: '',
        support_url: '',
      }
    },
  })

  const [formData, setFormData] = useState<AppConfig>({
    maintenance_mode: false,
    force_update: false,
    min_app_version: '1.0.0',
    contact_email: '',
    contact_phone: '',
    support_url: '',
  })

  useEffect(() => {
    if (config) {
      setFormData(config)
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config?.id) {
        const { error } = await supabase
          .from('app_config')
          .update(formData)
          .eq('id', config.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('app_config').insert([formData])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Configuration saved')
      queryClient.invalidateQueries({ queryKey: ['app-config'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save configuration')
    },
  })

  // Fetch API keys
  const { data: apiKeys, isLoading: loadingKeys, refetch: refetchKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as ApiKey[]) || []
    },
  })

  // Add new API key
  const addApiKeyMutation = useMutation({
    mutationFn: async () => {
      if (!newApiKey.key_name.trim() || !newApiKey.api_key.trim()) {
        throw new Error('Key name and API key are required')
      }
      if (!newApiKey.api_key.startsWith('AIza')) {
        throw new Error('Invalid Gemini API key format')
      }

      const { error } = await supabase
        .from('api_keys')
        .insert([{
          key_name: newApiKey.key_name.trim(),
          api_key: newApiKey.api_key.trim(),
          notes: newApiKey.notes.trim() || null,
          is_active: true,
        }])

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('API key added successfully')
      setNewApiKey({ key_name: '', api_key: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add API key')
    },
  })

  // Toggle API key active status
  const toggleApiKeyMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !is_active, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('API key status updated')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update API key')
    },
  })

  // Delete API key
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('API key deleted')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete API key')
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading configuration...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">App Configuration</h1><p className="text-gray-600">Manage and view App Configuration</p></div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.maintenance_mode}
                onChange={(e) => setFormData({ ...formData, maintenance_mode: e.target.checked })}
                className="rounded"
              />
              <div>
                <span className="font-medium text-gray-900">Maintenance Mode</span>
                <p className="text-sm text-gray-500">App will show maintenance message to users</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.force_update}
                onChange={(e) => setFormData({ ...formData, force_update: e.target.checked })}
                className="rounded"
              />
              <div>
                <span className="font-medium text-gray-900">Force App Update</span>
                <p className="text-sm text-gray-500">Users must update to continue using the app</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum App Version</label>
              <input
                type="text"
                value={formData.min_app_version}
                onChange={(e) => setFormData({ ...formData, min_app_version: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 2.0.0"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="support@karmaterra.in"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="+91 1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support URL</label>
              <input
                type="url"
                value={formData.support_url}
                onChange={(e) => setFormData({ ...formData, support_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://support.karmaterra.in"
              />
            </div>
          </div>
        </div>

        {/* API Keys Management Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Gemini API Keys Management
          </h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>🔒 Secure API Key Management:</strong> API keys are stored securely in the database and automatically used by edge functions. 
              Keys are never exposed to clients. Edge functions will use these keys in round-robin fashion or based on user assignments.
            </p>
          </div>

          {/* Add New API Key */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New API Key
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newApiKey.key_name}
                  onChange={(e) => setNewApiKey({ ...newApiKey, key_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Primary Key, Backup Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={newApiKey.api_key}
                  onChange={(e) => setNewApiKey({ ...newApiKey, api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                  placeholder="AIzaSy..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={newApiKey.notes}
                  onChange={(e) => setNewApiKey({ ...newApiKey, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Free tier, Production key"
                />
              </div>
              <button
                onClick={() => addApiKeyMutation.mutate()}
                disabled={addApiKeyMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {addApiKeyMutation.isPending ? 'Adding...' : 'Add API Key'}
              </button>
            </div>
          </div>

          {/* List of API Keys */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Active API Keys</h3>
              <button
                onClick={() => refetchKeys()}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {loadingKeys ? (
              <div className="text-center py-8 text-gray-500">Loading API keys...</div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No API keys found. Add your first key above.
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className={`border rounded-lg p-4 ${
                      key.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{key.key_name}</h4>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              key.is_active
                                ? 'bg-[#d4a574]/10 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {key.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>Usage: {key.usage_count}</span>
                          {key.last_used_at && (
                            <span>Last used: {new Date(key.last_used_at).toLocaleString()}</span>
                          )}
                          {key.notes && <span className="italic">• {key.notes}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type={showApiKeys[key.id] ? 'text' : 'password'}
                            value={key.api_key}
                            readOnly
                            className="flex-1 px-2 py-1 text-sm font-mono bg-gray-100 border border-gray-300 rounded"
                          />
                          <button
                            onClick={() => setShowApiKeys({ ...showApiKeys, [key.id]: !showApiKeys[key.id] })}
                            className="p-1 hover:bg-gray-200 rounded"
                            title={showApiKeys[key.id] ? 'Hide' : 'Show'}
                          >
                            {showApiKeys[key.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleApiKeyMutation.mutate({ id: key.id, is_active: key.is_active })}
                          className={`px-3 py-1 text-sm rounded ${
                            key.is_active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-[#d4a574]/10 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {key.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${key.key_name}"?`)) {
                              deleteApiKeyMutation.mutate(key.id)
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




