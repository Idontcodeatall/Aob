/**
 * Centralized utility for cleaning up and upscaling Google Books cover URLs.
 * - Forces HTTPS
 * - Removes the edge-curl effect
 * - Upgrades zoom level to get higher-resolution images
 */
export function getHighResCover(url?: string, zoom: number = 2): string {
  if (!url) return "";
  return url
    .replace(/^http:/, "https:")
    .replace(/zoom=\d/, `zoom=${zoom}`)
    .replace("&edge=curl", "");
}
