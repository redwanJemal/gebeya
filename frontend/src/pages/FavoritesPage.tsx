import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MapPin } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { listingsApi, type Listing } from '@/lib/api';
import { ListingGridSkeleton } from '@/components/Skeleton';

interface FavoritesPageProps {
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
}

export default function FavoritesPage({ onBack, onOpenListing }: FavoritesPageProps) {
  const { haptic } = useTelegram();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await listingsApi.favorites();
      setListings(data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    haptic.impact('light');
    
    try {
      await listingsApi.toggleFavorite(listingId);
      setListings(listings.filter(l => l.id !== listingId));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET').format(price) + ' ብር';
  };

  return (
    <div className="min-h-screen pb-24 bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">❤️ የተወደዱ / Favorites</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <ListingGridSkeleton count={4} />
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-tg-hint mx-auto mb-4" />
            <p className="text-tg-text font-medium">ምንም የተወደደ የለም</p>
            <p className="text-tg-hint text-sm mt-1">No favorites yet</p>
            <p className="text-tg-hint text-xs mt-4">
              ዕቃ ላይ ❤️ ተጫኑ ለማስቀመጥ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                onClick={() => { haptic.selection(); onOpenListing(listing.id); }}
                className="bg-tg-secondary-bg rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* Image */}
                <div className="relative aspect-square bg-tg-bg">
                  {listing.images?.[0] ? (
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
                  
                  {/* Sold badge */}
                  {listing.status === 'sold' && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      ተሸጠ
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemoveFavorite(e, listing.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center"
                  >
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-bold text-tg-text truncate">{formatPrice(listing.price)}</p>
                  <p className="text-sm text-tg-text truncate mt-0.5">{listing.title}</p>
                  
                  <div className="flex items-center gap-1 mt-2 text-xs text-tg-hint">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{listing.area || listing.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
