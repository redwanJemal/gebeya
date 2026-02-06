import { useState } from 'react';
import { 
  ArrowLeft, Phone, MapPin, Star, Package, 
  ShoppingBag, Heart, Settings, LogOut, 
  CheckCircle, AlertCircle, ChevronRight, Smartphone, Lock
} from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import { usersApi, setAccessToken } from '@/lib/api';
import { ProfileSkeleton } from '@/components/Skeleton';
import { PasscodeSettings } from '@/components/PasscodeLock';

interface ProfilePageProps {
  onBack?: () => void;
  onOpenMyListings?: () => void;
  onOpenFavorites?: () => void;
}

export default function ProfilePage({ onBack, onOpenMyListings, onOpenFavorites }: ProfilePageProps) {
  const { webApp, haptic } = useTelegram();
  const { user, refreshUser } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [showPasscodeSettings, setShowPasscodeSettings] = useState(false);

  const handleVerifyPhone = async () => {
    haptic.impact('medium');
    
    // Try Telegram's requestContact first
    if (webApp?.requestContact) {
      setVerifying(true);
      try {
        webApp.requestContact((sent: boolean) => {
          if (sent) {
            haptic.notification('success');
            // Contact sent to bot - show manual input as backup
            setShowPhoneInput(true);
          } else {
            haptic.notification('error');
          }
          setVerifying(false);
        });
      } catch (error) {
        console.error('requestContact failed:', error);
        setShowPhoneInput(true);
        setVerifying(false);
      }
    } else {
      // Fallback to manual input
      setShowPhoneInput(true);
    }
  };

  const handleSubmitPhone = async () => {
    if (!phoneInput.trim()) return;
    
    haptic.impact('medium');
    setVerifying(true);
    
    try {
      await usersApi.verifyPhone(phoneInput.trim());
      haptic.notification('success');
      await refreshUser();
      setShowPhoneInput(false);
      setPhoneInput('');
    } catch (error) {
      console.error('Phone verification failed:', error);
      haptic.notification('error');
      alert('ስልክ ቁጥር ማረጋገጥ አልተሳካም / Phone verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    haptic.impact('medium');
    setAccessToken(null);
    webApp?.close();
  };

  if (!user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-tg-secondary-bg px-4 py-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-tg-link mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>ተመለስ / Back</span>
          </button>
        )}
        
        {/* Profile Info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-tg-button flex items-center justify-center text-2xl text-tg-button-text font-bold">
            {user.first_name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-tg-text">
              {user.first_name} {user.last_name || ''}
            </h1>
            {user.username && (
              <p className="text-tg-hint">@{user.username}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {user.is_phone_verified ? (
                <span className="flex items-center gap-1 text-green-500 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  የተረጋገጠ / Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  ያልተረጋገጠ / Not Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-tg-text">{user.total_listings}</p>
            <p className="text-xs text-tg-hint">ዕቃዎች</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-tg-text">{user.total_sales}</p>
            <p className="text-xs text-tg-hint">ሽያጮች</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-tg-text flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {user.rating > 0 ? user.rating.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-tg-hint">ደረጃ</p>
          </div>
        </div>
      </div>

      {/* Phone Verification CTA */}
      {!user.is_phone_verified && (
        <div className="mx-4 mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Phone className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-tg-text">ስልክዎን ያረጋግጡ</h3>
              <p className="text-sm text-tg-hint mt-1">
                ዕቃ ለመሸጥ ስልክ ቁጥርዎን ማረጋገጥ ያስፈልጋል
              </p>
              <p className="text-xs text-tg-hint mt-0.5">
                Verify your phone to start selling
              </p>
              
              {showPhoneInput ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-4 py-2 bg-tg-bg border border-tg-hint/20 rounded-lg text-tg-text placeholder:text-tg-hint focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitPhone}
                      disabled={verifying || !phoneInput.trim()}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {verifying ? 'እየተጫነ...' : 'አረጋግጥ / Verify'}
                    </button>
                    <button
                      onClick={() => setShowPhoneInput(false)}
                      className="px-4 py-2 bg-tg-secondary-bg text-tg-hint rounded-lg text-sm"
                    >
                      ሰርዝ
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleVerifyPhone}
                  disabled={verifying}
                  className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {verifying ? 'እየተጫነ...' : '📱 ስልክ አረጋግጥ / Verify Phone'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verified Phone Display */}
      {user.is_phone_verified && user.phone && (
        <div className="mx-4 mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="text-sm font-medium text-tg-text">ስልክ ተረጋግጧል</p>
              <p className="text-tg-hint">{user.phone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="mt-4 px-4 space-y-2">
        <MenuItem
          icon={<Package className="w-5 h-5" />}
          label="ዕቃዎቼ / My Listings"
          badge={user.total_listings > 0 ? String(user.total_listings) : undefined}
          onClick={onOpenMyListings}
        />
        <MenuItem
          icon={<Heart className="w-5 h-5" />}
          label="የተወደዱ / Favorites"
          onClick={onOpenFavorites}
        />
        <MenuItem
          icon={<ShoppingBag className="w-5 h-5" />}
          label="ግዢዎቼ / My Purchases"
          onClick={() => alert('ብዙም ሳይቆይ / Coming soon')}
        />
        
        <div className="h-2" />
        
        <MenuItem
          icon={<MapPin className="w-5 h-5" />}
          label="አካባቢ / Location"
          value={user.area || user.city}
          onClick={() => alert('Coming soon: Change Location')}
        />
        <MenuItem
          icon={<Lock className="w-5 h-5" />}
          label={user?.has_passcode ? "ኮድ ቀይር / Change Passcode" : "ኮድ አክል / Set Passcode"}
          value={user?.has_passcode ? "✓" : undefined}
          onClick={() => setShowPasscodeSettings(true)}
        />
        <MenuItem
          icon={<Settings className="w-5 h-5" />}
          label="ቅንብሮች / Settings"
          onClick={() => alert('ብዙም ሳይቆይ / Coming soon')}
        />
        <MenuItem
          icon={<Smartphone className="w-5 h-5" />}
          label="ወደ ስክሪን ጨምር / Add to Home"
          onClick={() => {
            haptic.impact('light');
            if (webApp) {
              webApp.openLink('https://mini.redwanjemal.dev?install=true', { try_instant_view: false });
            }
          }}
        />
        
        <div className="h-2" />
        
        <MenuItem
          icon={<LogOut className="w-5 h-5 text-red-500" />}
          label="ውጣ / Logout"
          labelClassName="text-red-500"
          onClick={handleLogout}
        />
      </div>

      {/* Debug Info - Admin only */}
      {user.is_admin && (
        <div className="mt-8 mx-4 p-4 bg-tg-secondary-bg rounded-xl">
          <h3 className="text-sm font-medium text-tg-hint mb-2">🔧 Admin Debug</h3>
          <div className="space-y-1 text-xs font-mono text-tg-hint">
            <p>ID: {user.id.slice(0, 8)}...</p>
            <p>TG ID: {user.telegram_id}</p>
            <p>Phone: {user.phone || 'Not set'}</p>
            <p>Verified: {user.is_phone_verified ? 'Yes' : 'No'}</p>
            <p>Admin: ✅</p>
          </div>
        </div>
      )}

      {/* Passcode Settings Modal */}
      {showPasscodeSettings && (
        <PasscodeSettings
          hasPasscode={user.has_passcode || false}
          onClose={() => setShowPasscodeSettings(false)}
          onSuccess={() => {
            setShowPasscodeSettings(false);
            refreshUser();
          }}
        />
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  badge?: string;
  labelClassName?: string;
  onClick?: () => void;
}

function MenuItem({ icon, label, value, badge, labelClassName, onClick }: MenuItemProps) {
  const { haptic } = useTelegram();

  const handleClick = () => {
    haptic.selection();
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 p-3 bg-tg-secondary-bg rounded-xl active:scale-[0.98] transition-transform"
    >
      <span className="text-tg-hint">{icon}</span>
      <span className={`flex-1 text-left ${labelClassName || 'text-tg-text'}`}>
        {label}
      </span>
      {badge && (
        <span className="px-2 py-0.5 bg-tg-button text-tg-button-text text-xs rounded-full">
          {badge}
        </span>
      )}
      {value && (
        <span className="text-tg-hint text-sm">{value}</span>
      )}
      <ChevronRight className="w-4 h-4 text-tg-hint" />
    </button>
  );
}
