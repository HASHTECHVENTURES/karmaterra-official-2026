import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Eye, EyeOff, BookOpen, Tag, Image as ImageIcon, Bell, X } from 'lucide-react'
import { toast } from 'sonner'

interface Blog {
  id: string
  title: string
  slug?: string
  excerpt: string
  content?: string
  featured_image: string
  category: string
  author: string
  read_time: string
  external_link?: string
  is_published: boolean
  published_at?: string
  created_at: string
}

export default function BlogsPage() {
  const [activeTab, setActiveTab] = useState<'blogs' | 'categories' | 'banner'>('blogs')
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: blogs, isLoading } = useQuery({
    queryKey: ['blogs'],
    queryFn: async () => {
      // Optimized: Only select needed fields
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, is_published, published_at, external_link, category, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      // Map data to Blog interface, providing defaults for missing fields
      return (data || []).map((item: any) => ({
        ...item,
        author: item.author || 'Admin',
        read_time: item.read_time || '5 min',
      })) as Blog[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] })
      toast.success('Blog deleted successfully')
    },
  })

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          is_published: !isPublished,
          published_at: !isPublished ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] })
      toast.success('Blog status updated')
    },
  })

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data || []) as Array<{ id: string; name: string; display_order: number; is_active: boolean }>
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading blogs...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog Management</h1>
        <p className="text-gray-600">Create, edit, and manage blog posts</p>
      </div>
      {activeTab === 'blogs' && (
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={() => {
              setEditingBlog(null)
              setShowAddForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
          >
            <Plus className="w-5 h-5" />
            Add Blog
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'blogs'
                ? 'border-[#d4a574] text-[#d4a574]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Blog Cards
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-[#d4a574] text-[#d4a574]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('banner')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'banner'
                ? 'border-[#d4a574] text-[#d4a574]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Banner Image
          </button>
        </div>
      </div>

      {showAddForm && (
        <BlogForm
          blog={editingBlog}
          categories={categories || []}
          onClose={() => {
            setShowAddForm(false)
            setEditingBlog(null)
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingBlog(null)
            queryClient.invalidateQueries({ queryKey: ['blogs'] })
          }}
        />
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <CategoriesManager />
      )}

      {/* Banner Image Tab */}
      {activeTab === 'banner' && (
        <BannerImageManager />
      )}

      {/* Blogs Tab */}
      {activeTab === 'blogs' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs?.map((blog) => (
              <div key={blog.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <img
                  src={blog.featured_image}
                  alt={blog.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs bg-[#d4a574]/10 text-[#b8956a] px-2 py-1 rounded">
                      {blog.category}
                    </span>
                    <button
                      onClick={() =>
                        togglePublishMutation.mutate({ id: blog.id, isPublished: blog.is_published })
                      }
                      className={`p-1 rounded ${
                        blog.is_published ? 'text-[#d4a574]' : 'text-gray-400'
                      }`}
                    >
                      {blog.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{blog.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{blog.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{blog.read_time}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingBlog(blog)
                          setShowAddForm(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this blog?')) {
                            deleteMutation.mutate(blog.id)
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

          {blogs?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No blogs found. Create your first blog!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface Category {
  id: string
  name: string
  display_order: number
  is_active: boolean
}

function CategoriesManager() {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data as Category[]) || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] })
      toast.success('Category deleted successfully')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('blog_categories')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] })
      toast.success('Category status updated')
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading categories...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-600">
          Manage blog categories. These categories will appear in the main app's blog filter.
        </p>
        <button
          onClick={() => {
            setEditingCategory(null)
            setShowAddForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {showAddForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => {
            setShowAddForm(false)
            setEditingCategory(null)
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingCategory(null)
            queryClient.invalidateQueries({ queryKey: ['blog-categories'] })
          }}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories?.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{category.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{category.display_order}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: category.id, isActive: category.is_active })}
                    className={`text-xs px-2 py-1 rounded ${
                      category.is_active
                        ? 'bg-[#d4a574]/10 text-[#b8956a]'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {category.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(category)
                        setShowAddForm(true)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this category?')) {
                          deleteMutation.mutate(category.id)
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

        {categories?.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No categories found. Create your first category!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryForm({
  category,
  onClose,
  onSuccess,
}: {
  category: Category | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (category) {
        const { error } = await supabase
          .from('blog_categories')
          .update(formData)
          .eq('id', category.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('blog_categories').insert([formData])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(category ? 'Category updated' : 'Category created')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save category')
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{category ? 'Edit Category' : 'Add Category'}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Skincare, Hair Care"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in the filter</p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Active (show in main app)</span>
            </label>
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
            disabled={saveMutation.isPending || !formData.name}
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BlogForm({
  blog,
  categories,
  onClose,
  onSuccess,
}: {
  blog: Blog | null
  categories: Array<{ id: string; name: string }>
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    title: blog?.title || '',
    excerpt: blog?.excerpt || '',
    featured_image: blog?.featured_image || '',
    category: blog?.category || '',
    author: blog?.author || 'Karma Terra',
    read_time: blog?.read_time || '5 min read',
    external_link: blog?.external_link || '',
    is_published: blog?.is_published ?? false,
    send_notification: false, // New field for notification option
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(blog?.featured_image || null)
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      setSelectedFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = formData.featured_image

      // Upload image if a new file is selected
      if (selectedFile) {
        setUploading(true)
        try {
          const fileExt = selectedFile.name.split('.').pop()
          const fileName = `blog-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `blog-images/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('app-images')
            .upload(filePath, selectedFile)

          if (uploadError) {
            if (uploadError.message?.includes('Bucket not found')) {
              throw new Error('Storage bucket "app-images" not found. Please create it in Supabase Dashboard > Storage.')
            }
            throw uploadError
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('app-images').getPublicUrl(filePath)
          imageUrl = publicUrl
        } catch (error: any) {
          throw new Error(error.message || 'Failed to upload image')
        } finally {
          setUploading(false)
        }
      }

      // Generate slug from title (required by database)
      const generateSlug = (title: string): string => {
        const base = title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        
        return base || `blog-${Date.now()}` // Fallback if title is empty
      }

      // Generate unique slug that doesn't exist in database
      const generateUniqueSlug = async (baseSlug: string, excludeId?: string): Promise<string> => {
        let slug = baseSlug
        let counter = 1
        
        // First check if we're editing and slug hasn't changed - keep existing slug
        if (blog && blog.slug === baseSlug) {
          return blog.slug
        }
        
        while (true) {
          // Check if slug exists (excluding current blog if editing)
          let query = supabase
            .from('blog_posts')
            .select('id')
            .eq('slug', slug)
            .limit(1)
          
          if (excludeId) {
            query = query.neq('id', excludeId)
          }
          
          const { data, error } = await query
          
          if (error) {
            console.error('Error checking slug:', error)
            // If error checking, append timestamp to ensure uniqueness
            return `${baseSlug}-${Date.now()}`
          }
          
          // If slug doesn't exist, use it
          if (!data || data.length === 0) {
            return slug
          }
          
          // Slug exists, append counter and try again
          slug = `${baseSlug}-${counter}`
          counter++
          
          // Safety limit to prevent infinite loop
          if (counter > 1000) {
            return `${baseSlug}-${Date.now()}`
          }
        }
      }

      // Generate unique slug
      const baseSlug = generateSlug(formData.title)
      const uniqueSlug = await generateUniqueSlug(baseSlug, blog?.id)

      const dataToSave = {
        title: formData.title,
        slug: uniqueSlug, // Use unique slug
        excerpt: formData.excerpt,
        content: null, // Content is optional for external blog links
        featured_image: imageUrl,
        category: formData.category,
        author: formData.author,
        read_time: formData.read_time,
        external_link: formData.external_link,
        is_published: formData.is_published,
        published_at: formData.is_published && !blog?.published_at
          ? new Date().toISOString()
          : blog?.published_at,
      }

      let savedBlog
      if (blog) {
        const { data, error } = await supabase
          .from('blog_posts')
          .update(dataToSave)
          .eq('id', blog.id)
          .select()
          .single()
        if (error) {
          // If it's a duplicate slug error, regenerate and try again
          if (error.code === '23505' && error.message?.includes('slug')) {
            console.log('Slug conflict detected, regenerating...')
            const newSlug = await generateUniqueSlug(baseSlug, blog.id)
            dataToSave.slug = newSlug
            const { data: retryData, error: retryError } = await supabase
              .from('blog_posts')
              .update(dataToSave)
              .eq('id', blog.id)
              .select()
              .single()
            if (retryError) throw retryError
            savedBlog = retryData
          } else {
            throw error
          }
        } else {
          savedBlog = data
        }
      } else {
        const { data, error } = await supabase.from('blog_posts').insert([dataToSave]).select().single()
        if (error) {
          // If it's a duplicate slug error, regenerate and try again
          if (error.code === '23505' && error.message?.includes('slug')) {
            console.log('Slug conflict detected, regenerating...')
            const newSlug = await generateUniqueSlug(baseSlug)
            dataToSave.slug = newSlug
            const { data: retryData, error: retryError } = await supabase
              .from('blog_posts')
              .insert([dataToSave])
              .select()
              .single()
            if (retryError) throw retryError
            savedBlog = retryData
          } else {
            throw error
          }
        } else {
          savedBlog = data
        }
      }

      // Send notification if requested and blog is published
      if (formData.send_notification && formData.is_published && savedBlog) {
        try {
          const notificationData = {
            title: 'New Beauty Tips Available! 📖',
            message: `Check out our latest blog: "${formData.title}". ${formData.excerpt || 'Read more in the app!'}`,
            type: 'info',
            priority: 'normal',
            target_audience: 'all',
            template_name: 'new_blog_post',
            image_url: formData.featured_image || null,
            link: formData.external_link || `/blogs/${savedBlog.slug || savedBlog.id}`,
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
              toast.warning('Blog saved, but notification sending failed')
            } else {
              toast.success('Blog published and notification sent!')
            }
          }
        } catch (notifErr: any) {
          console.error('Error creating notification:', notifErr)
          toast.warning('Blog saved, but notification creation failed')
        }
      }
    },
    onSuccess: () => {
      toast.success(blog ? 'Blog card updated' : 'Blog card created')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save blog card')
    },
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{blog ? 'Edit Blog Card' : 'Create Blog Card'}</h2>
        <p className="text-sm text-gray-600 mb-6">
          Create a blog card that links to an external blog. Users will see this card and can click to read the full blog.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Blog post title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Short description that appears on the blog card"
            />
            <p className="text-xs text-gray-500 mt-1">
              This description will appear on the blog card to give users a preview of the content.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Manage categories in the Categories tab
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Read Time</label>
              <input
                type="text"
                value={formData.read_time}
                onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., 5 min read"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blog Image *</label>
            <div className="space-y-3">
              {/* Upload Option */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Supported: JPG, PNG, WebP</p>
              </div>
              
              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* URL Option */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.featured_image}
                  onChange={(e) => {
                    setFormData({ ...formData, featured_image: e.target.value })
                    setImagePreview(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    onError={() => {
                      setImagePreview(null)
                      toast.error('Failed to load image preview')
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              External Blog Link *
              <span className="text-red-500 ml-1">(Required)</span>
            </label>
            <input
              type="url"
              value={formData.external_link}
              onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://example.com/blog-post"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the URL where users will be redirected when they click on the blog card. The full blog content should be available at this link.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Publish immediately (show on main app)</span>
            </label>
          </div>
          
          {formData.is_published && (
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
                Send push notification to all users about this new blog post
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={saveMutation.isPending || uploading}
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending || 
              uploading || 
              !formData.title || 
              !formData.excerpt || 
              !formData.external_link ||
              (!formData.featured_image && !selectedFile)
            }
            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#d4a574]/90 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : saveMutation.isPending ? 'Saving...' : 'Save Blog Card'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Banner Image Manager Component
function BannerImageManager() {
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Fetch current blog banner image
  const { data: config, isLoading } = useQuery({
    queryKey: ['app-config-banner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('blog_banner_image')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })

  useEffect(() => {
    if (config?.blog_banner_image) {
      setImagePreview(config.blog_banner_image)
    }
  }, [config])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      setSelectedFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = config?.blog_banner_image || ''

      // Upload image if a new file is selected
      if (selectedFile) {
        setUploading(true)
        try {
          const fileExt = selectedFile.name.split('.').pop()
          const fileName = `blog-banner-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `blog-banner/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('app-images')
            .upload(filePath, selectedFile)

          if (uploadError) {
            if (uploadError.message?.includes('Bucket not found')) {
              throw new Error('Storage bucket "app-images" not found. Please create it in Supabase Dashboard > Storage.')
            }
            throw uploadError
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('app-images').getPublicUrl(filePath)
          imageUrl = publicUrl
        } catch (error: any) {
          throw new Error(error.message || 'Failed to upload image')
        } finally {
          setUploading(false)
        }
      }

      // Update or insert app_config
      const { data: existingConfig } = await supabase
        .from('app_config')
        .select('id')
        .maybeSingle()

      if (existingConfig?.id) {
        const { error } = await supabase
          .from('app_config')
          .update({ blog_banner_image: imageUrl })
          .eq('id', existingConfig.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('app_config')
          .insert([{ blog_banner_image: imageUrl }])
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Blog banner image saved successfully')
      queryClient.invalidateQueries({ queryKey: ['app-config-banner'] })
      setSelectedFile(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save banner image')
    },
  })

  const removeImage = async () => {
    try {
      const { data: existingConfig } = await supabase
        .from('app_config')
        .select('id')
        .maybeSingle()

      if (existingConfig?.id) {
        const { error } = await supabase
          .from('app_config')
          .update({ blog_banner_image: null })
          .eq('id', existingConfig.id)
        if (error) throw error
        toast.success('Banner image removed')
        setImagePreview(null)
        setSelectedFile(null)
        queryClient.invalidateQueries({ queryKey: ['app-config-banner'] })
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove banner image')
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Blog Banner Image</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage the banner image displayed in the "Latest Blog Posts" section on the homepage
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="space-y-6">
          {/* Current/Preview Image */}
          {imagePreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Banner Image
              </label>
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Blog banner preview"
                  className="max-w-full h-auto max-h-96 rounded-lg border border-gray-200"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {imagePreview ? 'Replace Banner Image' : 'Upload Banner Image'}
            </label>
            <div className="mt-1 flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  <ImageIcon className="w-5 h-5" />
                  {imagePreview ? 'Choose New Image' : 'Choose Image'}
                </span>
              </label>
              {selectedFile && (
                <span className="text-sm text-gray-600">
                  Selected: {selectedFile.name}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Recommended size: 1200x600px. Max file size: 5MB
            </p>
          </div>

          {/* Save Button */}
          {(selectedFile || imagePreview) && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={uploading || saveMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading...' : saveMutation.isPending ? 'Saving...' : 'Save Banner Image'}
              </button>
              {selectedFile && (
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setImagePreview(config?.blog_banner_image || null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

