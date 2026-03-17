/**
 * GpsValidator — GPS 반경 검증 도메인 서비스
 *
 * 순수 TypeScript, 외부 의존성 없음.
 * AttendanceClassifier와 동일한 static 메서드 패턴.
 */

export type GpsEnforcementMode = 'OFF' | 'WARN' | 'BLOCK';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface WorkLocationInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface GpsValidationResult {
  isWithinRange: boolean;
  nearestLocation: { id: string; name: string; distance: number } | null;
  enforcement: GpsEnforcementMode;
  allowed: boolean;
  warningMessage?: string;
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export class GpsValidator {
  /**
   * Haversine 공식 — 두 좌표 간 거리(m)
   */
  static haversineDistance(a: GpsCoordinates, b: GpsCoordinates): number {
    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return Math.round(EARTH_RADIUS_METERS * c);
  }

  /**
   * 가장 가까운 근무지 찾기
   */
  static findNearestLocation(
    coords: GpsCoordinates,
    locations: WorkLocationInfo[],
  ): { id: string; name: string; distance: number } | null {
    if (locations.length === 0) return null;

    let nearest: { id: string; name: string; distance: number } | null = null;

    for (const loc of locations) {
      const dist = GpsValidator.haversineDistance(coords, {
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      if (!nearest || dist < nearest.distance) {
        nearest = { id: loc.id, name: loc.name, distance: dist };
      }
    }

    return nearest;
  }

  /**
   * GPS 검증
   *
   * 규칙:
   * - OFF → allowed: true (현행 유지)
   * - 좌표 없음 + BLOCK → allowed: false
   * - 좌표 없음 + WARN → allowed: true + warning
   * - 반경 내 → allowed: true, isWithinRange: true
   * - 반경 밖 + WARN → allowed: true, isWithinRange: false + warning
   * - 반경 밖 + BLOCK → allowed: false
   */
  static validate(
    coords: GpsCoordinates | null | undefined,
    locations: WorkLocationInfo[],
    enforcement: GpsEnforcementMode,
  ): GpsValidationResult {
    // OFF 모드 — 검증 스킵
    if (enforcement === 'OFF') {
      return {
        isWithinRange: true,
        nearestLocation: coords ? GpsValidator.findNearestLocation(coords, locations) : null,
        enforcement,
        allowed: true,
      };
    }

    // 활성 근무지가 없으면 검증 스킵
    if (locations.length === 0) {
      return {
        isWithinRange: true,
        nearestLocation: null,
        enforcement,
        allowed: true,
      };
    }

    // 좌표 없음
    if (!coords) {
      if (enforcement === 'BLOCK') {
        return {
          isWithinRange: false,
          nearestLocation: null,
          enforcement,
          allowed: false,
          warningMessage: 'GPS 위치를 확인할 수 없습니다. 위치 권한을 허용해주세요.',
        };
      }
      // WARN
      return {
        isWithinRange: false,
        nearestLocation: null,
        enforcement,
        allowed: true,
        warningMessage: 'GPS 위치를 확인할 수 없습니다. 위치 권한을 허용해주세요.',
      };
    }

    // 좌표가 있으면 최근접 근무지 계산
    const nearest = GpsValidator.findNearestLocation(coords, locations);
    if (!nearest) {
      return {
        isWithinRange: true,
        nearestLocation: null,
        enforcement,
        allowed: true,
      };
    }

    // 최근접 근무지의 반경 확인
    const matchedLocation = locations.find((l) => l.id === nearest.id);
    const radius = matchedLocation?.radiusMeters ?? 100;
    const isWithinRange = nearest.distance <= radius;

    if (isWithinRange) {
      return {
        isWithinRange: true,
        nearestLocation: nearest,
        enforcement,
        allowed: true,
      };
    }

    // 반경 밖
    const warningMessage = `현재 위치가 ${nearest.name}에서 ${nearest.distance}m 떨어져 있습니다.`;

    if (enforcement === 'BLOCK') {
      return {
        isWithinRange: false,
        nearestLocation: nearest,
        enforcement,
        allowed: false,
        warningMessage,
      };
    }

    // WARN
    return {
      isWithinRange: false,
      nearestLocation: nearest,
      enforcement,
      allowed: true,
      warningMessage,
    };
  }
}
