import { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { usersApi } from '@/lib/api';

interface PasscodeLockProps {
  onUnlock: () => void;
  onReset?: () => void;
}

export function PasscodeLock({ onUnlock, onReset }: PasscodeLockProps) {
  const { haptic, webApp } = useTelegram();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleDigit = (digit: string) => {
    if (passcode.length >= 4) return;
    haptic.impact('light');
    setError(false);
    setPasscode((prev) => prev + digit);
  };

  const handleDelete = () => {
    haptic.impact('light');
    setPasscode((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (passcode.length !== 4) return;
    
    setLoading(true);
    try {
      await usersApi.verifyPasscode(passcode);
      haptic.notification('success');
      setAttempts(0);
      onUnlock();
    } catch (e) {
      haptic.notification('error');
      setError(true);
      setPasscode('');
      setAttempts((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (passcode.length === 4) {
      const timer = setTimeout(handleSubmit, 300);
      return () => clearTimeout(timer);
    }
  }, [passcode]);

  const handleResetRequest = () => {
    haptic.impact('medium');
    if (onReset) {
      onReset();
    } else {
      // Close app and ask user to contact bot to reset
      webApp?.showPopup({
        title: 'ኮድ ዳግም አስጀምር',
        message: 'ኮድዎን ዳግም ለማስጀመር ቦትን ያነጋግሩ\n\nContact the bot to reset your passcode.',
        buttons: [
          { type: 'close', text: 'ዝጋ / Close' },
        ],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-tg-bg flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-tg-button/20 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-tg-button" />
      </div>

      <h1 className="text-xl font-bold text-tg-text mb-2">ገበያ ተቆልፏል</h1>
      <p className="text-tg-hint text-sm mb-8">Enter your 4-digit passcode</p>

      {/* Dots - only 4 */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < passcode.length
                ? error
                  ? 'bg-red-500'
                  : 'bg-tg-button'
                : 'bg-tg-secondary-bg'
            } ${error && i < passcode.length ? 'animate-shake' : ''}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4">ትክክል ያልሆነ ኮድ / Wrong passcode</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'del') handleDelete();
              else if (key) handleDigit(key);
            }}
            disabled={loading || key === ''}
            className={`w-20 h-20 rounded-full text-2xl font-medium transition-all ${
              key === ''
                ? 'invisible'
                : key === 'del'
                ? 'bg-tg-secondary-bg text-tg-text'
                : 'bg-tg-secondary-bg text-tg-text active:bg-tg-button active:text-tg-button-text'
            } disabled:opacity-50`}
          >
            {key === 'del' ? <Delete className="w-6 h-6 mx-auto" /> : key}
          </button>
        ))}
      </div>

      {/* Reset passcode link - show after 2 failed attempts */}
      {attempts >= 2 && (
        <button
          onClick={handleResetRequest}
          className="mt-6 text-tg-link text-sm"
        >
          ኮድ ረስቻለሁ / Forgot passcode?
        </button>
      )}
    </div>
  );
}

// Settings component for setting/changing passcode
interface PasscodeSettingsProps {
  hasPasscode: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasscodeSettings({ hasPasscode, onClose, onSuccess }: PasscodeSettingsProps) {
  const { haptic } = useTelegram();
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Start at 'new' if no passcode exists
  useEffect(() => {
    if (!hasPasscode) setStep('new');
  }, [hasPasscode]);

  const currentInput = 
    step === 'current' ? currentPasscode :
    step === 'new' ? newPasscode : confirmPasscode;

  const setCurrentInput = 
    step === 'current' ? setCurrentPasscode :
    step === 'new' ? setNewPasscode : setConfirmPasscode;

  const handleDigit = (digit: string) => {
    if (currentInput.length >= 4) return;
    haptic.impact('light');
    setError('');
    setCurrentInput((prev) => prev + digit);
  };

  const handleDelete = () => {
    haptic.impact('light');
    setCurrentInput((prev) => prev.slice(0, -1));
  };

  const handleNext = async () => {
    if (currentInput.length !== 4) return;

    if (step === 'current') {
      // Verify current passcode
      setLoading(true);
      try {
        await usersApi.verifyPasscode(currentInput);
        setStep('new');
      } catch (e) {
        setError('ትክክል ያልሆነ ኮድ');
        setCurrentPasscode('');
      } finally {
        setLoading(false);
      }
    } else if (step === 'new') {
      setStep('confirm');
    } else {
      // Confirm step
      if (newPasscode !== confirmPasscode) {
        setError('ኮዶች አይመሳሰሉም');
        setConfirmPasscode('');
        return;
      }
      
      // Set new passcode
      setLoading(true);
      try {
        await usersApi.setPasscode(newPasscode);
        haptic.notification('success');
        onSuccess();
      } catch (e) {
        setError('ስህተት ተፈጥሯል');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemove = async () => {
    if (currentInput.length !== 4) return;
    
    setLoading(true);
    try {
      await usersApi.removePasscode(currentInput);
      haptic.notification('success');
      onSuccess();
    } catch (e) {
      setError('ትክክል ያልሆነ ኮድ');
      setCurrentPasscode('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance when 4 digits entered
  useEffect(() => {
    if (currentInput.length === 4 && !error) {
      const timer = setTimeout(handleNext, 300);
      return () => clearTimeout(timer);
    }
  }, [currentInput]);

  const title = 
    step === 'current' ? 'የአሁኑ ኮድ / Current' :
    step === 'new' ? 'አዲስ ኮድ / New' : 'ያረጋግጡ / Confirm';

  return (
    <div className="fixed inset-0 z-50 bg-tg-bg flex flex-col items-center justify-center p-6">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-tg-hint"
      >
        ✕
      </button>

      <h1 className="text-xl font-bold text-tg-text mb-2">🔒 {title}</h1>
      <p className="text-tg-hint text-sm mb-8">
        {step === 'current' && 'Enter current 4-digit passcode'}
        {step === 'new' && 'Enter new 4-digit code'}
        {step === 'confirm' && 'Enter code again to confirm'}
      </p>

      {/* Dots - only 4 */}
      <div className="flex gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < currentInput.length ? 'bg-tg-button' : 'bg-tg-secondary-bg'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'del') handleDelete();
              else if (key) handleDigit(key);
            }}
            disabled={loading || key === ''}
            className={`w-16 h-16 rounded-full text-xl font-medium transition-all ${
              key === ''
                ? 'invisible'
                : key === 'del'
                ? 'bg-tg-secondary-bg text-tg-text'
                : 'bg-tg-secondary-bg text-tg-text active:bg-tg-button active:text-tg-button-text'
            } disabled:opacity-50`}
          >
            {key === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : key}
          </button>
        ))}
      </div>

      {/* Remove passcode option */}
      {hasPasscode && step === 'current' && (
        <button
          onClick={handleRemove}
          disabled={loading || currentInput.length !== 4}
          className="mt-6 text-red-500 text-sm disabled:opacity-50"
        >
          ኮድ አስወግድ / Remove Passcode
        </button>
      )}
    </div>
  );
}
