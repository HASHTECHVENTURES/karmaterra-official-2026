import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Upload, Image as ImageIcon, Trash2, Edit, Eye, Download, Check, X, Search, Copy, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface CompanyLogo {
  id: string
  logo_name: string
  logo_url: string
  logo_type: string // 'main_logo', 'footer_logo', 'favicon', 'app_icon', 'social_media', 'other'
  width?: number
  height?: number
  file_size?: number
  alt_text?: string
  description?: string
  is_active: boolean
  display_order: number
  created_at: string
}

const LOGO_TYPES = [
  { value: 'main_logo', label: 'Main Logo', recommendedSize: '200x60', maxSize: 500, description: 'Primary logo for header/navigation' },
  { value: 'footer_logo', label: 'Footer Logo', recommendedSize: '150x45', maxSize: 300, description: 'Logo for footer section' },
  { value: 'favicon', label: 'Favicon', recommendedSize: '32x32', maxSize: 50, description: 'Browser tab icon (must be square)' },
  { value: 'app_icon', label: 'App Icon', recommendedSize: '512x512', maxSize: 1024, description: 'Mobile app icon (must be square)' },
  { value: 'social_media', label: 'Social Media', recommendedSize: '1200x630', maxSize: 2048, description: 'Social sharing image' },
  { value: 'other', label: 'Other', recommendedSize: 'Varies', maxSize: 2048, description: 'Other logo variations' },
]

