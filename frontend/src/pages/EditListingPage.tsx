import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, X, Upload, Loader2 } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { categoriesApi, listingsApi, type Category } from '@/lib/api';

interface EditListingPageProps {
  listingId: string;
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

export default function EditListingPage({ listingId, onBack, onSuccess }: EditListingPageProps) {
  const { haptic } = useTelegram();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState('used');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [area, setArea] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [listingId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listing, cats] = await Promise.all([
        listingsApi.get(listingId),
        categoriesApi.list(),
      ]);
      
      setCategories(cats);
      
      // Populate form
      setTitle(listing.title);
      setDescription(listing.description || '');
      setPrice(listing.price.toString());
      setCategoryId(listing.category_id);
      setCondition(listing.condition);
      setIsNegotiable(listing.is_negotiable);
      setArea(listing.area || '');
      setImages(listing.images || []);
    } catch (error) {
      console.error('Failed to load listing:', error);
      alert('Failed to load listing');
      onBack();
    } finally {
      setLoading(false);
    }
  };

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
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
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

    haptic.impact('medium');
    setSaving(true);

    try {
      await listingsApi.update(listingId, {
        title: title.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        condition: condition as any,
        is_negotiable: isNegotiable,
        area: area || undefined,
        images: images,
      });
      
      haptic.notification('success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update listing:', error);
      haptic.notification('error');
      alert(error.message || 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-tg-button" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-tg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-tg-bg border-b border-tg-secondary-bg px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">ዕቃ ያስተካክሉ / Edit Item</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ፎቶዎች / Photos
          </label>
          
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
              <button
                onClick={handleImageUpload}
                className="flex-shrink-0 w-24 h-24 bg-tg-secondary-bg rounded-xl flex flex-col items-center justify-center text-tg-hint border-2 border-dashed border-tg-hint/30"
              >
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">ፋይል</span>
              </button>
            )}
          </div>
          <p className="text-xs text-tg-hint mt-1">እስከ 8 ፎቶዎች / Up to 8 photos</p>
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

        {/* Category (read-only) */}
        <div>
          <label className="block text-sm font-medium text-tg-text mb-2">
            ምድብ / Category
          </label>
          <select
            value={categoryId}
            disabled
            className="w-full px-4 py-3 bg-tg-secondary-bg rounded-xl text-tg-hint focus:outline-none opacity-60"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name_am}
              </option>
            ))}
          </select>
          <p className="text-xs text-tg-hint mt-1">ምድብ መቀየር አይቻልም</p>
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

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 bg-tg-button text-tg-button-text rounded-xl font-bold text-lg disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              እየተቀመጠ...
            </>
          ) : (
            <>💾 አስቀምጥ / Save</>
          )}
        </button>
      </div>
    </div>
  );
}
