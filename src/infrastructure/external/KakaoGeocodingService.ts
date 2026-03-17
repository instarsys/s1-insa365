/**
 * Kakao REST API 지오코딩 서비스.
 * 주소 → 위도/경도 변환.
 * Graceful degradation: KAKAO_REST_API_KEY 미설정 시 null 반환.
 */

interface GeocodingResult {
  latitude: number;
  longitude: number;
}

export class KakaoGeocodingService {
  isConfigured(): boolean {
    return !!process.env.KAKAO_REST_API_KEY;
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) return null;

    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } },
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.documents?.length) return null;

    return {
      latitude: parseFloat(data.documents[0].y),
      longitude: parseFloat(data.documents[0].x),
    };
  }
}

export const kakaoGeocodingService = new KakaoGeocodingService();
