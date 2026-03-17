'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface KakaoMapProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters?: number;
  height?: number;
}

export function KakaoMap({
  latitude,
  longitude,
  radiusMeters,
  height = 250,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const markerRef = useRef<kakao.maps.Marker | null>(null);
  const circleRef = useRef<kakao.maps.Circle | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const hasAppKey = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  // SDK 로딩 감지
  useEffect(() => {
    if (!hasAppKey) return;

    const checkSdk = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setSdkReady(true));
      } else {
        setTimeout(checkSdk, 200);
      }
    };
    checkSdk();
  }, [hasAppKey]);

  // 지도 초기화 + 마커/원 업데이트
  useEffect(() => {
    if (!sdkReady || !mapRef.current || latitude == null || longitude == null) return;

    const center = new window.kakao!.maps.LatLng(latitude, longitude);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.kakao!.maps.Map(mapRef.current, {
        center,
        level: 4,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
    }

    // 마커
    if (!markerRef.current) {
      markerRef.current = new window.kakao!.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
      });
    } else {
      markerRef.current.setPosition(center);
    }

    // 반경 원
    if (radiusMeters && radiusMeters > 0) {
      if (!circleRef.current) {
        circleRef.current = new window.kakao!.maps.Circle({
          center,
          radius: radiusMeters,
          strokeWeight: 2,
          strokeColor: '#6366f1',
          strokeOpacity: 0.8,
          fillColor: '#6366f1',
          fillOpacity: 0.15,
          map: mapInstanceRef.current,
        });
      } else {
        circleRef.current.setPosition(center);
        circleRef.current.setRadius(radiusMeters);
      }
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  }, [sdkReady, latitude, longitude, radiusMeters]);

  if (!hasAppKey) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400"
        style={{ height }}
      >
        <MapPin className="mb-2 h-8 w-8" />
        <span className="text-sm">카카오 지도 API 키가 설정되지 않았습니다</span>
      </div>
    );
  }

  if (latitude == null || longitude == null) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400"
        style={{ height }}
      >
        <MapPin className="mb-2 h-8 w-8" />
        <span className="text-sm">주소를 검색하면 지도가 표시됩니다</span>
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50"
        style={{ height }}
      >
        <span className="text-sm text-gray-400">지도 로딩중...</span>
      </div>
    );
  }

  return <div ref={mapRef} className="rounded-lg border border-gray-200" style={{ height }} />;
}
