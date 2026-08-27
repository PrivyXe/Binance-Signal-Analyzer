import { UserSettings, DEFAULT_SETTINGS } from '../types/settings';

const STORAGE_KEY = 'binance_signal_analyzer_settings';

export class StorageService {
  /**
   * Load user settings with fallback to defaults
   */
  public static async getSettings(): Promise<UserSettings> {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY, 'settings'], (result) => {
        // Support legacy 'settings' key as migration fallback
        const saved = result[STORAGE_KEY] || result.settings;
        if (!saved) {
          resolve({ ...DEFAULT_SETTINGS });
          return;
        }

        // Deep merge with default settings to ensure new fields are populated
        const merged: UserSettings = {
          ...DEFAULT_SETTINGS,
          ...saved,
          indicators: {
            ...DEFAULT_SETTINGS.indicators,
            ...(saved.indicators || {})
          },
          indicatorParams: {
            ...DEFAULT_SETTINGS.indicatorParams,
            ...(saved.indicatorParams || {})
          },
          overlay: {
            ...DEFAULT_SETTINGS.overlay,
            ...(saved.overlay || {})
          }
        };

        resolve(merged);
      });
    });
  }

  /**
   * Save user settings partially or fully
   */
  public static async saveSettings(newSettings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...newSettings,
      indicators: {
        ...current.indicators,
        ...(newSettings.indicators || {})
      },
      indicatorParams: {
        ...current.indicatorParams,
        ...(newSettings.indicatorParams || {})
      },
      overlay: {
        ...current.overlay,
        ...(newSettings.overlay || {})
      }
    };

    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => {
        resolve(updated);
      });
    });
  }

  /**
   * Reset settings to factory defaults
   */
  public static async resetSettings(): Promise<UserSettings> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS }, () => {
        resolve({ ...DEFAULT_SETTINGS });
      });
    });
  }
}
