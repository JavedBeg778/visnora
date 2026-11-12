// Visnora — Ad Source Adapter Registry
// Reference: M5.1 Source Adapter Architecture

import { AdSourceAdapter } from './base-adapter';
import { MetaAdLibraryAdapter } from './meta-ad-library-adapter';
import { GoogleTransparencyAdapter } from './google-transparency-adapter';
import { TikTokCreativeCenterAdapter } from './tiktok-creative-adapter';
import { ManualUrlSourceAdapter } from './manual-url-adapter';
import { AdSourceType, AdPlatformType } from '../types';

export class AdSourceAdapterRegistry {
  private static instance: AdSourceAdapterRegistry;
  private adapters: Map<AdSourceType, AdSourceAdapter> = new Map();

  private constructor() {
    this.register(new MetaAdLibraryAdapter());
    this.register(new GoogleTransparencyAdapter());
    this.register(new TikTokCreativeCenterAdapter());
    this.register(new ManualUrlSourceAdapter());
  }

  public static getInstance(): AdSourceAdapterRegistry {
    if (!AdSourceAdapterRegistry.instance) {
      AdSourceAdapterRegistry.instance = new AdSourceAdapterRegistry();
    }
    return AdSourceAdapterRegistry.instance;
  }

  public register(adapter: AdSourceAdapter): void {
    this.adapters.set(adapter.sourceType, adapter);
  }

  public getAdapter(sourceType: AdSourceType): AdSourceAdapter {
    const adapter = this.adapters.get(sourceType);
    if (!adapter) {
      throw new Error(`Unsupported or unconfigured ad source adapter: ${sourceType}`);
    }
    return adapter;
  }

  public getAllAdapters(): AdSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getAdapterForPlatform(platform: AdPlatformType): AdSourceAdapter {
    switch (platform) {
      case 'META_ADS':
        return this.getAdapter('META_AD_LIBRARY');
      case 'GOOGLE_ADS':
        return this.getAdapter('GOOGLE_ADS_TRANSPARENCY');
      case 'TIKTOK_ADS':
        return this.getAdapter('TIKTOK_CREATIVE_CENTER');
      case 'MANUAL':
      default:
        return this.getAdapter('MANUAL_SUBMISSION');
    }
  }
}

export const adSourceRegistry = AdSourceAdapterRegistry.getInstance();
