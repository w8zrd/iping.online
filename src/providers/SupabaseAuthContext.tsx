import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean; // Add isAdmin to the context type
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // Initialize isAdmin state

  useEffect(() => {
    const isMounted = { current: true };

    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single();

        if (!isMounted.current) return { isAdmin: false };

        if (error) {
          logger.error('Error fetching admin status', error);
          return { isAdmin: false };
        }
        return { isAdmin: data?.is_admin ?? false };
      } catch (err) {
        logger.error('Exception in fetchUserProfile', err);
        return { isAdmin: false };
      }
    };

    const handleAuthStateChange = async (_event: string, session: Session | null) => {
      if (!isMounted.current) return;
      
      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { isAdmin } = await fetchUserProfile(session.user.id);
          if (isMounted.current) {
             setIsAdmin(isAdmin);
          }
        } else {
          if (isMounted.current) {
             setIsAdmin(false);
          }
        }
      } catch (e) {
        logger.error('Error in handleAuthStateChange', e);
        if (isMounted.current) {
          setUser(null);
          setSession(null);
          setIsAdmin(false);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    // 1. Set up the subscription first to catch initial and subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // 2. Initialize auth state based on current session
    const initializeAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            logger.info('Initial session check', { session });
            
            // Safety timeout: if auth takes too long, stop loading
            setTimeout(() => {
                if (isMounted.current && loading) {
                    console.warn('Auth loading timed out, forcing completion');
                    setLoading(false);
                }
            }, 5000);

            if (session) {
                // Manually trigger the state update for the initial session,
                // as onAuthStateChange might not fire for an already existing session.
                // We await this to ensure isAdmin and user are correctly set before proceeding.
                await handleAuthStateChange('INITIAL_LOAD', session);
            } else {
                // If no session, explicitly set state and stop loading
                setUser(null);
                setSession(null);
                setIsAdmin(false);
                setLoading(false); // Ensure loading is false if no session
            }
        } catch (error) {
            logger.error('Error fetching initial session', error);
            if (isMounted.current) {
                setUser(null);
                setSession(null);
                setIsAdmin(false);
                setLoading(false); // Ensure loading is false on error
            }
        }
    }
    initializeAuth();


    const handleUnload = () => {
      logger.warn('Page unloading detected. Ensure all resources are cleaned up.');
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    logger.info('Attempting sign in', { email });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      logger.error('Sign in error', error, { userMessage: error.message, showToast: true });
    } else {
      logger.info('User signed in successfully.');
    }
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = import.meta.env.VITE_APP_URL || `${window.location.origin}/`;
    
    logger.info('Attempting sign up', { email, username });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          display_name: username,
        }
      }
    });
    if (error) {
      logger.error('Sign up error', error, { userMessage: error.message, showToast: true });
    } else {
      logger.info('User signed up successfully. Check email for verification.');
    }
    return { error };
  };

  const signOut = async () => {
    logger.info('Attempting sign out.');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out error', error, { userMessage: error.message, showToast: true });
    } else {
      logger.info('User signed out successfully.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