export default function CompanyLogosPage() {
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [editingLogo, setEditingLogo] = useState<CompanyLogo | null>(null)
  const [previewLogo, setPreviewLogo] = useState<CompanyLogo | null>(null)
  const queryClient = useQueryClient()

  const { data: logos, isLoading } = useQuery({
    queryKey: ['company-logos', selectedType],
    queryFn: async () => {
      let query = supabase
        .from('app_images')
        .select('*')
        .eq('category', 'company_logo')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (selectedType !== 'all') {
        query = query.eq('image_name', selectedType)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Map app_images to CompanyLogo format
      return (data || []).map((img: any) => ({
        id: img.id,
        logo_name: img.image_name,
        logo_url: img.image_url,
        logo_type: img.image_name || 'other',
        width: img.width,
        height: img.height,
        file_size: img.file_size,
        alt_text: img.alt_text,
        description: img.description,
        is_active: img.is_active,
        display_order: img.display_order || 0,
        created_at: img.created_at,
      })) as CompanyLogo[]
    },
  })

  // Filter logos by search term
  const filteredLogos = logos?.filter((logo) => {
    if (selectedType !== 'all' && logo.logo_type !== selectedType) return false
    
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      logo.logo_name.toLowerCase().includes(search) ||
      logo.alt_text?.toLowerCase().includes(search) ||
      logo.description?.toLowerCase().includes(search) ||
      logo.logo_type.toLowerCase().includes(search)
    )
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_images').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-logos'] })
      toast.success('Logo deleted successfully')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('app_images')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-logos'] })
      toast.success('Logo status updated')
    },
  })

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading logos...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#d4a574]" />
            Company Logos
          </h1>
          <p className="text-gray-600">Upload and manage all company logos and branding assets</p>
          <p className="text-gray-500 text-sm mt-1">
            {logos?.length || 0} logo{logos?.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <button
          onClick={() => {
            setEditingLogo(null)
            setShowUploadForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
        >
          <Plus className="w-5 h-5" />
          Upload Logo
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedType === 'all'
                ? 'bg-[#d4a574] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Logos ({logos?.length || 0})
          </button>
          {LOGO_TYPES.map((type) => {
            const count = logos?.filter((l) => l.logo_type === type.value).length || 0
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedType === type.value
                    ? 'bg-[#d4a574] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logos by name, type, or description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
          />
        </div>
      </div>

      {showUploadForm && (
        <UploadLogoForm
          logo={editingLogo}
          onClose={() => {
            setShowUploadForm(false)
            setEditingLogo(null)
          }}
          onSuccess={() => {
            setShowUploadForm(false)
            setEditingLogo(null)
            queryClient.invalidateQueries({ queryKey: ['company-logos'] })
          }}
        />
      )}

      {previewLogo && (
        <LogoPreviewModal
          logo={previewLogo}
          onClose={() => setPreviewLogo(null)}
          onDelete={(id) => {
            deleteMutation.mutate(id)
            setPreviewLogo(null)
          }}
        />
      )}

      {/* Logos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredLogos?.map((logo) => {
          const typeInfo = LOGO_TYPES.find((t) => t.value === logo.logo_type)
          return (
            <div
              key={logo.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-lg ${
                !logo.is_active ? 'opacity-50' : ''
              }`}
            >
              {/* Logo Preview */}
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center p-4">
                <img
                  src={logo.logo_url}
                  alt={logo.alt_text || logo.logo_name}
                  className="max-w-full max-h-full object-contain cursor-pointer"
                  onClick={() => setPreviewLogo(logo)}
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="Arial" font-size="14"%3ELogo not found%3C/text%3E%3C/svg%3E'
                  }}
                />
                {!logo.is_active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Inactive
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                  <button
                    onClick={() => setPreviewLogo(logo)}
                    className="text-white bg-black bg-opacity-50 p-2 rounded-full"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Logo Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{logo.logo_name}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {typeInfo?.label || logo.logo_type}
                  </span>
                </div>

                {/* Size Info */}
                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  {logo.width && logo.height && (
                    <div className="flex items-center justify-between">
                      <span>Dimensions:</span>
                      <span className="font-medium">
                        {logo.width} × {logo.height}px
                      </span>
                    </div>
                  )}
                  {logo.file_size && (
                    <div className="flex items-center justify-between">
                      <span>File Size:</span>
                      <span className="font-medium">{formatFileSize(logo.file_size)}</span>
                    </div>
                  )}
                  {typeInfo && (
                    <div className="flex items-center justify-between text-orange-600">
                      <span>Recommended:</span>
                      <span className="font-medium">{typeInfo.recommendedSize}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewLogo(logo)}
                    className="flex-1 px-3 py-2 bg-[#7a9c5e] text-white text-sm rounded-lg hover:bg-[#7a9c5e]/90 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditingLogo(logo)
                      setShowUploadForm(true)
                    }}
                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                    title="Edit logo"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      toggleActiveMutation.mutate({ id: logo.id, isActive: logo.is_active })
                    }
                    className={`px-3 py-2 text-sm rounded-lg ${
                      logo.is_active
                        ? 'bg-[#d4a574]/10 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={logo.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {logo.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this logo?')) {
                        deleteMutation.mutate(logo.id)
                      }
                    }}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    title="Delete logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredLogos?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">
            {searchTerm ? 'No logos found matching your search' : logos?.length === 0 ? 'No logos uploaded yet' : 'No logos found'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#d4a574] hover:text-green-700 text-sm"
            >
              Clear search
            </button>
          )}
          {logos?.length === 0 && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="mt-4 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
            >
              Upload Your First Logo
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function UploadLogoForm({ 
  logo, 
  onClose, 
  onSuccess 
}: { 
  logo?: CompanyLogo | null
  onClose: () => void
  onSuccess: () => void 
}) {
  const isEditing = !!logo
  const [formData, setFormData] = useState({
    logo_name: logo?.logo_name || '',
    logo_type: logo?.logo_type || 'main_logo',
    alt_text: logo?.alt_text || '',
    description: logo?.description || '',
    is_active: logo?.is_active ?? true,
    display_order: logo?.display_order || 0,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(logo?.logo_url || null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    logo?.width && logo?.height ? { width: logo.width, height: logo.height } : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const typeInfo = LOGO_TYPES.find((t) => t.value === formData.logo_type)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)

      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
      }
      img.src = result
    }
    reader.readAsDataURL(file)

    if (!formData.logo_name) {
      const name = file.name.replace(/\.[^/.]+$/, '')
      setFormData({ ...formData, logo_name: name })
    }
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      let logoUrl = logo?.logo_url
      let finalWidth = imageDimensions?.width || logo?.width || 0
      let finalHeight = imageDimensions?.height || logo?.height || 0
      let finalFileSize = selectedFile?.size || logo?.file_size || 0

      if (selectedFile) {
        const bucketName = 'app-images'
        const fileExt = selectedFile.name.split('.').pop() || 'png'
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `company-logos/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          if (uploadError.message?.includes('Bucket not found')) {
            throw new Error('Storage bucket "app-images" not found. Please create it in Supabase Dashboard > Storage.')
          }
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(filePath)
        logoUrl = publicUrl
      }

      if (!logoUrl) throw new Error('Logo URL is required')

      if (isEditing && logo) {
        const { error } = await supabase
          .from('app_images')
          .update({
            image_name: formData.logo_name,
            image_url: logoUrl,
            category: 'company_logo',
            width: finalWidth,
            height: finalHeight,
            file_size: finalFileSize,
            alt_text: formData.alt_text || formData.logo_name,
            description: formData.description,
            is_active: formData.is_active,
            display_order: formData.display_order,
          })
          .eq('id', logo.id)

        if (error) throw error
      } else {
        if (!selectedFile) throw new Error('Please select a logo file')

        const { data: insertData, error: insertError } = await supabase
          .from('app_images')
          .insert([
            {
              image_name: formData.logo_name,
              image_url: logoUrl,
              category: 'company_logo',
              width: finalWidth,
              height: finalHeight,
              file_size: finalFileSize,
              alt_text: formData.alt_text || formData.logo_name,
              description: formData.description,
              is_active: formData.is_active,
              display_order: formData.display_order,
            },
          ])
          .select()

        if (insertError) throw insertError
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Logo updated successfully' : 'Logo uploaded successfully')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.message || `Failed to ${isEditing ? 'update' : 'upload'} logo`)
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{isEditing ? 'Edit Logo' : 'Upload Logo'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo Name *</label>
              <input
                type="text"
                value={formData.logo_name}
                onChange={(e) => setFormData({ ...formData, logo_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Main Logo, Footer Logo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo Type *</label>
              <select
                value={formData.logo_type}
                onChange={(e) => setFormData({ ...formData, logo_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {LOGO_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} ({type.recommendedSize})
                  </option>
                ))}
              </select>
              {typeInfo && (
                <p className="text-xs text-gray-500 mt-1">
                  {typeInfo.description} | Recommended: {typeInfo.recommendedSize} | Max: {typeInfo.maxSize}KB
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
              <input
                type="text"
                value={formData.alt_text}
                onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Alternative text for accessibility"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isEditing ? 'Replace Logo (optional)' : 'Select Logo File *'}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>File: {selectedFile.name}</p>
                  <p>Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Active (visible in app)</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[300px] flex items-center justify-center">
              {preview ? (
                <div className="text-center">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-[250px] mx-auto rounded-lg shadow-sm border border-gray-100 mb-2"
                  />
                  {imageDimensions && (
                    <div className="text-sm text-gray-600 mt-2">
                      <p>Dimensions: {imageDimensions.width} × {imageDimensions.height}px</p>
                      {typeInfo && (
                        <p className="text-orange-600 font-medium">
                          Recommended: {typeInfo.recommendedSize}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Upload className="w-12 h-12 mx-auto mb-2" />
                  <p>No logo selected</p>
                </div>
              )}
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
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending || !formData.logo_name || (!selectedFile && !isEditing)}
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {uploadMutation.isPending ? (isEditing ? 'Updating...' : 'Uploading...') : (isEditing ? 'Update Logo' : 'Upload Logo')}
          </button>
        </div>
      </div>
    </div>
  )
}

function LogoPreviewModal({
  logo,
  onClose,
  onDelete,
}: {
  logo: CompanyLogo
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const typeInfo = LOGO_TYPES.find((t) => t.value === logo.logo_type)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{logo.logo_name}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {typeInfo?.label || logo.logo_type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <img
              src={logo.logo_url}
              alt={logo.alt_text || logo.logo_name}
              className="w-full rounded-lg shadow-sm border border-gray-100"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="Arial" font-size="16"%3ELogo not found%3C/text%3E%3C/svg%3E'
              }}
            />
          </div>

          {/* Info */}
          <div className="space-y-4">
            {logo.width && logo.height && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Dimensions</h3>
                <p className="text-gray-900 font-medium">
                  {logo.width} × {logo.height} pixels
                </p>
                {typeInfo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: {typeInfo.recommendedSize}
                  </p>
                )}
              </div>
            )}

            {logo.file_size && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">File Size</h3>
                <p className="text-gray-900 font-medium">{formatFileSize(logo.file_size)}</p>
              </div>
            )}

            {logo.alt_text && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Alt Text</h3>
                <p className="text-gray-900">{logo.alt_text}</p>
              </div>
            )}

            {logo.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-900">{logo.description}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  logo.is_active
                    ? 'bg-[#d4a574]/10 text-[#b8956a]'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {logo.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Logo URL</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={logo.logo_url}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(logo.logo_url)
                    toast.success('URL copied to clipboard')
                  }}
                  className="px-3 py-2 bg-[#7a9c5e] text-white rounded-lg hover:bg-[#7a9c5e]/90 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {logo.logo_url.startsWith('http') && (
                <a
                  href={logo.logo_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#7a9c5e] text-white rounded-lg hover:bg-[#7a9c5e]/90"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              )}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this logo?')) {
                    onDelete(logo.id)
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

