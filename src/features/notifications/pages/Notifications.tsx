import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Check, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '@/providers/NotificationContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/SupabaseAuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Notification {
  id: string;
  type: string;
  content: any;
  is_read: boolean;
  created_at: string;
  user_id: string; // The user receiving the notification
}

// Helper to format notification text and get related user info
// This assumes content jsonb has structured data like { actor: { username, display_name... }, text: "...", link: "..." }
// Since the schema is generic jsonb, we need to adapt based on how we insert data.
// For now, I'll assume we need to fetch related profiles or the content stores actor info.

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markNotificationAsRead } = useNotificationContext();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
        
        // Mark unread as read
        data?.forEach(async (notif) => {
             if (!notif.is_read) {
                 await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
                 markNotificationAsRead(notif.id);
             }
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
    } finally {
        setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
      case 'friend_request':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  if (loading) {
      return (
        <div className="min-h-screen pb-32 bg-background">
          <Header />
          <div className="max-w-2xl mx-auto p-4">
            <div className="mb-8 pt-24 animate-fade-in">
              <h1 className="text-3xl font-bold">Notifications</h1>
            </div>
            <div className="glass-strong rounded-3xl shadow-md overflow-hidden flex justify-center items-center h-40">
              <LoadingSpinner text="Loading notifications..." />
            </div>
          </div>
          <Navigation />
        </div>
      );
  }

  return (
    <div className="min-h-screen pb-32 bg-background">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-8 pt-24 animate-fade-in">
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        <div className="glass-strong rounded-3xl shadow-md overflow-hidden">
          {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map((notification, index) => {
                // Parse content if string, or use directly if object
                const content = typeof notification.content === 'string' ? JSON.parse(notification.content) : notification.content;
                const actor = content.actor || { displayName: 'Unknown', username: 'unknown' };

                return (
                    <div
                    key={notification.id}
                    className={`p-4 animate-fade-in border-b border-border/30 last:border-b-0 ${
                        !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    >
                    <div className="flex items-start gap-3">
                        <div className="relative">
                        <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 text-white font-bold">
                            {actor.displayName?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                            {getIcon(notification.type)}
                        </div>
                        </div>

                        <div className="flex-1">
                        <div className="flex items-center gap-1">
                            <span className="font-semibold">{actor.displayName}</span>
                            <span className="text-muted-foreground text-sm">
                            @{actor.username}
                            </span>
                        </div>
                        
                        <p className="text-sm text-foreground/80">{content.text || 'New notification'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                        </p>
                        </div>
                    </div>
                    </div>
                );
            })
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Notifications;
