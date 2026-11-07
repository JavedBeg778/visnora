/**
 * Utility helpers for formatting brand domains and website URLs.
 */
export function formatBrandWebsite(domain: string | null | undefined): string {
  if (!domain) return '';
  const trimmed = domain.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const clean = trimmed.replace(/^www\./i, '');
  if (clean === 'zomato.com') {
    return 'https://www.zomato.com';
  }
  return `https://${clean}`;
}

export function formatBrandOptionLabel(brand: { canonicalName: string; domain: string }): string {
  const formattedDomain = formatBrandWebsite(brand.domain);
  return `${brand.canonicalName} (${formattedDomain})`;
}

