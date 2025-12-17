import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { ChatProvider } from "./providers/ChatContext";
import { NotificationProvider } from "./providers/NotificationContext";
import { useAuth } from "./providers/SupabaseAuthContext";
import { Toaster } from "@/components/ui/Toaster";
import { AppSkeleton } from "./components/skeletons/AppSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy load components
const Home = lazy(() => import("./features/posts/pages/Home"));
const Profile = lazy(() => import("./features/profile/pages/Profile"));
const SearchResults = lazy(() => import("./features/search/pages/SearchResults"));
const Settings = lazy(() => import("./features/settings/pages/Settings"));
const Notifications = lazy(() => import("./features/notifications/pages/Notifications"));
const Chats = lazy(() => import("./features/chat/pages/Chats"));
const ChatConversation = lazy(() => import("./features/chat/pages/ChatConversation"));
const SupabaseAuth = lazy(() => import("./features/auth/pages/SupabaseAuth"));
const NotFound = lazy(() => import("./pages/error/NotFound"));
const PostDetail = lazy(() => import("./features/posts/pages/PostDetail"));
const queryClient = new QueryClient();

const AuthRequiredWrapper = ({ children }: { children: React.ReactNode; }) => {
  const { user, loading } = useAuth();
  
  console.log('AuthRequiredWrapper: user', user, 'loading', loading);

  if (loading) {
    console.log('AuthRequiredWrapper: Showing AppSkeleton due to loading');
    return <AppSkeleton />;
  }
  
  if (!user) {
    console.log('AuthRequiredWrapper: User not found, navigating to /auth');
    return <Navigate to="/auth" replace />; // Redirect to auth page if not logged in
  }
  
  console.log('AuthRequiredWrapper: User authenticated, rendering children');
  return <>{children}</>;
};

const App = () => {
  console.log('App: Rendering App component');
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ChatProvider>
          <NotificationProvider>
              <BrowserRouter>
                <Suspense fallback={<AppSkeleton />}>
                  <Routes>
                    <Route path="/auth" element={<SupabaseAuth />} />
                    <Route path="/" element={<AuthRequiredWrapper><Home /></AuthRequiredWrapper>} />
                    <Route path="/:username" element={<AuthRequiredWrapper><Profile /></AuthRequiredWrapper>} />
                    <Route path="/profile" element={<AuthRequiredWrapper><Profile /></AuthRequiredWrapper>} />
                    <Route path="/post/:id" element={<AuthRequiredWrapper><PostDetail /></AuthRequiredWrapper>} />
                    <Route path="/search" element={<AuthRequiredWrapper><SearchResults /></AuthRequiredWrapper>} />
                    <Route path="/notifications" element={<AuthRequiredWrapper><Notifications /></AuthRequiredWrapper>} />
                    <Route path="/chats" element={<AuthRequiredWrapper><Chats /></AuthRequiredWrapper>} />
                    <Route path="/chats/:chatId" element={<AuthRequiredWrapper><ChatConversation /></AuthRequiredWrapper>} />
                    <Route path="/settings" element={<AuthRequiredWrapper><Settings /></AuthRequiredWrapper>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
          </NotificationProvider>
          <Toaster />
        </ChatProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
