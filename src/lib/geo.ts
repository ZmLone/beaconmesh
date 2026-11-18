const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function buildDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${lat},${lng}`
  )}`;
}

export function extractDialablePhone(contact: string): string | null {
  if (!contact) return null;
  const match = contact.match(/(\+?[0-9][0-9\s\-().]{5,}[0-9])/);
  if (!match) return null;
  const cleaned = match[1].replace(/[\s\-().]/g, "");
  return cleaned.length >= 7 ? cleaned : null;
}

export function buildWhatsAppUrl(phone: string, alertTitle: string, shareUrl: string): string {
  const digitsOnly = phone.replace(/[^0-9]/g, "");
  const msg = `Hi, I saw your BeaconMesh alert: "${alertTitle}". How can I help? (${shareUrl})`;
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(msg)}`;
}
