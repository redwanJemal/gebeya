import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Package, Eye, Heart, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { listingsApi, type Listing } from '@/lib/api';
import { ListingGridSkeleton } from '@/components/Skeleton';

interface MyListingsPageProps {
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
  onEditListing: (listingId: string) => void;
  onCreateListing: () => void;
}

type FilterType = 'all' | 'active' | 'sold';

export default function MyListingsPage({ 
  onBack, 
  onOpenListing, 
  onEditListing,
  onCreateListing 
}: MyListingsPageProps) {
  const { haptic } = useTelegram();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await listingsApi.my();
      setListings(data);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    haptic.impact('medium');
    if (!confirm('እርግጠኛ ነዎት? / Are you sure?')) return;
    
    try {
      await listingsApi.delete(listingId);
      setListings(listings.filter(l => l.id !== listingId));
      haptic.notification('success');
    } catch (error) {
      console.error('Failed to delete:', error);
      haptic.notification('error');
    }
    setMenuOpen(null);
  };

  const handleMarkSold = async (listingId: string) => {
    haptic.impact('medium');
    try {
      await listingsApi.markAsSold(listingId);
      setListings(listings.map(l => 
        l.id === listingId ? { ...l, status: 'sold' } : l
      ));
      haptic.notification('success');
    } catch (error) {
      console.error('Failed to mark sold:', error);
      haptic.notification('error');
    }
    setMenuOpen(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET').format(price) + ' ብር';
  };

  const filteredListings = listings.filter(l => {
    if (filter === 'active') return l.status === 'active';
    if (filter === 'sold') return l.status === 'sold';
    return true;
  });

  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    sold: listings.filter(l => l.status === 'sold').length,
  };

  return (
    <div className="min-h-screen pb-24 bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">📦 ዕቃዎቼ / My Listings</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <button
          onClick={() => { haptic.selection(); setFilter('all'); }}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === 'all' ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-text'
          }`}
        >
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-xs">ሁሉም</p>
        </button>
        <button
          onClick={() => { haptic.selection(); setFilter('active'); }}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === 'active' ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-text'
          }`}
        >
          <p className="text-xl font-bold">{stats.active}</p>
          <p className="text-xs">ንቁ</p>
        </button>
        <button
          onClick={() => { haptic.selection(); setFilter('sold'); }}
          className={`p-3 rounded-xl text-center transition-colors ${
            filter === 'sold' ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-text'
          }`}
        >
          <p className="text-xl font-bold">{stats.sold}</p>
          <p className="text-xs">ተሸጠ</p>
        </button>
      </div>

      {/* Content */}
      <div className="px-4">
        {loading ? (
          <ListingGridSkeleton count={4} />
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-tg-hint mx-auto mb-4" />
            <p className="text-tg-text font-medium">ምንም ዕቃ የለም</p>
            <p className="text-tg-hint text-sm mt-1">No listings yet</p>
            <button
              onClick={() => { haptic.impact('medium'); onCreateListing(); }}
              className="mt-4 px-6 py-2 bg-tg-button text-tg-button-text rounded-xl font-medium"
            >
              ➕ ዕቃ ጨምር
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-tg-secondary-bg rounded-xl overflow-hidden"
              >
                <div 
                  className="flex gap-3 p-3 cursor-pointer"
                  onClick={() => { haptic.selection(); onOpenListing(listing.id); }}
                >
                  {/* Image */}
                  <div className="w-20 h-20 flex-shrink-0 bg-tg-bg rounded-lg overflow-hidden">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-tg-text truncate">{formatPrice(listing.price)}</p>
                        <p className="text-sm text-tg-text truncate">{listing.title}</p>
                      </div>
                      
                      {/* Status badge */}
                      <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${
                        listing.status === 'sold' 
                          ? 'bg-green-500/20 text-green-600' 
                          : 'bg-blue-500/20 text-blue-600'
                      }`}>
                        {listing.status === 'sold' ? 'ተሸጠ' : 'ንቁ'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-tg-hint">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {listing.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {listing.favorites_count}
                      </span>
                    </div>
                  </div>

                  {/* Menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.selection();
                      setMenuOpen(menuOpen === listing.id ? null : listing.id);
                    }}
                    className="p-1 self-start"
                  >
                    <MoreVertical className="w-5 h-5 text-tg-hint" />
                  </button>
                </div>

                {/* Action menu */}
                {menuOpen === listing.id && (
                  <div className="border-t border-tg-bg p-2 flex gap-2">
                    <button
                      onClick={() => { haptic.selection(); onEditListing(listing.id); setMenuOpen(null); }}
                      className="flex-1 py-2 bg-tg-bg rounded-lg text-sm text-tg-text flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-4 h-4" />
                      አስተካክል
                    </button>
                    {listing.status === 'active' && (
                      <button
                        onClick={() => handleMarkSold(listing.id)}
                        className="flex-1 py-2 bg-green-500/20 rounded-lg text-sm text-green-600 flex items-center justify-center gap-1"
                      >
                        ✓ ተሸጠ
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="py-2 px-3 bg-red-500/20 rounded-lg text-sm text-red-500 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { haptic.impact('medium'); onCreateListing(); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-tg-button text-tg-button-text rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
