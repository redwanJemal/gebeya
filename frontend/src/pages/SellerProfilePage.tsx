import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Star, Package, ShoppingBag, Verified, Crown } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { usersApi, type SellerProfileResponse, type SellerListingItem } from '@/lib/api';
import { ListingGridSkeleton } from '@/components/Skeleton';

interface SellerProfilePageProps {
  sellerId: string;
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
}

export default function SellerProfilePage({ sellerId, onBack, onOpenListing }: SellerProfilePageProps) {
  const { haptic } = useTelegram();
  const [data, setData] = useState<SellerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await usersApi.getSellerProfile(sellerId);
        setData(result);
      } catch (e: any) {
        setError(e.message || 'Failed to load seller profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [sellerId]);

  const handleBack = () => {
    haptic.impact('light');
    onBack();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET').format(price) + ' ብር';
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 bg-tg-bg">
        <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-1">
              <ArrowLeft className="w-6 h-6 text-tg-text" />
            </button>
            <div className="h-6 w-32 bg-tg-secondary-bg rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-tg-secondary-bg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-tg-secondary-bg rounded animate-pulse" />
              <div className="h-4 w-24 bg-tg-secondary-bg rounded animate-pulse" />
            </div>
          </div>
          <ListingGridSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen pb-24 bg-tg-bg">
        <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
          <button onClick={handleBack} className="flex items-center gap-2 text-tg-link">
            <ArrowLeft className="w-5 h-5" />
            <span>ተመለስ / Back</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center p-6 mt-20 text-center">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-tg-text text-lg">{error || 'Seller not found'}</p>
          <button onClick={handleBack} className="mt-4 px-6 py-2 bg-tg-button text-tg-button-text rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { seller, listings } = data;

  return (
    <div className="min-h-screen pb-24 bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">ሻጭ / Seller</h1>
        </div>
      </div>

      {/* Seller Profile Card */}
      <div className="bg-tg-secondary-bg mx-4 mt-4 rounded-xl p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            {seller.photo_url ? (
              <img
                src={seller.photo_url}
                alt={seller.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-tg-button flex items-center justify-center text-2xl text-tg-button-text font-bold">
                {seller.name[0]}
              </div>
            )}
            {seller.is_premium && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-tg-text">{seller.name}</h2>
              {seller.is_verified && (
                <Verified className="w-5 h-5 text-blue-500" />
              )}
            </div>
            {seller.username && (
              <p className="text-tg-hint">@{seller.username}</p>
            )}
            <div className="flex items-center gap-1 mt-1 text-sm text-tg-hint">
              <MapPin className="w-4 h-4" />
              <span>{seller.area || seller.city}</span>
            </div>
            <p className="text-xs text-tg-hint mt-1">
              Member since {seller.member_since}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-tg-hint/20">
          <div className="text-center">
            <p className="text-2xl font-bold text-tg-text flex items-center justify-center gap-1">
              <Star className="w-5 h-5 text-yellow-500" />
              {seller.rating > 0 ? seller.rating.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-tg-hint">ደረጃ</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-tg-text flex items-center justify-center gap-1">
              <Package className="w-5 h-5 text-tg-hint" />
              {seller.total_listings}
            </p>
            <p className="text-xs text-tg-hint">ዕቃዎች</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-tg-text flex items-center justify-center gap-1">
              <ShoppingBag className="w-5 h-5 text-green-500" />
              {seller.total_sales}
            </p>
            <p className="text-xs text-tg-hint">ሽያጮች</p>
          </div>
        </div>
      </div>

      {/* Listings Section */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-tg-text mb-3">
          ዕቃዎች / Listings ({listings.length})
        </h3>

        {listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-tg-hint">No active listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((listing) => (
              <SellerListingCard
                key={listing.id}
                listing={listing}
                formatPrice={formatPrice}
                onOpen={() => onOpenListing(listing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SellerListingCardProps {
  listing: SellerListingItem;
  formatPrice: (price: number) => string;
  onOpen: () => void;
}

function SellerListingCard({ listing, formatPrice, onOpen }: SellerListingCardProps) {
  const { haptic } = useTelegram();

  const handleClick = () => {
    haptic.selection();
    onOpen();
  };

  return (
    <div
      onClick={handleClick}
      className="bg-tg-secondary-bg rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Image */}
      <div className="relative aspect-square bg-tg-bg">
        {listing.images && listing.images.length > 0 ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            📦
          </div>
        )}
        
        {listing.is_featured && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
            ⭐ Featured
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-tg-text truncate">{formatPrice(listing.price)}</p>
        <p className="text-sm text-tg-text truncate mt-0.5">{listing.title}</p>
        
        <div className="flex items-center justify-between mt-2 text-xs text-tg-hint">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{listing.area || listing.city}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
