import { useState, useEffect, useRef } from 'react';
import { Home, User, MessageCircle, PlusCircle } from 'lucide-react';
import { TelegramProvider, useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import { chatsApi } from '@/lib/api';
import { ToastProvider, useToast } from '@/components/Toast';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PasscodeLock } from '@/components/PasscodeLock';
import LoadingScreen from '@/components/LoadingScreen';
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';
import CreateListingPage from '@/pages/CreateListingPage';
import EditListingPage from '@/pages/EditListingPage';
import ListingDetailPage from '@/pages/ListingDetailPage';
import ChatsPage from '@/pages/ChatsPage';
import ChatRoomPage from '@/pages/ChatRoomPage';
import MyListingsPage from '@/pages/MyListingsPage';
import FavoritesPage from '@/pages/FavoritesPage';
import MyPurchasesPage from '@/pages/MyPurchasesPage';
import SellerProfilePage from '@/pages/SellerProfilePage';

type TabType = 'home' | 'post' | 'messages' | 'profile';
type PageType = 'main' | 'create' | 'listing' | 'chat-room' | 'edit' | 'my-listings' | 'favorites' | 'my-purchases' | 'seller-profile';

interface PageState {
  type: PageType;
  listingId?: string;
  chatId?: string;
  sellerId?: string;
}

