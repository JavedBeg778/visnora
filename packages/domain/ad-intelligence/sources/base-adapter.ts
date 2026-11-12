// Visnora — Ad Source Adapter Base Interface
// Reference: M5.1 Source Adapter Architecture

import {
  AdSourceType,
  AdSourceCapabilities,
  AdDiscoveryParams,
  AdDiscoveryResult,
  NormalizedAdRecord,
} from '../types';

export interface AdvertiserSearchResult {
  advertiserId: string;
  advertiserName: string;
  pageUrl?: string;
  activeAdsCount?: number;
  country?: string;
}

export interface AdSourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly sourceType: AdSourceType;
  readonly capabilities: AdSourceCapabilities;

  /**
   * Discovers advertisements from this source based on query parameters.
   */
  discoverAds(params: AdDiscoveryParams): Promise<AdDiscoveryResult>;

  /**
   * Retrieves specific ad details by platform external ID.
   */
  getAdDetails(externalAdId: string): Promise<NormalizedAdRecord | null>;

  /**
   * Searches for advertisers on this platform.
   */
  searchAdvertisers?(query: string): Promise<AdvertiserSearchResult[]>;

  /**
   * Returns documented platform access rules, legal boundaries, and limitations.
   */
  getLimitations(): string[];
}

