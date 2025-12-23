import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Upload, Image as ImageIcon, Trash2, Edit, Eye, Download, Check, X, Search, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface AppImage {
  id: string
  image_name: string
  image_url: string
  category: string
  width?: number
  height?: number
  file_size?: number
  alt_text?: string
  description?: string
  is_active: boolean
  created_at: string
}

const IMAGE_CATEGORIES = [
  { value: 'app_icon', label: 'App Icon', recommendedSize: '512x512', maxSize: 1024 },
  { value: 'home_banner', label: 'Home Banner', recommendedSize: '1200x600', maxSize: 2048 },
  { value: 'feature_image', label: 'Feature Image', recommendedSize: '800x600', maxSize: 1024 },
  { value: 'product_image', label: 'Product Image', recommendedSize: '600x600', maxSize: 1024 },
  { value: 'other', label: 'Other', recommendedSize: 'Varies', maxSize: 2048 },
]

export default function ImagesPage() {
  // Only show app_icon category
  const [selectedCategory, setSelectedCategory] = useState<string>('app_icon')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [editingImage, setEditingImage] = useState<AppImage | null>(null)
  const [previewImage, setPreviewImage] = useState<AppImage | null>(null)
  const queryClient = useQueryClient()

  const { data: images, isLoading } = useQuery({
    queryKey: ['app-images', selectedCategory],
    queryFn: async () => {
      // Only fetch app_icon category
      const { data, error } = await supabase
        .from('app_images')
        .select('*')
        .eq('category', 'app_icon')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as AppImage[]) || []
    },
  })

  // Filter images by search term (only app_icon category)
  const filteredImages = images?.filter((image) => {
    // Only show app_icon category
    if (image.category !== 'app_icon') return false
    
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      image.image_name.toLowerCase().includes(search) ||
      image.alt_text?.toLowerCase().includes(search) ||
      image.description?.toLowerCase().includes(search)
    )
  })

  // Count images by category
  const categoryCounts = images?.reduce((acc, image) => {
    acc[image.category] = (acc[image.category] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_images').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-images'] })
      toast.success('Image deleted successfully')
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
      queryClient.invalidateQueries({ queryKey: ['app-images'] })
      toast.success('Image status updated')
    },
  })

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading images...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">App Icon</h1><p className="text-gray-600">Manage and view App Icon</p></div>
          <p className="text-gray-600 mt-1">
            {images?.length || 0} app icon{images?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingImage(null)
            setShowUploadForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
          title="Upload app icon with crop/resize"
        >
          <Plus className="w-5 h-5" />
          Upload App Icon
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search app icons by name or description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4a574] focus:border-[#d4a574]"
          />
        </div>
      </div>

      {showUploadForm && (
        <UploadImageForm
          image={editingImage}
          initialCategory="app_icon"
          onClose={() => {
            setShowUploadForm(false)
            setEditingImage(null)
          }}
          onSuccess={() => {
            setShowUploadForm(false)
            setEditingImage(null)
            queryClient.invalidateQueries({ queryKey: ['app-images'] })
          }}
        />
      )}

      {previewImage && (
        <ImagePreviewModal
          image={previewImage}
          onClose={() => setPreviewImage(null)}
          onDelete={(id) => {
            deleteMutation.mutate(id)
            setPreviewImage(null)
          }}
        />
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredImages?.map((image) => {
          const categoryInfo = IMAGE_CATEGORIES.find((c) => c.value === image.category)
          return (
            <div
              key={image.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-lg ${
                !image.is_active ? 'opacity-50' : ''
              }`}
            >
              {/* Image Preview */}
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={image.image_url}
                  alt={image.alt_text || image.image_name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewImage(image)}
                  onError={(e) => {
                    // Fallback for broken images
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="Arial" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E'
                  }}
                />
                {!image.is_active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Inactive
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                  <button
                    onClick={() => setPreviewImage(image)}
                    className="text-white bg-black bg-opacity-50 p-2 rounded-full"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>

                {/* Image Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{image.image_name}</h3>
                  <div className="flex items-center gap-1">
                    {image.image_url.startsWith('/') && !image.image_url.startsWith('http') && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded" title="Invalid URL - needs Supabase Storage URL">
                        ⚠️
                      </span>
                    )}
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {categoryInfo?.label || image.category}
                    </span>
                  </div>
                </div>

                {/* Size Info */}
                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  {image.width && image.height && (
                    <div className="flex items-center justify-between">
                      <span>Dimensions:</span>
                      <span className="font-medium">
                        {image.width} × {image.height}px
                      </span>
                    </div>
                  )}
                  {image.file_size && (
                    <div className="flex items-center justify-between">
                      <span>File Size:</span>
                      <span className="font-medium">{formatFileSize(image.file_size)}</span>
                    </div>
                  )}
                  {categoryInfo && (
                    <div className="flex items-center justify-between text-orange-600">
                      <span>Recommended:</span>
                      <span className="font-medium">{categoryInfo.recommendedSize}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewImage(image)}
                    className="flex-1 px-3 py-2 bg-[#7a9c5e] text-white text-sm rounded-lg hover:bg-[#7a9c5e]/90 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditingImage(image)
                      setShowUploadForm(true)
                    }}
                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                    title="Edit image"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      toggleActiveMutation.mutate({ id: image.id, isActive: image.is_active })
                    }
                    className={`px-3 py-2 text-sm rounded-lg ${
                      image.is_active
                        ? 'bg-[#d4a574]/10 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={image.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {image.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this image?')) {
                        deleteMutation.mutate(image.id)
                      }
                    }}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredImages?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">
            {searchTerm ? 'No app icons found matching your search' : images?.length === 0 ? 'No app icons uploaded yet' : 'No app icons found'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#d4a574] hover:text-green-700 text-sm"
            >
              Clear search
            </button>
          )}
          {images?.length === 0 && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="mt-4 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
            >
              Upload Your First App Icon
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function UploadImageForm({ 
  image, 
  initialCategory,
  onClose, 
  onSuccess 
}: { 
  image?: AppImage | null
  initialCategory?: string
  onClose: () => void
  onSuccess: () => void 
}) {
  const isEditing = !!image
  const defaultCategory = initialCategory === 'app_icon' ? 'app_icon' : (image?.category || 'other')
  const [formData, setFormData] = useState({
    image_name: image?.image_name || (defaultCategory === 'app_icon' ? 'app-icon' : ''),
    category: defaultCategory,
    alt_text: image?.alt_text || '',
    description: image?.description || '',
    is_active: image?.is_active ?? true,
    display_order: image?.display_order || 0,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(image?.image_url || null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    image?.width && image?.height ? { width: image.width, height: image.height } : null
  )
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [targetSize, setTargetSize] = useState(512) // Default 512x512 for app icon
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const isAppIcon = formData.category === 'app_icon' && !isEditing

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
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

      // Get image dimensions
      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
        imageRef.current = img
        
        // Auto-set crop area for app icon (square crop from center)
        if (formData.category === 'app_icon' || initialCategory === 'app_icon') {
          const size = Math.min(img.width, img.height)
          const x = (img.width - size) / 2
          const y = (img.height - size) / 2
          setCropArea({ x, y, width: size, height: size })
        }
      }
      img.src = result
    }
    reader.readAsDataURL(file)

    // Auto-fill name if empty
    if (!formData.image_name) {
      const name = isAppIcon ? 'app-icon' : file.name.replace(/\.[^/.]+$/, '')
      setFormData({ ...formData, image_name: name })
    }
  }

  // Crop and resize image using canvas
  const processImage = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!imageRef.current || !canvasRef.current) {
        reject(new Error('No image loaded'))
        return
      }

      const img = imageRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Set canvas size to target size
      canvas.width = targetSize
      canvas.height = targetSize

      if (isAppIcon && cropArea) {
        // Draw cropped and resized image
        ctx.drawImage(
          img,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height, // Source
          0, 0, targetSize, targetSize // Destination
        )
      } else {
        // Just resize without cropping
        ctx.drawImage(img, 0, 0, targetSize, targetSize)
      }

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to process image'))
        }
      }, 'image/png', 0.95)
    })
  }

  // Handle crop area dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAppIcon || !preview || !imageDimensions || !cropArea) return
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = imageDimensions.width / rect.width
    const scaleY = imageDimensions.height / rect.height
    const clickX = (e.clientX - rect.left) * scaleX
    const clickY = (e.clientY - rect.top) * scaleY
    
    // Check if click is inside crop area
    if (
      clickX >= cropArea.x && clickX <= cropArea.x + cropArea.width &&
      clickY >= cropArea.y && clickY <= cropArea.y + cropArea.height
    ) {
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !cropArea || !imageDimensions || !preview) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = imageDimensions.width / rect.width
    const scaleY = imageDimensions.height / rect.height
    
    const deltaX = (e.clientX - rect.left - dragStart.x) * scaleX
    const deltaY = (e.clientY - rect.top - dragStart.y) * scaleY
    
    const newX = Math.max(0, Math.min(imageDimensions.width - cropArea.width, cropArea.x + deltaX))
    const newY = Math.max(0, Math.min(imageDimensions.height - cropArea.height, cropArea.y + deltaY))
    
    setCropArea({ ...cropArea, x: newX, y: newY })
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  // Adjust crop size
  const adjustCropSize = (delta: number) => {
    if (!cropArea || !imageDimensions) return
    const newSize = Math.max(50, Math.min(
      Math.min(imageDimensions.width, imageDimensions.height),
      cropArea.width + delta
    ))
    const newX = Math.max(0, Math.min(imageDimensions.width - newSize, cropArea.x))
    const newY = Math.max(0, Math.min(imageDimensions.height - newSize, cropArea.y))
    setCropArea({ x: newX, y: newY, width: newSize, height: newSize })
  }

  // Helper function to check if bucket exists
  const checkBucketExists = async (bucketName: string): Promise<boolean> => {
    try {
      // Try to list buckets
      const { data, error } = await supabase.storage.listBuckets()
      
      if (error) {
        console.error('Error listing buckets:', error)
        // If listing fails, try to access the bucket directly
        const { data: testData, error: testError } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1 })
        
        // If we can list (even if empty), bucket exists
        if (!testError) return true
        return false
      }
      
      // Check if bucket exists in the list
      const bucketExists = data?.some(bucket => bucket.name === bucketName)
      return bucketExists || false
    } catch (err) {
      console.error('Error checking bucket:', err)
      return false
    }
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = image?.image_url
      let processedFile: File | Blob | null = null
      let finalWidth = imageDimensions?.width || image?.width || targetSize
      let finalHeight = imageDimensions?.height || image?.height || targetSize
      let finalFileSize = selectedFile?.size || image?.file_size || 0

      // If new file is selected, process and upload it
      if (selectedFile) {
        // Process image (crop/resize) if app icon
        if (isAppIcon && (cropArea || targetSize !== imageDimensions?.width)) {
          processedFile = await processImage()
          finalWidth = targetSize
          finalHeight = targetSize
          finalFileSize = processedFile.size
        } else {
          processedFile = selectedFile
        }

        // Upload to Supabase Storage
        const bucketName = 'app-images'
        const fileExt = isAppIcon ? 'png' : selectedFile.name.split('.').pop() || 'png'
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${formData.category}/${fileName}`

        // Try to upload directly - this will fail with a clear error if bucket doesn't exist
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, processedFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          // Log storage error for debugging
          console.error('Storage upload error:', uploadError)
          
          // Check for RLS errors in storage
          if (
            uploadError.message?.includes('row-level security') ||
            uploadError.message?.includes('row level security') ||
            uploadError.message?.includes('violates row-level security policy') ||
            uploadError.message?.includes('StorageApiError')
          ) {
            throw new Error(
              'STORAGE_RLS_ERROR: Storage bucket has RLS blocking uploads. Fix this:\n\n' +
              '1. Go to Supabase Dashboard > Storage > app-images bucket\n' +
              '2. Click "Policies" tab\n' +
              '3. Delete all existing policies\n' +
              '4. OR run this SQL in SQL Editor:\n\n' +
              'CREATE POLICY "Public Upload for app-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = \'app-images\');\n' +
              'CREATE POLICY "Public Access for app-images" ON storage.objects FOR SELECT USING (bucket_id = \'app-images\');'
            )
          }
          
          // Provide helpful error messages for bucket errors
          if (
            uploadError.message?.includes('Bucket not found') || 
            uploadError.message?.includes('not found') ||
            uploadError.message?.includes('does not exist') ||
            uploadError.statusCode === 404 ||
            uploadError.error === 'Bucket not found'
          ) {
            throw new Error(
              `BUCKET_NOT_FOUND: Storage bucket "${bucketName}" not found. Please create it in Supabase Dashboard:\n\n` +
              `1. Go to Supabase Dashboard > Storage\n` +
              `2. Click "New bucket"\n` +
              `3. Name: "app-images"\n` +
              `4. Set to Public\n` +
              `5. Click "Create bucket"\n\n` +
              `After creating, refresh this page and try again.`
            )
          }
          // Re-throw other errors as-is
          throw uploadError
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(filePath)
        imageUrl = publicUrl
      }

      if (!imageUrl) throw new Error('Image URL is required')

      // Update or insert image record
      if (isEditing && image) {
        const { error } = await supabase
          .from('app_images')
          .update({
            image_name: formData.image_name,
            image_url: imageUrl,
            category: formData.category,
            width: finalWidth,
            height: finalHeight,
            file_size: finalFileSize,
            alt_text: formData.alt_text || formData.image_name,
            description: formData.description,
            is_active: formData.is_active,
            display_order: formData.display_order,
          })
          .eq('id', image.id)

        if (error) throw error
      } else {
        if (!selectedFile) throw new Error('Please select an image file')

        // Try insert with explicit error handling
        const { data: insertData, error: insertError } = await supabase
          .from('app_images')
          .insert([
            {
              image_name: formData.image_name,
              image_url: imageUrl,
              category: formData.category,
              width: finalWidth,
              height: finalHeight,
              file_size: finalFileSize,
              alt_text: formData.alt_text || formData.image_name,
              description: formData.description,
              is_active: formData.is_active,
              display_order: formData.display_order,
            },
          ])
          .select()

        if (insertError) {
          // Log the full error for debugging
          console.error('Insert error details:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            fullError: insertError
          })
          
          // Check for RLS errors specifically
          if (
            insertError.message?.includes('row-level security') ||
            insertError.message?.includes('row level security') ||
            insertError.message?.includes('violates row-level security policy') ||
            insertError.code === '42501' ||
            insertError.hint?.includes('policy')
          ) {
            // Provide comprehensive fix instructions
            throw new Error(
              'RLS_ERROR: Row Level Security is still blocking. Run this COMPLETE SQL in Supabase:\n\n' +
              'DO $$\n' +
              'DECLARE r RECORD;\n' +
              'BEGIN\n' +
              '  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = \'app_images\') LOOP\n' +
              '    EXECUTE \'DROP POLICY IF EXISTS \' || quote_ident(r.policyname) || \' ON app_images\';\n' +
              '  END LOOP;\n' +
              'END $$;\n' +
              'ALTER TABLE app_images DISABLE ROW LEVEL SECURITY;\n' +
              'GRANT ALL ON app_images TO anon;'
            )
          }
          
          // If it's not RLS, throw the actual error so we can see what it really is
          throw insertError
        }
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Image updated successfully' : 'Image uploaded successfully')
      onSuccess()
    },
    onError: (error: any) => {
      const errorMessage = error.message || `Failed to ${isEditing ? 'update' : 'upload'} image`
      
      // Log the full error for debugging
      console.error('Upload error:', {
        message: errorMessage,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      })
      
      // Show error with better formatting for Storage RLS errors
      if (errorMessage.includes('STORAGE_RLS_ERROR')) {
        toast.error(
          <div className="space-y-2 max-w-md">
            <div className="font-semibold text-red-600">Storage Bucket RLS Error</div>
            <div className="text-sm">
              <p className="mb-2">The storage bucket has RLS policies blocking uploads. Fix this:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                <li>Go to Supabase Dashboard → Storage → app-images bucket</li>
                <li>Click "Policies" tab</li>
                <li>Delete ALL existing policies</li>
                <li>OR run the SQL below in SQL Editor</li>
              </ol>
              <div className="bg-gray-100 p-3 rounded font-mono text-xs mt-2 overflow-x-auto">
                <div className="whitespace-pre-wrap">
{`CREATE POLICY "Public Upload for app-images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'app-images');

CREATE POLICY "Public Access for app-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'app-images');`}
                </div>
              </div>
            </div>
          </div>,
          { duration: 30000 }
        )
      } else if (
        errorMessage.includes('RLS_ERROR') ||
        errorMessage.includes('row-level security') ||
        errorMessage.includes('row level security') ||
        errorMessage.includes('violates row-level security policy') ||
        error?.code === '42501'
      ) {
        toast.error(
          <div className="space-y-2 max-w-md">
            <div className="font-semibold text-red-600">Row Level Security Error</div>
            <div className="text-sm">
              <p className="mb-2">RLS is still blocking. But since RLS is disabled, this might be a different issue.</p>
              <p className="mb-2 text-xs text-gray-600">Check browser console (F12) for actual error details.</p>
              <div className="bg-gray-100 p-3 rounded font-mono text-xs mb-2 overflow-x-auto">
                <div className="whitespace-pre-wrap">
{`DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'app_images') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON app_images';
  END LOOP;
END $$;
ALTER TABLE app_images DISABLE ROW LEVEL SECURITY;
GRANT ALL ON app_images TO anon;`}
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                💡 If RLS is already disabled, the real error is shown in the console. Press F12 to see it.
              </p>
            </div>
          </div>,
          { duration: 30000 }
        )
      } else if (
        errorMessage.includes('BUCKET_NOT_FOUND') ||
        errorMessage.includes('Bucket not found') || 
        errorMessage.includes('not found') ||
        error?.statusCode === 404
      ) {
        toast.error(
          <div className="space-y-2">
            <div className="font-semibold">Storage Bucket Missing</div>
            <div className="text-sm">
              Please create the "app-images" bucket in Supabase Dashboard:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to Supabase Dashboard → Storage</li>
                <li>Click "New bucket"</li>
                <li>Name: <code className="bg-gray-100 px-1 rounded">app-images</code></li>
                <li>Set to <strong>Public</strong></li>
                <li>Click "Create bucket"</li>
              </ol>
              <p className="mt-2 text-xs text-gray-500">
                After creating, refresh this page and try again.
              </p>
            </div>
          </div>,
          { duration: 15000 }
        )
      } else {
        // Show the actual error message
        toast.error(
          <div className="space-y-2">
            <div className="font-semibold">Upload Failed</div>
            <div className="text-sm">{errorMessage}</div>
            <div className="text-xs text-gray-500 mt-1">
              Check browser console (F12) for more details
            </div>
          </div>,
          { duration: 10000 }
        )
      }
    },
  })

  const categoryInfo = IMAGE_CATEGORIES.find((c) => c.value === formData.category)

  // Simplified form for app icon
  if (isAppIcon && !isEditing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Upload App Icon</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Your App Icon</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors cursor-pointer"
              />
            </div>

            {/* Preview with Crop/Resize */}
            {preview && imageDimensions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview & Edit</label>
                
                {/* Size Selector */}
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-2">Final Size:</label>
                    <select
                      value={targetSize}
                      onChange={(e) => setTargetSize(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value={192}>192×192 (Small)</option>
                      <option value={512}>512×512 (Recommended)</option>
                      <option value={1024}>1024×1024 (Large)</option>
                    </select>
                  </div>
                  {cropArea && (
                    <div className="flex flex-col gap-2">
                      <label className="block text-sm text-gray-600 mb-2">Crop Size:</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => adjustCropSize(-20)}
                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                          title="Make crop smaller"
                        >
                          −
                        </button>
                        <button
                          onClick={() => adjustCropSize(20)}
                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                          title="Make crop larger"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Preview with Crop */}
                <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                  <div
                    className="relative"
                    style={{ maxHeight: '400px', maxWidth: '100%', overflow: 'auto' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img
                      src={preview}
                      alt="Preview"
                      className="block max-w-full h-auto"
                      ref={(img) => {
                        if (img) imageRef.current = img
                      }}
                    />
                    
                    {/* Crop Overlay */}
                    {cropArea && imageDimensions && (
                      <div
                        className="absolute border-2 border-green-500 bg-green-500 bg-opacity-20 cursor-move"
                        style={{
                          left: `${(cropArea.x / imageDimensions.width) * 100}%`,
                          top: `${(cropArea.y / imageDimensions.height) * 100}%`,
                          width: `${(cropArea.width / imageDimensions.width) * 100}%`,
                          height: `${(cropArea.height / imageDimensions.height) * 100}%`,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-green-700 font-semibold text-xs bg-white bg-opacity-50 rounded">
                          {targetSize}×{targetSize}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Crop Instructions */}
                <p className="text-xs text-gray-500 mt-2">
                  💡 Drag the green box to move crop area. Use +/− buttons to resize. Final image will be {targetSize}×{targetSize}px
                </p>
              </div>
            )}

            {!preview && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 bg-gray-50 text-center">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select an image to see preview and crop</p>
              </div>
            )}

            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending || !selectedFile}
                className="px-6 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50 font-semibold"
              >
                {uploadMutation.isPending ? 'Publishing...' : 'Publish App Icon'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full form for other categories
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Image' : 'Upload Image'}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image Name *</label>
              <input
                type="text"
                value={formData.image_name}
                onChange={(e) => setFormData({ ...formData, image_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., App Icon, Home Banner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const newCategory = e.target.value
                  setFormData({ ...formData, category: newCategory })
                  if (newCategory === 'app_icon' && !formData.image_name) {
                    setFormData(prev => ({ ...prev, category: newCategory, image_name: 'app-icon' }))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {IMAGE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} ({cat.recommendedSize})
                  </option>
                ))}
              </select>
              {categoryInfo && (
                <p className="text-xs text-gray-500 mt-1">
                  Recommended size: {categoryInfo.recommendedSize} | Max: {categoryInfo.maxSize}KB
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
                {isEditing ? 'Replace Image (optional)' : 'Select Image *'}
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
              {isEditing && !selectedFile && (
                <p className="mt-2 text-xs text-gray-500">Leave empty to keep current image</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
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
                    className="max-w-full max-h-[250px] mx-auto rounded-lg shadow-sm border border-gray-100-lg mb-2"
                  />
                  {imageDimensions && (
                    <div className="text-sm text-gray-600 mt-2">
                      <p>
                        Dimensions: {imageDimensions.width} × {imageDimensions.height}px
                      </p>
                      {categoryInfo && (
                        <p
                          className={
                            imageDimensions.width === parseInt(categoryInfo.recommendedSize.split('x')[0]) &&
                            imageDimensions.height === parseInt(categoryInfo.recommendedSize.split('x')[1])
                              ? 'text-[#d4a574] font-medium'
                              : 'text-orange-600 font-medium'
                          }
                        >
                          Recommended: {categoryInfo.recommendedSize}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Upload className="w-12 h-12 mx-auto mb-2" />
                  <p>No image selected</p>
                  <p className="text-xs mt-1">Select an image to see preview</p>
                </div>
              )}
            </div>
            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />
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
            disabled={uploadMutation.isPending || !formData.image_name || (!selectedFile && !isEditing)}
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {uploadMutation.isPending ? (isEditing ? 'Updating...' : 'Uploading...') : (isEditing ? 'Update Image' : 'Upload Image')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ImagePreviewModal({
  image,
  onClose,
  onDelete,
}: {
  image: AppImage
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const categoryInfo = IMAGE_CATEGORIES.find((c) => c.value === image.category)

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
            <h2 className="text-2xl font-bold text-gray-900">{image.image_name}</h2>
            {image.image_url.startsWith('/') && !image.image_url.startsWith('http') && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                ⚠️ Invalid URL
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div>
            <img
              src={image.image_url}
              alt={image.alt_text || image.image_name}
              className="w-full rounded-lg shadow-sm border border-gray-100-lg"
              onError={(e) => {
                // Fallback for broken images
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="Arial" font-size="16"%3EImage not found or invalid URL%3C/text%3E%3C/svg%3E'
              }}
            />
            {image.image_url.startsWith('/') && !image.image_url.startsWith('http') && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">⚠️ Local Path Detected</p>
                <p className="text-xs text-yellow-700 mt-1">
                  This image uses a local path. Please upload it to Supabase Storage and update the URL.
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
              <p className="text-gray-900 font-medium">
                {categoryInfo?.label || image.category}
              </p>
            </div>

            {image.width && image.height && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Dimensions</h3>
                <p className="text-gray-900 font-medium">
                  {image.width} × {image.height} pixels
                </p>
                {categoryInfo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: {categoryInfo.recommendedSize}
                  </p>
                )}
              </div>
            )}

            {image.file_size && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">File Size</h3>
                <p className="text-gray-900 font-medium">{formatFileSize(image.file_size)}</p>
              </div>
            )}

            {image.alt_text && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Alt Text</h3>
                <p className="text-gray-900">{image.alt_text}</p>
              </div>
            )}

            {image.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-900">{image.description}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  image.is_active
                    ? 'bg-[#d4a574]/10 text-[#b8956a]'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {image.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Image URL</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={image.image_url}
                  readOnly
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                    image.image_url.startsWith('/') && !image.image_url.startsWith('http')
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(image.image_url)
                    toast.success('URL copied to clipboard')
                  }}
                  className="px-3 py-2 bg-[#7a9c5e] text-white rounded-lg hover:bg-[#7a9c5e]/90 flex items-center gap-1"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              {image.image_url.startsWith('/') && !image.image_url.startsWith('http') && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Invalid Image URL</p>
                  <p className="text-xs text-yellow-700 mb-2">
                    This image uses a local path that won't work. Please:
                  </p>
                  <ol className="text-xs text-yellow-700 list-decimal list-inside space-y-1">
                    <li>Click "Edit" button above</li>
                    <li>Upload the image file to Supabase Storage</li>
                    <li>Or update the URL to a valid Supabase Storage URL</li>
                  </ol>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              {image.image_url.startsWith('http') && (
                <a
                  href={image.image_url}
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
                  if (confirm('Are you sure you want to delete this image?')) {
                    onDelete(image.id)
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




