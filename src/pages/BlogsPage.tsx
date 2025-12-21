import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SkeletonLoader, CardSkeleton } from "@/components/SkeletonLoader";

const BlogsPage = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    fetchBlogs();
  }, []);

  const [categories, setCategories] = useState<string[]>(['All']);

  const fetchBlogs = async () => {
    try {
      // Optimized: Only select needed fields
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, is_published, published_at, external_link, category, created_at, author, read_time')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      if (data) setBlogs(data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data) {
        const categoryNames = data.map(cat => cat.name);
        setCategories(['All', ...categoryNames]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback: extract from blogs if categories table doesn't exist
      const blogCategories = Array.from(new Set(blogs.map(blog => blog.category).filter(Boolean)));
      if (blogCategories.length > 0) {
        setCategories(['All', ...blogCategories]);
      }
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [blogs]);
  
  const filteredBlogs = selectedCategory === "All" 
    ? blogs 
    : blogs.filter(blog => blog.category === selectedCategory);

  const handleBlogClick = (blog: any) => {
    // If external link exists, open it in a new tab
    if (blog.external_link) {
      window.open(blog.external_link, '_blank', 'noopener,noreferrer');
    } else {
      // Otherwise, navigate to internal blog detail page
      navigate(`/blog/${blog.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 header-safe-area">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <SkeletonLoader variant="text" width="200px" className="mb-2" />
            <SkeletonLoader variant="text" width="150px" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 header-safe-area">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Karma Terra Blog</h1>
                <p className="text-sm text-gray-600">Latest insights on skincare & wellness</p>
              </div>
            </div>
            <BookOpen className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {filteredBlogs.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No blogs found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                onClick={() => handleBlogClick(blog)}
                className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                {/* Blog Image */}
                <div className="relative h-48 overflow-hidden">
                  <img loading="lazy"
                    src={blog.featured_image}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white text-gray-800 text-xs font-medium px-3 py-1 rounded-full shadow-md">
                      {blog.category}
                    </span>
                  </div>
                </div>

                {/* Blog Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                    {blog.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {blog.excerpt}
                  </p>

                  {/* Author & Read Time */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>
                      <p className="font-medium text-gray-700">{blog.author || 'Karma Terra'}</p>
                      <p className="text-gray-500">Karma Terra Blog</p>
                    </div>
                    {blog.read_time && (
                      <div className="flex items-center gap-1">
                        <span className="text-green-600 font-medium">{blog.read_time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogsPage;

