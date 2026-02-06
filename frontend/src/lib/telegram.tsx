/**
 * Telegram Mini App SDK Integration
 * 
 * Provides context and hooks for interacting with Telegram.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Types
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

interface BackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

interface WebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    query_id?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: BackButton;
  MainButton: MainButton;
  HapticFeedback: HapticFeedback;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ type?: string; text: string; id?: string }> }, callback?: (id: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  requestContact?: (callback: (sent: boolean) => void) => void;
  requestWriteAccess?: (callback: (granted: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

// Context
interface TelegramContextType {
  webApp: WebApp | null;
  user: TelegramUser | null;
  initData: string;
  isReady: boolean;
  isInTelegram: boolean;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  haptic: {
    impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notification: (type?: 'error' | 'success' | 'warning') => void;
    selection: () => void;
  };
  backButton: BackButton | null;
  mainButton: MainButton | null;
  expand: () => void;
  close: () => void;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

// Provider
export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp ?? null : null;
  const isInTelegram = !!webApp?.initData;

  useEffect(() => {
    if (webApp) {
      // Tell Telegram we're ready
      webApp.ready();

      // Expand to full height
      webApp.expand();

      // Enable closing confirmation
      webApp.enableClosingConfirmation();

      // Apply theme colors as CSS variables
      if (webApp.themeParams) {
        const root = document.documentElement;
        Object.entries(webApp.themeParams).forEach(([key, value]) => {
          if (value) {
            root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
          }
        });
      }

      setIsReady(true);
    } else {
      // Not in Telegram - still ready for development
      setIsReady(true);
    }
  }, [webApp]);

  // Haptic feedback helpers
  const haptic = {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      webApp?.HapticFeedback?.impactOccurred(style);
    },
    notification: (type: 'error' | 'success' | 'warning' = 'success') => {
      webApp?.HapticFeedback?.notificationOccurred(type);
    },
    selection: () => {
      webApp?.HapticFeedback?.selectionChanged();
    },
  };

  // Alert/Confirm helpers
  const showAlert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showAlert(message, resolve);
      } else {
        alert(message);
        resolve();
      }
    });
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showConfirm(message, resolve);
      } else {
        resolve(confirm(message));
      }
    });
  };

  const value: TelegramContextType = {
    webApp,
    user: webApp?.initDataUnsafe?.user || null,
    initData: webApp?.initData || '',
    isReady,
    isInTelegram,
    colorScheme: webApp?.colorScheme || 'light',
    themeParams: webApp?.themeParams || {},
    haptic,
    backButton: webApp?.BackButton || null,
    mainButton: webApp?.MainButton || null,
    expand: () => webApp?.expand(),
    close: () => webApp?.close(),
    showAlert,
    showConfirm,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

// Hook
export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}

// Utility hook for back button
export function useBackButton(callback?: () => void) {
  const { backButton } = useTelegram();

  useEffect(() => {
    if (!backButton || !callback) return;

    backButton.show();
    backButton.onClick(callback);

    return () => {
      backButton.offClick(callback);
      backButton.hide();
    };
  }, [backButton, callback]);
}

// Utility hook for main button
export function useMainButton(
  text: string,
  onClick: () => void,
  options?: { disabled?: boolean; loading?: boolean }
) {
  const { mainButton } = useTelegram();

  useEffect(() => {
    if (!mainButton) return;

    mainButton.setText(text);
    mainButton.onClick(onClick);
    mainButton.show();

    if (options?.disabled) {
      mainButton.disable();
    } else {
      mainButton.enable();
    }

    if (options?.loading) {
      mainButton.showProgress();
    } else {
      mainButton.hideProgress();
    }

    return () => {
      mainButton.offClick(onClick);
      mainButton.hide();
    };
  }, [mainButton, text, onClick, options?.disabled, options?.loading]);
}
