import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Send, Verified, ExternalLink } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { chatsApi, type ChatDetail, type ChatMessage } from '@/lib/api';

interface ChatRoomPageProps {
  chatId: string;
  onBack: () => void;
  onOpenListing: (listingId: string) => void;
}

export default function ChatRoomPage({ chatId, onBack, onOpenListing }: ChatRoomPageProps) {
  const { haptic } = useTelegram();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChat();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChat = async () => {
    setLoading(true);
    try {
      const data = await chatsApi.get(chatId);
      setChat(data);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollMessages = async () => {
    if (!messages.length) return;
    
    try {
      const lastMessageTime = messages[messages.length - 1]?.created_at;
      const newMsgs = await chatsApi.getMessages(chatId, lastMessageTime);
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
        haptic.notification('success');
      }
    } catch (error) {
      console.error('Failed to poll messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    haptic.impact('light');
    setSending(true);
    setNewMessage('');

    try {
      const message = await chatsApi.sendMessage(chatId, text);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(text); // Restore on failure
      haptic.notification('error');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ET').format(price) + ' ብር';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-tg-button border-t-transparent" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-tg-bg p-6">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-tg-text font-medium">ውይይቱ አልተገኘም</p>
        <button onClick={onBack} className="mt-4 px-6 py-2 bg-tg-button text-tg-button-text rounded-xl">
          ተመለስ / Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-tg-bg">
      {/* Header */}
      <div className="flex-shrink-0 bg-tg-secondary-bg px-4 py-3 border-b border-tg-hint/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium text-tg-text truncate">
                {chat.other_user_name}
              </span>
              {chat.other_user_verified && (
                <Verified className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <p className="text-xs text-tg-hint">
              {chat.is_seller ? 'ገዢ / Buyer' : 'ሻጭ / Seller'}
            </p>
          </div>
        </div>
      </div>

      {/* Listing Info Bar */}
      <button
        onClick={() => onOpenListing(chat.listing_id)}
        className="flex-shrink-0 flex items-center gap-3 p-3 bg-tg-bg border-b border-tg-secondary-bg hover:bg-tg-secondary-bg/50"
      >
        {chat.listing_image ? (
          <img
            src={chat.listing_image}
            alt={chat.listing_title}
            className="w-12 h-12 object-cover rounded-lg"
          />
        ) : (
          <div className="w-12 h-12 bg-tg-secondary-bg rounded-lg flex items-center justify-center text-xl">
            📦
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm text-tg-text truncate">{chat.listing_title}</p>
          <p className="text-sm font-bold text-tg-button">{formatPrice(chat.listing_price)}</p>
        </div>
        <ExternalLink className="w-5 h-5 text-tg-hint" />
      </button>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-tg-hint text-sm">ውይይት ይጀምሩ!</p>
            <p className="text-tg-hint text-xs mt-1">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.is_mine
                    ? 'bg-tg-button text-tg-button-text rounded-br-md'
                    : 'bg-tg-secondary-bg text-tg-text rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.is_mine ? 'text-tg-button-text/70' : 'text-tg-hint'}`}>
                  {formatTime(msg.created_at)}
                  {msg.is_mine && (
                    <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 bg-tg-secondary-bg border-t border-tg-hint/10">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="መልእክት ይጻፉ..."
            className="flex-1 px-4 py-3 bg-tg-bg rounded-full text-tg-text placeholder:text-tg-hint focus:outline-none"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-12 h-12 bg-tg-button rounded-full flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-tg-button-text" />
          </button>
        </div>
      </div>
    </div>
  );
}
