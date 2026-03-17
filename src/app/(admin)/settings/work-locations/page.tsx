'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout';
import { Button, Spinner, EmptyState, useToast } from '@/components/ui';
import { fetcher, apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddressSearchInput } from '@/components/address/AddressSearchInput';
import { KakaoMap } from '@/components/address/KakaoMap';

interface WorkLocation {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  isDefault: boolean;
  isActive: boolean;
}

interface FormData {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  isDefault: boolean;
}

const defaultForm: FormData = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: 100,
  isDefault: false,
};

export default function WorkLocationsPage() {
  const toast = useToast();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ items: WorkLocation[] }>(
    `/api/work-locations${includeInactive ? '?includeInactive=true' : ''}`,
    fetcher,
  );

  const locations = data?.items ?? [];

  const handleCreate = () => {
    setForm(defaultForm);
    setEditId(null);
    setModalOpen(true);
  };

  const handleEdit = (loc: WorkLocation) => {
    setForm({
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude?.toString() ?? '',
      longitude: loc.longitude?.toString() ?? '',
      radiusMeters: loc.radiusMeters,
      isDefault: loc.isDefault,
    });
    setEditId(loc.id);
    setModalOpen(true);
  };

  const handleAddressSelected = useCallback(async (result: { address: string }) => {
    setIsGeocoding(true);
    try {
      const geo = await apiGet<{ latitude: number | null; longitude: number | null }>(
        `/api/geocode?address=${encodeURIComponent(result.address)}`,
      );
      if (geo.latitude != null && geo.longitude != null) {
        setForm((prev) => ({
          ...prev,
          latitude: geo.latitude!.toString(),
          longitude: geo.longitude!.toString(),
        }));
      }
    } catch {
      // 지오코딩 실패 시 수동 입력 유지
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.address.trim()) {
      toast.error('장소명과 주소는 필수입니다.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        radiusMeters: form.radiusMeters,
        isDefault: form.isDefault,
      };

      if (editId) {
        await apiPut(`/api/work-locations/${editId}`, payload);
        toast.success('근무지가 수정되었습니다.');
      } else {
        await apiPost('/api/work-locations', payload);
        toast.success('근무지가 추가되었습니다.');
      }
      setModalOpen(false);
      await mutate();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [form, editId, mutate, toast]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`"${name}" 근무지를 삭제하시겠습니까?`)) return;
    try {
      await apiDelete(`/api/work-locations/${id}`);
      toast.success('근무지가 삭제되었습니다.');
      await mutate();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }, [mutate, toast]);

  const handleToggleActive = useCallback(async (loc: WorkLocation) => {
    try {
      await apiPut(`/api/work-locations/${loc.id}`, { isActive: !loc.isActive });
      toast.success(loc.isActive ? '비활성화되었습니다.' : '활성화되었습니다.');
      await mutate();
    } catch {
      toast.error('변경에 실패했습니다.');
    }
  }, [mutate, toast]);

  const parsedLat = form.latitude ? parseFloat(form.latitude) : null;
  const parsedLng = form.longitude ? parseFloat(form.longitude) : null;

  return (
    <div>
      <PageHeader title="근무지 관리" subtitle="GPS 출퇴근에 사용할 근무지를 관리합니다.">
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          근무지 추가
        </Button>
      </PageHeader>

      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          비활성 항목 포함
        </label>
      </div>

      {isLoading ? (
        <Spinner text="근무지 목록을 불러오는 중..." className="py-20" />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="등록된 근무지가 없습니다"
          description="근무지를 추가하면 GPS 출퇴근 검증에 사용됩니다."
        />
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-4',
                loc.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  loc.isActive ? 'bg-indigo-50' : 'bg-gray-100',
                )}>
                  <MapPin className={cn('h-5 w-5', loc.isActive ? 'text-indigo-600' : 'text-gray-400')} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{loc.name}</span>
                    {loc.isDefault && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        기본
                      </span>
                    )}
                    {!loc.isActive && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        비활성
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{loc.address}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    {loc.latitude != null && (
                      <span>위도: {loc.latitude.toFixed(4)}</span>
                    )}
                    {loc.longitude != null && (
                      <span>경도: {loc.longitude.toFixed(4)}</span>
                    )}
                    <span>반경: {loc.radiusMeters}m</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(loc)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title={loc.isActive ? '비활성화' : '활성화'}
                >
                  {loc.isActive ? <ToggleRight className="h-5 w-5 text-indigo-600" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => handleEdit(loc)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(loc.id, loc.name)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              {editId ? '근무지 수정' : '근무지 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">장소명 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="예: 서울 본사"
                />
              </div>
              <AddressSearchInput
                label="주소 *"
                value={form.address}
                onChange={(addr) => setForm({ ...form, address: addr })}
                onAddressSelected={handleAddressSelected}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    위도 {isGeocoding && <span className="text-xs text-gray-400">(조회중...)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="37.5665"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    경도 {isGeocoding && <span className="text-xs text-gray-400">(조회중...)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="126.9780"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  반경: {form.radiusMeters}m
                </label>
                <input
                  type="range"
                  min={26}
                  max={500}
                  value={form.radiusMeters}
                  onChange={(e) => setForm({ ...form, radiusMeters: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>26m</span>
                  <span>500m</span>
                </div>
              </div>

              {/* 지도 표시 */}
              <KakaoMap
                latitude={parsedLat}
                longitude={parsedLng}
                radiusMeters={form.radiusMeters}
                height={250}
              />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300"
                />
                기본 근무지로 설정
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '저장 중...' : editId ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