function AppContent() {
  const { isLoading, isAuthenticated, error, user } = useAuth();
  const { haptic, isInTelegram, webApp } = useTelegram();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [page, setPage] = useState<PageState>({ type: 'main' });
  const [unreadCount, setUnreadCount] = useState(0);
  const lastUnreadRef = useRef(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Check if passcode lock is needed
  const needsPasscodeLock = isAuthenticated && user?.has_passcode && !isUnlocked;

  // Handle deep links - check for /l/{id} pattern in start_param or URL
  useEffect(() => {
    // Wait for auth to complete before handling deep links
    if (isLoading) return;
    
    const handleDeepLink = () => {
      // Check Telegram start_param first (format: l_uuid)
      const startParam = webApp?.initDataUnsafe?.start_param;
      console.log('Deep link check - start_param:', startParam);
      
      if (startParam?.startsWith('l_')) {
        const listingId = startParam.slice(2);
        console.log('Opening listing from deep link:', listingId);
        setPage({ type: 'listing', listingId });
        return;
      }
      
      // Check URL search params (format: ?startapp=l_uuid)
      const urlParams = new URLSearchParams(window.location.search);
      const startapp = urlParams.get('startapp');
      if (startapp?.startsWith('l_')) {
        const listingId = startapp.slice(2);
        console.log('Opening listing from URL param:', listingId);
        setPage({ type: 'listing', listingId });
        return;
      }
      
      // Check URL hash (format: #/l/uuid)
      const hash = window.location.hash;
      const hashMatch = hash.match(/^#\/l\/([a-zA-Z0-9-]+)$/);
      if (hashMatch) {
        console.log('Opening listing from hash:', hashMatch[1]);
        setPage({ type: 'listing', listingId: hashMatch[1] });
      }
    };
    
    handleDeepLink();
  }, [webApp, isLoading]);

  // Poll for unread messages
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkUnread = async () => {
      try {
        const { count } = await chatsApi.getUnreadCount();
        setUnreadCount(count);
        
        // Show toast if new messages arrived
        if (count > lastUnreadRef.current && lastUnreadRef.current > 0) {
          haptic.notification('success');
          showToast({
            type: 'message',
            title: 'አዲስ መልእክት / New message',
            message: `${count} unread message${count > 1 ? 's' : ''}`,
            onClick: () => {
              setActiveTab('messages');
              setPage({ type: 'main' });
            },
          });
        }
        lastUnreadRef.current = count;
      } catch (e) {
        // Ignore polling errors
      }
    };

    // Initial check
    checkUnread();

    // Poll every 10 seconds
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, haptic, showToast]);

  // Block access outside Telegram (except in dev)
  const isDev = import.meta.env.DEV;
  if (!isInTelegram && !isDev) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-tg-bg to-tg-secondary-bg">
        <p className="text-6xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold text-tg-text mb-2">ገበያ</h1>
        <p className="text-tg-hint mb-6">Ethiopian Marketplace</p>
        <div className="bg-tg-secondary-bg p-6 rounded-2xl max-w-sm">
          <p className="text-tg-text mb-4">
            ይህ መተግበሪያ በቴሌግራም ብቻ ይሰራል
          </p>
          <p className="text-tg-hint text-sm mb-4">
            This app only works inside Telegram
          </p>
          <a
            href="https://t.me/ContactNayaBot"
            className="inline-block px-6 py-3 bg-[#0088cc] text-white rounded-xl font-medium"
          >
            📱 Open in Telegram
          </a>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: TabType) => {
    haptic.selection();
    setActiveTab(tab);
    setPage({ type: 'main' });
    
    // Reset unread count when viewing messages
    if (tab === 'messages') {
      setUnreadCount(0);
      lastUnreadRef.current = 0;
    }
  };

  const handleOpenListing = (listingId: string) => {
    setPage({ type: 'listing', listingId });
  };

  const handleOpenChat = async (listingId: string, _sellerId: string) => {
    haptic.impact('medium');
    try {
      // Create or get existing chat
      const chat = await chatsApi.create(listingId);
      setPage({ type: 'chat-room', chatId: chat.id });
      setActiveTab('messages');
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleOpenChatRoom = (chatId: string) => {
    setPage({ type: 'chat-room', chatId });
  };

  const handleEditListing = (listingId: string) => {
    setPage({ type: 'edit', listingId });
  };

  const handleOpenMyListings = () => {
    setPage({ type: 'my-listings' });
  };

  const handleOpenFavorites = () => {
    setPage({ type: 'favorites' });
  };

  const handleOpenMyPurchases = () => {
    setPage({ type: 'my-purchases' });
  };

  const handleOpenSellerProfile = (sellerId: string) => {
    setPage({ type: 'seller-profile', sellerId });
  };

  const handleBack = () => {
    setPage({ type: 'main' });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-6xl mb-4">😕</p>
        <h1 className="text-xl font-bold text-tg-text mb-2">ችግር ተፈጥሯል</h1>
        <p className="text-tg-hint mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-tg-button text-tg-button-text rounded-lg"
        >
          እንደገና ሞክር / Retry
        </button>
      </div>
    );
  }

  // Show passcode lock if user has passcode configured
  if (needsPasscodeLock) {
    return <PasscodeLock onUnlock={() => setIsUnlocked(true)} />;
  }

  // Render special pages
  if (page.type === 'create') {
    return (
      <CreateListingPage
        onBack={handleBack}
        onSuccess={() => {
          handleBack();
          setActiveTab('home');
        }}
      />
    );
  }

  if (page.type === 'my-listings') {
    return (
      <MyListingsPage
        onBack={handleBack}
        onOpenListing={handleOpenListing}
        onEditListing={handleEditListing}
        onCreateListing={() => setActiveTab('post')}
      />
    );
  }

  if (page.type === 'favorites') {
    return (
      <FavoritesPage
        onBack={handleBack}
        onOpenListing={handleOpenListing}
      />
    );
  }

  if (page.type === 'my-purchases') {
    return (
      <MyPurchasesPage
        onBack={handleBack}
        onOpenListing={handleOpenListing}
      />
    );
  }

  if (page.type === 'seller-profile' && page.sellerId) {
    return (
      <SellerProfilePage
        sellerId={page.sellerId}
        onBack={handleBack}
        onOpenListing={handleOpenListing}
      />
    );
  }

  if (page.type === 'edit' && page.listingId) {
    return (
      <EditListingPage
        listingId={page.listingId}
        onBack={handleBack}
        onSuccess={() => {
          handleBack();
          setActiveTab('home');
        }}
      />
    );
  }

  if (page.type === 'listing' && page.listingId) {
    return (
      <ListingDetailPage
        listingId={page.listingId}
        onBack={handleBack}
        onChat={handleOpenChat}
        onEdit={handleEditListing}
        onOpenSellerProfile={handleOpenSellerProfile}
      />
    );
  }

  if (page.type === 'chat-room' && page.chatId) {
    return (
      <ChatRoomPage
        chatId={page.chatId}
        onBack={() => {
          setPage({ type: 'main' });
        }}
        onOpenListing={handleOpenListing}
      />
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text">
      {/* Main Content */}
      <main className="pb-20">
        {activeTab === 'home' && <HomePage onOpenListing={handleOpenListing} />}
        {activeTab === 'profile' && (
          <ProfilePage 
            onOpenMyListings={handleOpenMyListings}
            onOpenFavorites={handleOpenFavorites}
            onOpenMyPurchases={handleOpenMyPurchases}
          />
        )}
        {activeTab === 'post' && (
          <CreateListingPage
            onBack={() => setActiveTab('home')}
            onSuccess={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'messages' && (
          <ChatsPage onOpenChat={handleOpenChatRoom} />
        )}
      </main>

      {/* Bottom Navigation */}
      {isAuthenticated && page.type === 'main' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-tg-hint/10 px-2 pt-1 pb-safe z-50">
          <div className="flex justify-around items-center pb-2">
            <NavItem
              icon={<Home className="w-6 h-6" />}
              label="ዋና"
              isActive={activeTab === 'home'}
              onClick={() => handleTabChange('home')}
            />
            <NavItem
              icon={<PlusCircle className="w-6 h-6" />}
              label="ሽያጭ"
              isActive={activeTab === 'post'}
              onClick={() => handleTabChange('post')}
            />
            <NavItem
              icon={<MessageCircle className="w-6 h-6" />}
              label="መልእክት"
              isActive={activeTab === 'messages'}
              onClick={() => handleTabChange('messages')}
              badge={unreadCount > 0 ? unreadCount : undefined}
            />
            <NavItem
              icon={<User className="w-6 h-6" />}
              label="መገለጫ"
              isActive={activeTab === 'profile'}
              onClick={() => handleTabChange('profile')}
            />
          </div>
        </nav>
      )}
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon, label, isActive, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors relative ${
        isActive ? 'text-tg-button' : 'text-tg-hint'
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}

function App() {
  return (
    <TelegramProvider>
      <ToastProvider>
        <AppContent />
        <InstallPrompt />
      </ToastProvider>
    </TelegramProvider>
  );
}

export default App;
