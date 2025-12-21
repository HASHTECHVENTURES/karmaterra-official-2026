import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, User, Calendar, Share2, Heart } from "lucide-react";
import { AndroidPageHeader } from "../components/AndroidBackButton";
import { supabase } from "@/lib/supabase";

const BlogDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  // Fetch blog post from Supabase
  useEffect(() => {
    const fetchBlogPost = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching blog post:', error);
        } else {
          setPost(data);
          // If external link exists, redirect immediately
          if (data?.external_link) {
            window.location.href = data.external_link;
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBlogPost();
    }
  }, [id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleLike = () => {
    setLiked(!liked);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Blog Post Not Found</h1>
          <Button onClick={() => navigate('/')} className="bg-karma-gold hover:bg-karma-gold/90">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Android Material Design Header */}
      <AndroidPageHeader
        title={post?.title || "Blog Post"}
        onBack={() => navigate(-1)}
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`p-2 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center ${
                liked ? 'text-red-500' : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Like this post"
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Share this post"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        }
      />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Blog post content */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Hero Image */}
          <div className="aspect-[16/9] overflow-hidden">
            <img loading="lazy" 
              src={post.featured_image} 
              alt={post.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=400&fit=crop";
              }}
            />
          </div>

          {/* Article Content */}
          <div className="p-6">
            {/* Category Badge */}
            <div className="mb-4">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                {post.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold mb-6 leading-tight text-gray-900" style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: '700',
              lineHeight: '1.2'
            }}>{post.title}</h1>

            {/* Meta Info */}
            <div className="flex items-center gap-6 mb-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.published_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.read_time}</span>
              </div>
            </div>

            {/* Article Body */}
            <div className="prose prose-lg max-w-none">
              <div 
                className="text-gray-800 leading-relaxed text-base font-sans"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  lineHeight: '1.7',
                  fontSize: '16px'
                }}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;