import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Heart, Share2, MapPin, Clock, Eye, 
  MessageCircle, Phone, ChevronLeft, ChevronRight,
  Verified, Flag, CheckCircle
} from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import { listingsApi, type Listing } from '@/lib/api';

const BOT_USERNAME = 'ContactNayaBot'; // Your bot username

interface ListingDetailPageProps {
  listingId: string;
  onBack: () => void;
  onChat: (listingId: string, sellerId: string) => void;
}

const CONDITION_LABELS: Record<string, { am: string; en: string }> = {
  new: { am: 'አዲስ', en: 'New' },
  like_new: { am: 'እንደ አዲስ', en: 'Like New' },
  used: { am: 'ጥቅም ላይ የዋለ', en: 'Used' },
  for_parts: { am: 'ለመለዋወጫ', en: 'For Parts' },
};

export default function ListingDetailPage({ listingId, onBack, onChat }: ListingDetailPageProps) {
  const { haptic, webApp } = useTelegram();
  const { user } = useAuth();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    loadListing();
  }, [listingId]);

  const loadListing = async () => {
    setLoading(true);
    try {
      const data = await listingsApi.get(listingId);
      setListing(data);
      setIsFavorited(data.is_favorited || false);
    } catch (error) {
      console.error('Failed to load listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!listing) return;
    haptic.impact('light');
    
    try {
      const result = await listingsApi.toggleFavorite(listing.id);
      setIsFavorited(result.favorited);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleShare = () => {
    haptic.impact('light');
    // Share via Telegram with deep link
    if (webApp && listing) {
      // Use deep link format: t.me/BotName?startapp=l_{listingId}
      const deepLink = `https://t.me/${BOT_USERNAME}/app?startapp=l_${listing.id}`;
      const text = `${listing.title}\n💰 ${formatPrice(listing.price)}\n📍 ${listing.area || listing.city}`;
      webApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);
    }
  };

  const handleMarkAsSold = async () => {
    if (!listing) return;
    haptic.impact('medium');
    setMarking(true);
    
    try {
      const updated = await listingsApi.markAsSold(listing.id);
      setListing({ ...listing, status: updated.status });
      haptic.notification('success');
    } catch (error) {
      console.error('Failed to mark as sold:', error);
      haptic.notification('error');
      alert('Failed to mark as sold');
    } finally {
      setMarking(false);
    }
  };

  const handleContact = () => {
    if (!listing?.seller) return;
    haptic.impact('medium');
    onChat(listing.id, listing.seller.id);
  };

  const handleCall = () => {
    haptic.impact('medium');
    // For demo, just show alert
    alert('ሻጩን ለመደወል ወደ ቻት ይሂዱ\nGo to chat to contact seller');
  };

  const nextImage = () => {
    if (!listing?.images?.length) return;
    haptic.selection();
    setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
  };

  const prevImage = () => {
    if (!listing?.images?.length) return;
    haptic.selection();
    setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET').format(price) + ' ብር';
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} ደቂቃ በፊት`;
    if (diffHours < 24) return `${diffHours} ሰዓት በፊት`;
    if (diffDays < 7) return `${diffDays} ቀን በፊት`;
    return date.toLocaleDateString('am-ET');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-tg-button border-t-transparent" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-tg-bg p-6">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-tg-text font-medium">ዕቃው አልተገኘም</p>
        <p className="text-tg-hint text-sm">Listing not found</p>
        <button onClick={onBack} className="mt-4 px-6 py-2 bg-tg-button text-tg-button-text rounded-xl">
          ተመለስ / Back
        </button>
      </div>
    );
  }

  const isOwner = user?.id === listing.seller?.id;

  return (
    <div className="min-h-screen pb-24 bg-tg-bg">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleFavorite}
            className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative aspect-square bg-tg-secondary-bg">
        {listing.images && listing.images.length > 0 ? (
          <>
            <img
              src={listing.images[currentImageIndex]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 rounded-full text-white text-sm">
                  {currentImageIndex + 1} / {listing.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            📦
          </div>
        )}

        {/* Featured Badge */}
        {listing.is_featured && (
          <div className="absolute top-16 left-4 bg-yellow-500 text-white text-sm px-3 py-1 rounded-full">
            ⭐ Featured
          </div>
        )}
        
        {/* Sold Badge */}
        {listing.status === 'sold' && (
          <div className="absolute top-16 right-4 bg-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
            ተሽጧል / SOLD
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Price & Title */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-tg-text">{formatPrice(listing.price)}</p>
            {listing.is_negotiable && (
              <span className="text-sm text-tg-hint bg-tg-secondary-bg px-2 py-1 rounded">
                ይደራደራል
              </span>
            )}
          </div>
          <h1 className="text-xl text-tg-text mt-1">{listing.title}</h1>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-tg-hint">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{listing.area || listing.city}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{getTimeAgo(listing.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{listing.views_count}</span>
          </div>
        </div>

        {/* Condition */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-tg-hint">ሁኔታ:</span>
          <span className="px-3 py-1 bg-tg-secondary-bg rounded-full text-sm text-tg-text">
            {CONDITION_LABELS[listing.condition]?.am || listing.condition}
          </span>
        </div>

        {/* Description */}
        {listing.description && (
          <div className="bg-tg-secondary-bg p-4 rounded-xl">
            <h3 className="font-medium text-tg-text mb-2">ዝርዝር / Description</h3>
            <p className="text-tg-text whitespace-pre-wrap">{listing.description}</p>
          </div>
        )}

        {/* Seller Info */}
        {listing.seller && (
          <div className="bg-tg-secondary-bg p-4 rounded-xl">
            <h3 className="font-medium text-tg-text mb-3">ሻጭ / Seller</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-tg-button rounded-full flex items-center justify-center text-tg-button-text font-bold">
                {listing.seller.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-tg-text">{listing.seller.name}</span>
                  {listing.seller.is_verified && (
                    <Verified className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <p className="text-sm text-tg-hint">
                  ከ{listing.seller.member_since} ጀምሮ • {listing.seller.total_sales} ሽያጮች
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Report */}
        <button className="flex items-center gap-2 text-sm text-tg-hint">
          <Flag className="w-4 h-4" />
          <span>ሪፖርት አድርግ / Report</span>
        </button>
      </div>

      {/* Bottom Action Bar */}
      {!isOwner && listing.seller && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-tg-bg border-t border-tg-secondary-bg">
          <div className="flex gap-3">
            <button
              onClick={handleCall}
              className="flex-1 py-3 bg-tg-secondary-bg text-tg-text rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              ደውል
            </button>
            <button
              onClick={handleContact}
              className="flex-[2] py-3 bg-tg-button text-tg-button-text rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              መልእክት ላክ / Chat
            </button>
          </div>
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-tg-bg border-t border-tg-secondary-bg">
          {listing.status === 'sold' ? (
            <div className="py-3 bg-green-500/20 text-green-600 rounded-xl font-medium text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              ተሸጧል / Sold
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => alert('Coming soon: Edit listing')}
                className="flex-1 py-3 bg-tg-secondary-bg text-tg-text rounded-xl font-medium"
              >
                ✏️ አስተካክል
              </button>
              <button
                onClick={handleMarkAsSold}
                disabled={marking}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {marking ? (
                  <>🔄 Processing...</>
                ) : (
                  <>✅ ተሸጧል / Sold</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
