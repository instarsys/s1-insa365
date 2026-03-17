'use client';

import { MapPin, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GpsValidationResult {
  isWithinRange: boolean;
  nearestLocation: { id: string; name: string; distance: number } | null;
  enforcement: string;
  allowed: boolean;
  warningMessage?: string;
}

interface GpsLocationStatusProps {
  gpsStatus: GpsValidationResult | null;
  isLoading: boolean;
  gpsError?: string | null;
}

export function GpsLocationStatus({ gpsStatus, isLoading, gpsError }: GpsLocationStatusProps) {
  if (gpsError) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-amber-600">{gpsError}</span>
      </div>
    );
  }

  if (isLoading || !gpsStatus) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>위치 확인 중...</span>
      </div>
    );
  }

  // OFF 모드
  if (gpsStatus.enforcement === 'OFF') {
    if (gpsStatus.nearestLocation) {
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-emerald-600">
            {gpsStatus.nearestLocation.name}
            {gpsStatus.nearestLocation.distance > 0 && (
              <span className="ml-1 text-gray-400">({gpsStatus.nearestLocation.distance}m)</span>
            )}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <MapPin className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-emerald-500">GPS 위치 확인됨</span>
      </div>
    );
  }

  // 반경 내
  if (gpsStatus.isWithinRange && gpsStatus.nearestLocation) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-emerald-600">
          {gpsStatus.nearestLocation.name}
          {gpsStatus.nearestLocation.distance > 0 && (
            <span className="ml-1 text-gray-400">({gpsStatus.nearestLocation.distance}m)</span>
          )}
        </span>
      </div>
    );
  }

  // 반경 밖 + BLOCK
  if (!gpsStatus.allowed) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <XCircle className="h-3.5 w-3.5 text-red-500" />
        <span className="text-red-600">
          {gpsStatus.nearestLocation
            ? `${gpsStatus.nearestLocation.name}에서 ${gpsStatus.nearestLocation.distance}m`
            : '근무지 반경 밖'}
        </span>
      </div>
    );
  }

  // 반경 밖 + WARN
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      <span className="text-amber-600">
        {gpsStatus.nearestLocation
          ? `${gpsStatus.nearestLocation.name}에서 ${gpsStatus.nearestLocation.distance}m`
          : '근무지 반경 밖'}
      </span>
    </div>
  );
}
