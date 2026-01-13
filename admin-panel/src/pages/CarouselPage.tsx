import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Upload, X, Bell } from 'lucide-react'
import { toast } from 'sonner'

interface HomeBanner {
  id: string
  name: string
  description?: string
  image_url: string
  product_link?: string
  display_order: number
  is_active: boolean
}

interface FormData {
  name: string
  description: string
  image_url: string
  product_link: string
  is_active: boolean
  send_notification?: boolean
}

export default function CarouselPage() {
  const [editingItem, setEditingItem] = useState<HomeBanner | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: items, isLoading, error: queryError } = useQuery({
    queryKey: ['home-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_carousel')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching home banners:', error)
        throw error
      }
      return (data as HomeBanner[]) || []
    },
  })

  // Show error if query fails
  if (queryError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">Error loading carousel items</p>
        <p className="text-sm text-gray-500">
          {queryError instanceof Error ? queryError.message : 'Unknown error'}
        </p>
      </div>
    )
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products_carousel').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
      toast.success('Banner deleted successfully')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products_carousel')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
      toast.success('Banner status updated')
    },
  })

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('products_carousel')
        .update({ display_order: newOrder })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
    },
  })

  const handleMoveUp = (index: number) => {
    if (index === 0 || !items) return
    const item = items[index]
    const prevItem = items[index - 1]
    updateOrderMutation.mutate({ id: item.id, newOrder: prevItem.display_order })
    updateOrderMutation.mutate({ id: prevItem.id, newOrder: item.display_order })
  }

  const handleMoveDown = (index: number) => {
    if (!items || index === items.length - 1) return
    const item = items[index]
    const nextItem = items[index + 1]
    updateOrderMutation.mutate({ id: item.id, newOrder: nextItem.display_order })
    updateOrderMutation.mutate({ id: nextItem.id, newOrder: item.display_order })
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading carousel items...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Home Banner</h1>
          <p className="text-gray-600">Manage and view Home Banner</p>
          <p className="text-sm text-gray-500 mt-1">
            {items?.length || 0} total banner{items?.length !== 1 ? 's' : ''} 
            ({items?.filter(i => i.is_active).length || 0} active - shown in app)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null)
            setShowAddForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
        >
          <Plus className="w-5 h-5" />
          Add Banner
        </button>
      </div>

      {showAddForm && (
        <CarouselForm
          item={editingItem}
          onClose={() => {
            setShowAddForm(false)
            setEditingItem(null)
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingItem(null)
            queryClient.invalidateQueries({ queryKey: ['home-banners'] })
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items?.map((item, index) => (
          <div key={item.id} className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${!item.is_active ? 'opacity-50' : ''}`}>
            <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover" />
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-500">{item.display_order}</span>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === (items?.length || 0) - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: item.id, isActive: item.is_active })}
                    className={`px-2 py-1 rounded text-xs ${
                      item.is_active ? 'bg-[#d4a574]/10 text-[#b8956a]' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingItem(item)
                      setShowAddForm(true)
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this item?')) {
                        deleteMutation.mutate(item.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No home banners yet</p>
        </div>
      )}
    </div>
  )
}

function CarouselForm({
  item,
  onClose,
  onSuccess,
}: {
  item: HomeBanner | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState<FormData>({
    name: item?.name || '',
    description: item?.description || '',
    image_url: item?.image_url || '',
    product_link: item?.product_link || '',
    is_active: item?.is_active ?? true,
    send_notification: false,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(item?.image_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
    }
    reader.readAsDataURL(file)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = formData.image_url

      // If new file is selected, upload it
      if (selectedFile) {
        const bucketName = 'app-images'
        const fileExt = selectedFile.name.split('.').pop() || 'png'
        const fileName = `carousel/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = fileName

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(filePath)
        imageUrl = publicUrl
      } else {
        // Use existing image_url if no new file selected
        imageUrl = formData.image_url
      }

      // Get max display_order for new items
      let displayOrder = 0
      if (!item) {
        const { data: maxOrder } = await supabase
          .from('products_carousel')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)
          .single()
        
        displayOrder = (maxOrder?.display_order || 0) + 1
      }

      // Don't save send_notification to database - it's just a UI flag
      const { send_notification, ...dataToSave } = {
        ...formData,
        image_url: imageUrl,
        display_order: item?.display_order || displayOrder,
      }

      let savedBanner
      if (item) {
        const { data, error } = await supabase
          .from('products_carousel')
          .update(dataToSave)
          .eq('id', item.id)
          .select()
          .single()
        if (error) throw error
        savedBanner = data
      } else {
        const { data, error } = await supabase.from('products_carousel').insert([dataToSave]).select().single()
        if (error) throw error
        savedBanner = data
      }

      // Send notification if requested
      if (formData.send_notification && savedBanner) {
        try {
          const notificationData = {
            title: 'New Product Available! ✨',
            message: formData.description || `Check out our new banner: ${formData.name}`,
            type: 'promo',
            priority: 'normal',
            target_audience: 'all',
            template_name: 'product_launch',
            image_url: imageUrl || null,
            link: formData.product_link || '/',
          }

          const { data: notification, error: notifError } = await supabase
            .from('notifications')
            .insert([notificationData])
            .select()
            .single()

          if (!notifError && notification) {
            // Automatically send the notification
            const { error: sendError } = await supabase.functions.invoke('send-push-notification', {
              body: { notification_id: notification.id },
            })

            if (sendError) {
              console.error('Error sending notification:', sendError)
              toast.warning('Banner saved, but notification sending failed')
            } else {
              toast.success('Banner saved and notification sent!')
            }
          }
        } catch (notifErr: any) {
          console.error('Error creating notification:', notifErr)
          toast.warning('Banner saved, but notification creation failed')
        }
      }
    },
    onSuccess: () => {
      toast.success(item ? 'Banner updated' : 'Banner created')
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save item')
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{item ? 'Edit Banner' : 'Add Banner'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter banner name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Enter banner description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image *</label>
            <div className="space-y-3">
              {/* File Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">
                    {selectedFile ? selectedFile.name : 'Click to upload image'}
                  </span>
                </button>
              </div>

              {/* Preview */}
              {preview && (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  {selectedFile && (
                    <button
                      onClick={() => {
                        setSelectedFile(null)
                        setPreview(formData.image_url || null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Or use URL */}
              <div className="text-center text-sm text-gray-500">OR</div>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => {
                  setFormData({ ...formData, image_url: e.target.value })
                  if (!selectedFile) {
                    setPreview(e.target.value)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Or enter image URL"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
            <input
              type="url"
              value={formData.product_link}
              onChange={(e) => setFormData({ ...formData, product_link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://www.karmaterra.in/..."
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Link to open when banner is clicked</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Active (show on homepage)</span>
              </label>
            </div>
            
            <div className="flex items-center gap-2 pl-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Bell className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <input
                type="checkbox"
                id="send_notification"
                checked={formData.send_notification}
                onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="send_notification" className="text-sm text-gray-700 cursor-pointer">
                Send push notification to all users about this new banner
              </label>
            </div>
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
            disabled={saveMutation.isPending || !formData.name || (!preview && !formData.image_url)}
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}








