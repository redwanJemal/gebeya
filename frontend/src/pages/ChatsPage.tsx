import { useEffect, useState } from 'react';
import { MessageCircle, Verified, ChevronRight } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { chatsApi, type ChatListItem } from '@/lib/api';

interface ChatsPageProps {
  onOpenChat: (chatId: string) => void;
}

export default function ChatsPage({ onOpenChat }: ChatsPageProps) {
  const { haptic } = useTelegram();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadChats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadChats = async () => {
    try {
      const data = await chatsApi.list();
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'ትናንት';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('am-ET', { weekday: 'short' });
    }
    return date.toLocaleDateString('am-ET');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET').format(price) + ' ብር';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-tg-button border-t-transparent" />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <MessageCircle className="w-16 h-16 text-tg-hint mb-4" />
        <p className="text-tg-text font-medium text-lg">ምንም መልእክት የለም</p>
        <p className="text-tg-hint text-sm mt-1">No messages yet</p>
        <p className="text-tg-hint text-xs mt-4 text-center">
          ዕቃ ላይ ጠቅ ብለው "መልእክት ላክ" ሲሉ ውይይት ይጀምራሉ
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg px-4 py-3 border-b border-tg-secondary-bg">
        <h1 className="text-lg font-bold text-tg-text">💬 መልእክቶች / Messages</h1>
      </div>

      {/* Chat List */}
      <div className="divide-y divide-tg-secondary-bg">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              haptic.selection();
              onOpenChat(chat.id);
            }}
            className="w-full flex items-center gap-3 p-4 hover:bg-tg-secondary-bg/50 active:bg-tg-secondary-bg transition-colors text-left"
          >
            {/* Listing Image */}
            <div className="relative w-14 h-14 flex-shrink-0">
              {chat.listing_image ? (
                <img
                  src={chat.listing_image}
                  alt={chat.listing_title}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-tg-secondary-bg rounded-xl flex items-center justify-center text-2xl">
                  📦
                </div>
              )}
              {chat.unread_count > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {chat.unread_count > 9 ? '9+' : chat.unread_count}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-tg-text truncate">
                    {chat.other_user_name}
                  </span>
                  {chat.other_user_verified && (
                    <Verified className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <span className="text-xs text-tg-hint flex-shrink-0">
                  {formatTime(chat.last_message_at)}
                </span>
              </div>
              
              <p className="text-sm text-tg-text truncate mt-0.5">
                {chat.listing_title}
              </p>
              
              <div className="flex items-center justify-between mt-1">
                <p className={`text-sm truncate ${chat.unread_count > 0 ? 'text-tg-text font-medium' : 'text-tg-hint'}`}>
                  {chat.last_message || 'ውይይት ጀምር...'}
                </p>
                <span className="text-xs text-tg-button flex-shrink-0 ml-2">
                  {formatPrice(chat.listing_price)}
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-tg-hint flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
