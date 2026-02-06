import { useState } from 'react';
import { Home, User, MessageCircle, PlusCircle } from 'lucide-react';
import { TelegramProvider, useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';

type TabType = 'home' | 'post' | 'messages' | 'profile';

function AppContent() {
  const { isLoading, isAuthenticated, error } = useAuth();
  const { haptic } = useTelegram();
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const handleTabChange = (tab: TabType) => {
    haptic.selection();
    setActiveTab(tab);
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

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text">
      {/* Main Content */}
      <main className="pb-16">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'post' && (
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-tg-hint">Coming soon: Create Listing</p>
          </div>
        )}
        {activeTab === 'messages' && (
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-tg-hint">Coming soon: Messages</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      {isAuthenticated && (
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
