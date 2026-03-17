import { describe, it, expect } from 'vitest';
import { GpsValidator, type GpsCoordinates, type WorkLocationInfo, type GpsEnforcementMode } from '../GpsValidator';

// 서울시청 좌표
const SEOUL_CITY_HALL: GpsCoordinates = { latitude: 37.5665, longitude: 126.9780 };
// 서울역 좌표 (~2km from city hall)
const SEOUL_STATION: GpsCoordinates = { latitude: 37.5547, longitude: 126.9707 };
// 부산역 좌표 (~325km from Seoul)
const BUSAN_STATION: GpsCoordinates = { latitude: 35.1152, longitude: 129.0403 };

const WORK_LOCATION_1: WorkLocationInfo = {
  id: 'loc-1',
  name: '서울 본사',
  latitude: 37.5665,
  longitude: 126.9780,
  radiusMeters: 100,
};

const WORK_LOCATION_2: WorkLocationInfo = {
  id: 'loc-2',
  name: '서울역 지점',
  latitude: 37.5547,
  longitude: 126.9707,
  radiusMeters: 200,
};

describe('GpsValidator', () => {
  describe('haversineDistance', () => {
    it('동일 좌표는 0m', () => {
      expect(GpsValidator.haversineDistance(SEOUL_CITY_HALL, SEOUL_CITY_HALL)).toBe(0);
    });

    it('서울시청 ↔ 서울역 약 1.5km', () => {
      const dist = GpsValidator.haversineDistance(SEOUL_CITY_HALL, SEOUL_STATION);
      expect(dist).toBeGreaterThan(1400);
      expect(dist).toBeLessThan(1600);
    });

    it('서울 ↔ 부산 약 325km', () => {
      const dist = GpsValidator.haversineDistance(SEOUL_CITY_HALL, BUSAN_STATION);
      expect(dist).toBeGreaterThan(300_000);
      expect(dist).toBeLessThan(350_000);
    });

    it('음수 좌표도 처리', () => {
      const a: GpsCoordinates = { latitude: -33.8688, longitude: 151.2093 }; // Sydney
      const b: GpsCoordinates = { latitude: 37.5665, longitude: 126.9780 }; // Seoul
      const dist = GpsValidator.haversineDistance(a, b);
      expect(dist).toBeGreaterThan(8_000_000); // ~8,600km
    });
  });

  describe('findNearestLocation', () => {
    it('빈 배열이면 null', () => {
      expect(GpsValidator.findNearestLocation(SEOUL_CITY_HALL, [])).toBeNull();
    });

    it('가장 가까운 근무지 반환', () => {
      const result = GpsValidator.findNearestLocation(SEOUL_CITY_HALL, [WORK_LOCATION_1, WORK_LOCATION_2]);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('loc-1');
      expect(result!.distance).toBe(0);
    });

    it('서울역에서는 서울역 지점이 최근접', () => {
      const result = GpsValidator.findNearestLocation(SEOUL_STATION, [WORK_LOCATION_1, WORK_LOCATION_2]);
      expect(result!.id).toBe('loc-2');
      expect(result!.distance).toBeLessThan(10);
    });
  });

  describe('validate', () => {
    const locations = [WORK_LOCATION_1, WORK_LOCATION_2];

    it('OFF 모드 — 항상 allowed', () => {
      const result = GpsValidator.validate(null, locations, 'OFF');
      expect(result.allowed).toBe(true);
      expect(result.isWithinRange).toBe(true);
    });

    it('OFF 모드 + 좌표 있음 — nearestLocation 반환', () => {
      const result = GpsValidator.validate(SEOUL_CITY_HALL, locations, 'OFF');
      expect(result.allowed).toBe(true);
      expect(result.nearestLocation?.id).toBe('loc-1');
    });

    it('BLOCK + 좌표 없음 → allowed: false', () => {
      const result = GpsValidator.validate(null, locations, 'BLOCK');
      expect(result.allowed).toBe(false);
      expect(result.warningMessage).toBeDefined();
    });

    it('WARN + 좌표 없음 → allowed: true + warning', () => {
      const result = GpsValidator.validate(null, locations, 'WARN');
      expect(result.allowed).toBe(true);
      expect(result.warningMessage).toBeDefined();
    });

    it('반경 내 (BLOCK) → allowed: true', () => {
      const result = GpsValidator.validate(SEOUL_CITY_HALL, locations, 'BLOCK');
      expect(result.allowed).toBe(true);
      expect(result.isWithinRange).toBe(true);
      expect(result.nearestLocation!.id).toBe('loc-1');
    });

    it('반경 내 (WARN) → allowed: true', () => {
      const result = GpsValidator.validate(SEOUL_CITY_HALL, locations, 'WARN');
      expect(result.allowed).toBe(true);
      expect(result.isWithinRange).toBe(true);
    });

    it('반경 밖 + BLOCK → allowed: false', () => {
      const result = GpsValidator.validate(BUSAN_STATION, locations, 'BLOCK');
      expect(result.allowed).toBe(false);
      expect(result.isWithinRange).toBe(false);
      expect(result.warningMessage).toContain('떨어져 있습니다');
    });

    it('반경 밖 + WARN → allowed: true + warning', () => {
      const result = GpsValidator.validate(BUSAN_STATION, locations, 'WARN');
      expect(result.allowed).toBe(true);
      expect(result.isWithinRange).toBe(false);
      expect(result.warningMessage).toContain('떨어져 있습니다');
    });

    it('활성 근무지 없음 → 검증 스킵', () => {
      const result = GpsValidator.validate(SEOUL_CITY_HALL, [], 'BLOCK');
      expect(result.allowed).toBe(true);
      expect(result.isWithinRange).toBe(true);
    });

    it('반경 경계값 — 정확히 반경 거리', () => {
      // loc-1 반경 100m, loc-2 반경 200m
      // 서울역에서 loc-2까지 약 0m (동일 좌표) → 반경 내
      const result = GpsValidator.validate(SEOUL_STATION, [WORK_LOCATION_2], 'BLOCK');
      expect(result.allowed).toBe(true);
      expect(result.isWithinRange).toBe(true);
    });

    it('enforcement 값에 따라 warningMessage에 장소명 포함', () => {
      const farAway: GpsCoordinates = { latitude: 37.4, longitude: 127.1 };
      const result = GpsValidator.validate(farAway, [WORK_LOCATION_1], 'WARN');
      expect(result.warningMessage).toContain('서울 본사');
    });
  });
});
