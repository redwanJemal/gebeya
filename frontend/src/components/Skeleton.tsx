/**
 * Skeleton loading components for smooth UX
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-tg-secondary-bg rounded ${className}`}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden">
      {/* Image */}
      <Skeleton className="aspect-square w-full" />
      
      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Price */}
        <Skeleton className="h-5 w-24" />
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        {/* Location */}
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-tg-secondary-bg rounded-xl">
      {/* Avatar */}
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <ChatListItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-tg-bg animate-pulse">
      {/* Image */}
      <Skeleton className="aspect-square w-full" />
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Price & Title */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-5 w-full" />
        </div>
        
        {/* Stats */}
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        
        {/* Condition */}
        <Skeleton className="h-8 w-24 rounded-full" />
        
        {/* Description */}
        <div className="bg-tg-secondary-bg p-4 rounded-xl space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Seller */}
        <div className="bg-tg-secondary-bg p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Avatar & Name */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-tg-secondary-bg p-4 rounded-xl text-center space-y-2">
            <Skeleton className="h-6 w-12 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Menu Items */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
