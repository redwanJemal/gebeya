import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, X, Upload } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi, listingsApi, type Category, type CreateListing } from '@/lib/api';

interface CreateListingPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CONDITIONS = [
  { value: 'new', label_am: 'አዲስ', label_en: 'New' },
  { value: 'like_new', label_am: 'እንደ አዲስ', label_en: 'Like New' },
  { value: 'used', label_am: 'ጥቅም ላይ የዋለ', label_en: 'Used' },
  { value: 'for_parts', label_am: 'ለመለዋወጫ', label_en: 'For Parts' },
];

const AREAS = [
  'Bole', 'Kazanchis', 'Piassa', 'Megenagna', 'CMC', 
  'Sarbet', 'Mexico', 'Gerji', '4 Kilo', '6 Kilo',
  'Arat Kilo', 'Sidist Kilo', 'Merkato', 'Lebu', 'Ayat',
  'Summit', 'Jemo', 'Kotebe', 'Yeka', 'Gulele',
];

export default function CreateListingPage({ onBack, onSuccess }: CreateListingPageProps) {
  const { haptic } = useTelegram();
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState('used');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [area, setArea] = useState('');

  useEffect(() => {
    categoriesApi.list().then(setCategories);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = 8 - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImages((prev) => [...prev, dataUrl]);
        haptic.impact('light');
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAddPlaceholder = () => {
    // Add a placeholder image for demo purposes
    const placeholders = [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400',
    ];
    
    if (images.length < 8) {
      const randomImg = placeholders[Math.floor(Math.random() * placeholders.length)];
      setImages([...images, randomImg]);
      haptic.impact('light');
    }
  };

  const removeImage = (index: number) => {
    haptic.impact('light');
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !price || !categoryId) {
      alert('እባክዎ ሁሉንም አስፈላጊ መስኮች ይሙሉ\nPlease fill all required fields');
      return;
    }

    if (!user?.is_phone_verified) {
      alert('ዕቃ ለመለጠፍ ስልክዎን ያረጋግጡ\nVerify your phone to post listings');
      return;
    }

    haptic.impact('medium');
    setLoading(true);

    try {
      const listing: CreateListing = {
        title: title.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        category_id: categoryId,
        condition: condition as any,
        is_negotiable: isNegotiable,
        city: 'Addis Ababa',
        area: area || undefined,
        images: images,
      };

      await listingsApi.create(listing);
      haptic.notification('success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create listing:', error);
      haptic.notification('error');
      alert(error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">ዕቃ ይለጥፉ / Post Item</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ፎቶዎች / Photos
          </label>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, index) => (
              <div key={index} className="relative flex-shrink-0 w-24 h-24">
                <img
                  src={img}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
            {images.length < 8 && (
              <>
                <button
                  onClick={handleImageUpload}
                  className="flex-shrink-0 w-24 h-24 bg-tg-secondary-bg rounded-xl flex flex-col items-center justify-center text-tg-hint border-2 border-dashed border-tg-hint/30"
                >
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">ፋይል</span>
                </button>
                <button
                  onClick={handleAddPlaceholder}
                  className="flex-shrink-0 w-24 h-24 bg-tg-secondary-bg rounded-xl flex flex-col items-center justify-center text-tg-hint"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs">Demo</span>
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-tg-hint mt-1">እስከ 8 ፎቶዎች / Up to 8 photos (tap ፋይል to upload)</p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ርዕስ / Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ምን እየሸጡ ነው?"
            className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-tg-text placeholder:text-tg-hint focus:outline-none focus:ring-2 focus:ring-tg-button"
            maxLength={200}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ምድብ / Category *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-button"
          >
            <option value="">ምድብ ይምረጡ...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name_am}
              </option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ዋጋ / Price (ETB) *
          </label>
          <div className="relative">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-tg-text placeholder:text-tg-hint focus:outline-none focus:ring-2 focus:ring-tg-button pr-16"
              min="0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tg-hint">
              ብር
            </span>
          </div>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={isNegotiable}
              onChange={(e) => setIsNegotiable(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-tg-hint">ዋጋ ይደራደራል / Negotiable</span>
          </label>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ሁኔታ / Condition
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((cond) => (
              <button
                key={cond.value}
                onClick={() => {
                  haptic.selection();
                  setCondition(cond.value);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  condition === cond.value
                    ? 'bg-tg-button text-tg-button-text'
                    : 'bg-tg-secondary-bg text-tg-text'
                }`}
              >
                {cond.label_am}
              </button>
            ))}
          </div>
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            አካባቢ / Area
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-button"
          >
            <option value="">አካባቢ ይምረጡ...</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ዝርዝር / Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ስለ ዕቃው ተጨማሪ መረጃ..."
            rows={4}
            className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-tg-text placeholder:text-tg-hint focus:outline-none focus:ring-2 focus:ring-tg-button resize-none"
          />
        </div>

        {/* Phone verification warning */}
        {!user?.is_phone_verified && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <p className="text-sm text-orange-500">
              ⚠️ ዕቃ ለመለጠፍ ስልክዎን ያረጋግጡ
            </p>
            <p className="text-xs text-tg-hint mt-1">
              Verify your phone number to post listings
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !user?.is_phone_verified}
          className="w-full py-4 bg-tg-button text-tg-button-text rounded-xl font-bold text-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? '🔄 እየተለጠፈ...' : '📤 ለጥፍ / Post'}
        </button>
      </div>
    </div>
  );
}
