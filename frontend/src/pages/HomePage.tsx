import { useEffect, useState } from 'react';
import { Search, Plus, Heart, MapPin, Verified, RefreshCw } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi, listingsApi, demoApi, type Category, type Listing } from '@/lib/api';

export default function HomePage() {
  const { haptic } = useTelegram();
  const { user, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Refetch when category changes
  useEffect(() => {
    loadListings();
  }, [selectedCategory, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, list] = await Promise.all([
        categoriesApi.list(),
        listingsApi.list({ per_page: 20 }),
      ]);
      setCategories(cats);
      setListings(list.items);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    try {
      const result = await listingsApi.list({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        per_page: 20,
      });
      setListings(result.items);
    } catch (error) {
      console.error('Failed to load listings:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    haptic.impact('light');
    await loadData();
    setRefreshing(false);
  };

  const handleCategorySelect = (categoryId: string | null) => {
    haptic.selection();
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
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

    if (diffMins < 60) return `${diffMins} ደቂቃ`;
    if (diffHours < 24) return `${diffHours} ሰዓት`;
    if (diffDays < 7) return `${diffDays} ቀን`;
    return date.toLocaleDateString('am-ET');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-tg-button border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg px-4 py-3 border-b border-tg-secondary-bg">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-hint" />
            <input
              type="text"
              placeholder="ይፈልጉ... / Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-tg-secondary-bg rounded-xl text-tg-text placeholder:text-tg-hint focus:outline-none focus:ring-2 focus:ring-tg-button"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-tg-secondary-bg rounded-xl"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 text-tg-hint ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-1 mt-2 text-sm text-tg-hint">
          <MapPin className="w-4 h-4" />
          <span>{user?.city || 'አዲስ አበባ'}</span>
          {user?.area && <span>• {user.area}</span>}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleCategorySelect(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-tg-secondary-bg text-tg-text'
            }`}
          >
            ሁሉም
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-secondary-bg text-tg-text'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name_am}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="px-4">
        {listings.length === 0 ? (
          <EmptyState onSeedDemo={async () => {
            haptic.impact('medium');
            try {
              await demoApi.seedListings();
              await loadData();
            } catch (e) {
              console.error('Failed to seed:', e);
            }
          }} isAuthenticated={isAuthenticated} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} formatPrice={formatPrice} getTimeAgo={getTimeAgo} />
            ))}
          </div>
        )}
      </div>

      {/* FAB - Post Listing */}
      {isAuthenticated && (
        <button
          onClick={() => {
            haptic.impact('medium');
            // TODO: Navigate to create listing
            alert('Coming soon: Post a listing');
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-tg-button text-tg-button-text rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}

interface ListingCardProps {
  listing: Listing;
  formatPrice: (price: number) => string;
  getTimeAgo: (date: string) => string;
}

function ListingCard({ listing, formatPrice, getTimeAgo }: ListingCardProps) {
  const { haptic } = useTelegram();
  const [isFavorited, setIsFavorited] = useState(listing.is_favorited || false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.impact('light');
    
    try {
      const result = await listingsApi.toggleFavorite(listing.id);
      setIsFavorited(result.favorited);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleClick = () => {
    haptic.selection();
    // TODO: Navigate to listing detail
    alert(`View listing: ${listing.title}`);
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
        
        {/* Featured Badge */}
        {listing.is_featured && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
            ⭐ Featured
          </div>
        )}
        
        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center"
        >
          <Heart
            className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`}
          />
        </button>
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
          <span>{getTimeAgo(listing.created_at)}</span>
        </div>

        {/* Seller Info */}
        {listing.seller && (
          <div className="flex items-center gap-1 mt-2 text-xs text-tg-hint">
            <span className="truncate">{listing.seller.name}</span>
            {listing.seller.is_verified && (
              <Verified className="w-3 h-3 text-blue-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onSeedDemo: () => Promise<void>;
  isAuthenticated: boolean;
}

function EmptyState({ onSeedDemo, isAuthenticated }: EmptyStateProps) {
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    await onSeedDemo();
    setSeeding(false);
  };

  return (
    <div className="text-center py-12">
      <p className="text-5xl mb-4">📦</p>
      <p className="text-tg-text text-lg font-medium">ምንም ዕቃ አልተገኘም</p>
      <p className="text-tg-hint text-sm mt-1">No listings yet</p>
      
      {isAuthenticated && (
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="mt-6 px-6 py-3 bg-tg-button text-tg-button-text rounded-xl font-medium disabled:opacity-50"
        >
          {seeding ? '🔄 Loading...' : '✨ Add Demo Listings'}
        </button>
      )}
    </div>
  );
}
