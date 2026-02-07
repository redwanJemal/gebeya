import { useEffect, useState } from 'react';
import { Search, Plus, Heart, MapPin, Verified, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi, listingsApi, demoApi, type Category, type Listing } from '@/lib/api';
import { ListingGridSkeleton, CategorySkeleton } from '@/components/Skeleton';

const CONDITIONS = [
  { value: '', label: 'ሁሉም' },
  { value: 'new', label: 'አዲስ' },
  { value: 'like_new', label: 'እንደ አዲስ' },
  { value: 'used', label: 'ጥቅም ላይ የዋለ' },
];

const PRICE_RANGES = [
  { value: '', label: 'ሁሉም ዋጋ', min: undefined, max: undefined },
  { value: 'under5k', label: '< 5,000', min: undefined, max: 5000 },
  { value: '5k-20k', label: '5,000 - 20,000', min: 5000, max: 20000 },
  { value: '20k-50k', label: '20,000 - 50,000', min: 20000, max: 50000 },
  { value: '50k-100k', label: '50,000 - 100,000', min: 50000, max: 100000 },
  { value: 'over100k', label: '> 100,000', min: 100000, max: undefined },
];

interface HomePageProps {
  onOpenListing?: (listingId: string) => void;
}

export default function HomePage({ onOpenListing }: HomePageProps) {
  const { haptic } = useTelegram();
  const { user, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [customMinPrice, setCustomMinPrice] = useState('');
  const [customMaxPrice, setCustomMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch data on mount + auto-seed if admin
  useEffect(() => {
    const init = async () => {
      await loadData();
      
      // Auto-seed for admin if no listings
      if (user?.is_admin && listings.length === 0) {
        try {
          const result = await demoApi.autoSeed();
          if (result.seeded) {
            console.log('Auto-seeded demo listings:', result.count);
            await loadData(); // Reload
          }
        } catch (e) {
          console.log('Auto-seed skipped');
        }
      }
    };
    init();
  }, [user?.is_admin]);

  // Refetch when filters change
  useEffect(() => {
    setPage(1);
    loadListings(true);
  }, [selectedCategory, searchQuery, selectedCondition, selectedPriceRange, customMinPrice, customMaxPrice]);

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

  const loadListings = async (reset = false) => {
    const currentPage = reset ? 1 : page;
    const priceRange = PRICE_RANGES.find((r) => r.value === selectedPriceRange);
    
    // Use custom prices if set, otherwise use preset range
    const minPrice = customMinPrice ? parseFloat(customMinPrice) : priceRange?.min;
    const maxPrice = customMaxPrice ? parseFloat(customMaxPrice) : priceRange?.max;
    
    try {
      const result = await listingsApi.list({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        condition: selectedCondition || undefined,
        min_price: minPrice,
        max_price: maxPrice,
        page: currentPage,
        per_page: 12,
      });
      
      if (reset) {
        setListings(result.items);
      } else {
        setListings((prev) => [...prev, ...result.items]);
      }
      setHasMore(result.has_more);
    } catch (error) {
      console.error('Failed to load listings:', error);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    const priceRange = PRICE_RANGES.find((r) => r.value === selectedPriceRange);
    const minPrice = customMinPrice ? parseFloat(customMinPrice) : priceRange?.min;
    const maxPrice = customMaxPrice ? parseFloat(customMaxPrice) : priceRange?.max;
    
    try {
      const result = await listingsApi.list({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        condition: selectedCondition || undefined,
        min_price: minPrice,
        max_price: maxPrice,
        page: nextPage,
        per_page: 12,
      });
      
      setListings((prev) => [...prev, ...result.items]);
      setHasMore(result.has_more);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    haptic.impact('light');
    setPage(1);
    await loadData();
    setRefreshing(false);
  };

  const activeFiltersCount = 
    (selectedCondition ? 1 : 0) + 
    (selectedPriceRange ? 1 : 0) +
    (customMinPrice || customMaxPrice ? 1 : 0);

  const clearFilters = () => {
    haptic.selection();
    setSelectedCondition('');
    setSelectedPriceRange('');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setShowFilters(false);
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
      <div className="min-h-screen pb-24">
        {/* Header skeleton */}
        <div className="sticky top-0 z-10 bg-tg-bg px-4 py-3 border-b border-tg-secondary-bg">
          <div className="h-10 bg-tg-secondary-bg rounded-xl animate-pulse" />
          <div className="h-4 w-32 bg-tg-secondary-bg rounded mt-2 animate-pulse" />
        </div>
        
        {/* Categories skeleton */}
        <div className="py-3">
          <CategorySkeleton />
        </div>
        
        {/* Listings skeleton */}
        <div className="px-4">
          <ListingGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg px-4 py-3 border-b border-tg-secondary-bg">
        <div className="flex items-center gap-2">
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
            onClick={() => {
              haptic.selection();
              setShowFilters(true);
            }}
            className={`p-2.5 rounded-xl relative ${
              activeFiltersCount > 0 ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg'
            }`}
          >
            <SlidersHorizontal className={`w-5 h-5 ${activeFiltersCount > 0 ? '' : 'text-tg-hint'}`} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
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

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-tg-bg w-full max-w-lg rounded-t-2xl p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-tg-text">ማጣሪያዎች / Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 text-tg-hint"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Condition Filter */}
            <div className="mb-4">
              <label className="text-sm font-medium text-tg-text mb-2 block">
                ሁኔታ / Condition
              </label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((cond) => (
                  <button
                    key={cond.value}
                    onClick={() => {
                      haptic.selection();
                      setSelectedCondition(cond.value);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCondition === cond.value
                        ? 'bg-tg-button text-tg-button-text'
                        : 'bg-tg-secondary-bg text-tg-text'
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="mb-4">
              <label className="text-sm font-medium text-tg-text mb-2 block">
                ዋጋ / Price Range
              </label>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      haptic.selection();
                      setSelectedPriceRange(range.value);
                      // Clear custom prices when selecting preset
                      setCustomMinPrice('');
                      setCustomMaxPrice('');
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedPriceRange === range.value && !customMinPrice && !customMaxPrice
                        ? 'bg-tg-button text-tg-button-text'
                        : 'bg-tg-secondary-bg text-tg-text'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Price Range */}
            <div className="mb-6">
              <label className="text-sm font-medium text-tg-text mb-2 block">
                ብጁ ዋጋ / Custom Price (ETB)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={customMinPrice}
                    onChange={(e) => {
                      setCustomMinPrice(e.target.value);
                      setSelectedPriceRange(''); // Clear preset when using custom
                    }}
                    className="w-full px-4 py-2.5 bg-tg-secondary-bg rounded-xl text-tg-text placeholder:text-tg-hint focus:outline-none focus:ring-2 focus:ring-tg-button"
                  />
                </div>
                <span className="text-tg-hint">-</span>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Max"
                    value={customMaxPrice}
                    onChange={(e) => {
                      setCustomMaxPrice(e.target.value);
                      setSelectedPriceRange(''); // Clear preset when using custom
                    }}
                    className="w-full px-4 py-2.5 bg-tg-secondary-bg rounded-xl text-tg-text placeholder:text-tg-hint focus:outline-none focus:ring-2 focus:ring-tg-button"
                  />
                </div>
              </div>
              {(customMinPrice || customMaxPrice) && (
                <p className="text-xs text-tg-hint mt-2">
                  {customMinPrice || '0'} - {customMaxPrice || '∞'} ብር
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 bg-tg-secondary-bg text-tg-text rounded-xl font-medium"
                >
                  አጽዳ / Clear
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 bg-tg-button text-tg-button-text rounded-xl font-medium"
              >
                ተግብር / Apply
              </button>
            </div>
          </div>
        </div>
      )}

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
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  formatPrice={formatPrice} 
                  getTimeAgo={getTimeAgo}
                  onOpen={() => onOpenListing?.(listing.id)}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-tg-secondary-bg text-tg-text rounded-xl font-medium disabled:opacity-50"
                >
                  {loadingMore ? '🔄 እየጫነ...' : '⬇️ ተጨማሪ ጫን / Load More'}
                </button>
              </div>
            )}
          </>
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
  onOpen: () => void;
}

function ListingCard({ listing, formatPrice, getTimeAgo, onOpen }: ListingCardProps) {
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

function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-5xl mb-4">📦</p>
      <p className="text-tg-text text-lg font-medium">ምንም ዕቃ አልተገኘም</p>
      <p className="text-tg-hint text-sm mt-1">No listings yet</p>
      <p className="text-tg-hint text-xs mt-4">
        ዕቃ ለመሸጥ "ሽያጭ" ትርን ይጫኑ
      </p>
    </div>
  );
}
