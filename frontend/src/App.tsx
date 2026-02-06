import { useState } from 'react';
import { Home, User, MessageCircle, PlusCircle } from 'lucide-react';
import { TelegramProvider, useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';
import CreateListingPage from '@/pages/CreateListingPage';
import ListingDetailPage from '@/pages/ListingDetailPage';

type TabType = 'home' | 'post' | 'messages' | 'profile';
type PageType = 'main' | 'create' | 'listing' | 'chat';

interface PageState {
  type: PageType;
  listingId?: string;
  sellerId?: string;
}

function AppContent() {
  const { isLoading, isAuthenticated, error } = useAuth();
  const { haptic, isInTelegram } = useTelegram();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [page, setPage] = useState<PageState>({ type: 'main' });

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
  };

  const handleOpenListing = (listingId: string) => {
    setPage({ type: 'listing', listingId });
  };

  const handleOpenChat = (listingId: string, sellerId: string) => {
    setPage({ type: 'chat', listingId, sellerId });
    // For now, just switch to messages tab
    setActiveTab('messages');
    setPage({ type: 'main' });
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

  // Render pages
  if (page.type === 'create') {
    return (
      <CreateListingPage
        onBack={handleBack}
        onSuccess={() => {
          handleBack();
          // Refresh home
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text">
      {/* Main Content */}
      <main className="pb-20">
        {activeTab === 'home' && <HomePage onOpenListing={handleOpenListing} />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'post' && (
          <CreateListingPage
            onBack={() => setActiveTab('home')}
            onSuccess={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'messages' && (
          <div className="flex flex-col items-center justify-center min-h-screen p-6">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-tg-text font-medium">መልእክቶች</p>
            <p className="text-tg-hint text-sm mt-1">Coming soon: Chat with buyers & sellers</p>
          </div>
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
}

function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
        isActive ? 'text-tg-button' : 'text-tg-hint'
      }`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}

function App() {
  return (
    <TelegramProvider>
      <AppContent />
    </TelegramProvider>
  );
}

export default App;
