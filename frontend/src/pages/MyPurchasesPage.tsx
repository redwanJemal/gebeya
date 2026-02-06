import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';

interface MyPurchasesPageProps {
  onBack: () => void;
  onOpenListing?: (listingId: string) => void;
}

export default function MyPurchasesPage({ onBack }: MyPurchasesPageProps) {
  const { haptic } = useTelegram();

  const handleBack = () => {
    haptic.impact('light');
    onBack();
  };

  return (
    <div className="min-h-screen pb-24 bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">ግዢዎቼ / My Purchases</h1>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-20 h-20 bg-tg-secondary-bg rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-tg-hint" />
        </div>
        
        <h2 className="text-xl font-bold text-tg-text mb-2">ብዙም ሳይቆይ!</h2>
        <h3 className="text-lg text-tg-text mb-4">Coming Soon!</h3>
        
        <p className="text-tg-hint text-sm max-w-xs">
          የግዢ ታሪክዎን እዚህ ያያሉ። ይህ ባህሪ በቅርቡ ይጨመራል።
        </p>
        <p className="text-tg-hint text-xs mt-2">
          Your purchase history will appear here. This feature is coming soon.
        </p>
      </div>
    </div>
  );
}
