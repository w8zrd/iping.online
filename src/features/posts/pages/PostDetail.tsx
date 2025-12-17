import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Ping, Comment, Profile } from '@/types'; // Import types
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'; // Import Avatar components
import { Button } from '@/components/ui/Button'; // Import Button
import { Textarea } from '@/components/ui/Textarea'; // Import Textarea
import { useAuth } from '@/providers/SupabaseAuthContext'; // Import useAuth
import { formatDistanceToNow } from 'date-fns'; // Import date-fns
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react'; // Import lucide-react icons
import { textParser } from '@/lib/textParser'; // Import textParser
import { toast } from '@/hooks/use-toast'; // Import toast hook
import LoadingSpinner from '@/components/LoadingSpinner'; // Import LoadingSpinner

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

interface PostDetailPing extends Ping {
  profiles?: Profile;
  likes_count: number;
  comments_count: number;
}

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetailPing | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPostAndComments = async () => {
      setLoading(true);
      setError(null);
      
      if (!id) {
        setError("Post ID is missing.");
        setLoading(false);
        return;
      }

      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from('pings')
        .select('*, profiles(username)')
        .eq('id', id)
        .single();

      if (postError) {
        logger.error('Error fetching post', postError, { userMessage: 'Failed to fetch post.' });
        setError('Failed to fetch post.'); // Keep for UI display
        setLoading(false);
        return;
      }

      // Fetch like count for the post
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('post_id', postData.id);

      // Fetch comments for the post
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('post_id', id)
        .order('created_at', { ascending: false });

      if (commentsError) {
        logger.error('Error fetching comments', commentsError, { userMessage: 'Failed to fetch comments.' });
        setError('Failed to fetch comments.'); // Keep for UI display
        setLoading(false);
        return;
      }
      
      setPost({ ...postData, likes_count: likesCount || 0, comments_count: commentsData.length } as PostDetailPing);
      setComments(commentsData as Comment[]);
      setLoading(false);
    };

    fetchPostAndComments();

    // Set up real-time subscription for new comments
    const commentChannel = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${id}` }, payload => {
        const newComment = payload.new as Comment;
        setComments((prevComments) => [newComment, ...prevComments]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentChannel);
    };
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      alert('You must be logged in to comment.');
      return;
    }

    if (!post) {
      setError("Cannot add comment: Post not loaded.");
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([
        { post_id: post.id, user_id: user.data.user.id, content: newComment }
      ]);

    if (error) {
      logger.error('Error adding comment', error, { userMessage: 'Failed to add comment.' });
      setError('Failed to add comment.'); // Keep for UI display
    } else {
      logger.info('Comment added', { data });
      setNewComment('');
      // The real-time subscription will update the comments state
    }
  };

  if (loading) return <LoadingSpinner text="Loading post details..." />;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!post) return <p>Post not found.</p>;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center mb-4">
          <img
            src="https://i.pravatar.cc/50"
            alt="Avatar"
            className="w-10 h-10 rounded-full mr-4"
          />
          <h3 className="font-bold">{post.profiles?.username || 'Unknown User'}</h3>
        </div>
        <p className="mb-4">{post.content}</p>
        <div className="flex justify-between text-gray-500">
          <span>{post.likes_count} Likes</span>
          <span>{post.comments_count} Comments</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h4 className="font-bold mb-2">Comments</h4>
        <form onSubmit={handleAddComment} className="mb-4">
          <textarea
            className="w-full p-2 border rounded-md mb-2"
            rows={3}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          ></textarea>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Add Comment
          </button>
        </form>
        {comments.length === 0 && <p>No comments yet. Be the first to comment!</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="border-t pt-2 mt-2">
            <p className="text-sm font-bold">{comment.profiles?.username || 'Unknown User'}</p>
            <p className="text-sm">{comment.content}</p>
            <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostDetail;