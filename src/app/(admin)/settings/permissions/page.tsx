'use client';

import { useState, useCallback, useMemo } from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useRolePermissions, useRolePermissionMutations, type PermissionItem } from '@/hooks/useRolePermissions';
import {
  PERMISSION_CATEGORIES,
  PERMISSIONS,
  type PermissionCategory,
} from '@/domain/value-objects/Permission';

type EditableRole = 'MANAGER';

const categories = Object.keys(PERMISSIONS) as PermissionCategory[];

export default function PermissionsPage() {
  const toast = useToast();
  const [selectedRole] = useState<EditableRole>('MANAGER');
  const { permissions, isLoading, mutate } = useRolePermissions(selectedRole);
  const { updatePermissions } = useRolePermissionMutations();

  const [isSaving, setIsSaving] = useState(false);

  // 로컬 편집 상태: { "ATTENDANCE_MGMT.CONFIRM": true, ... }
  const [localEdits, setLocalEdits] = useState<Record<string, boolean>>({});
  const [hasEdits, setHasEdits] = useState(false);

  // 서버 데이터를 맵으로 변환
  const serverMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const item of permissions) {
      map[`${item.category}.${item.permission}`] = item.enabled;
    }
    return map;
  }, [permissions]);

  // 현재 체크 상태 = 서버 + 로컬 편집
  const getChecked = useCallback((category: string, permission: string): boolean => {
    const key = `${category}.${permission}`;
    if (key in localEdits) return localEdits[key];
    return serverMap[key] ?? false;
  }, [localEdits, serverMap]);

  const handleToggle = useCallback((category: string, permission: string, checked: boolean) => {
    const key = `${category}.${permission}`;
    setLocalEdits(prev => ({ ...prev, [key]: checked }));
    setHasEdits(true);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // 전체 권한 목록을 현재 상태로 구성
      const allPermissions: PermissionItem[] = [];
      for (const category of categories) {
        const perms = PERMISSIONS[category];
        for (const perm of Object.keys(perms)) {
          allPermissions.push({
            category,
            permission: perm,
            enabled: getChecked(category, perm),
          });
        }
      }
      await updatePermissions(selectedRole, allPermissions);
      toast.success('권한 설정이 저장되었습니다.');
      setLocalEdits({});
      setHasEdits(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '권한 설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedRole, getChecked, updatePermissions, mutate, toast]);

  return (
    <div>
      <PageHeader
        title="권한 설정"
        subtitle="역할별 세부 권한을 관리합니다."
      />

      {/* 최고관리자 */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">최고관리자 권한</h3>
              <p className="text-sm text-gray-500">모든 권한을 가지고 있습니다.</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 매니저 권한 (편집 가능) */}
      <Card className="mb-4">
        <CardBody>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">매니저 권한</h3>
              <p className="text-sm text-gray-500">부서 범위의 근태/직원 관리 권한을 설정합니다.</p>
            </div>
          </div>

          {isLoading ? (
            <Spinner text="권한 정보를 불러오는 중..." className="py-8" />
          ) : (
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryLabel = PERMISSION_CATEGORIES[category];
                const perms = PERMISSIONS[category];
                const permKeys = Object.keys(perms) as (keyof typeof perms)[];

                return (
                  <div key={category}>
                    <h4 className="mb-3 text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
                      {categoryLabel}
                    </h4>
                    <div className="space-y-2.5 pl-1">
                      {permKeys.map((permKey) => (
                        <Checkbox
                          key={`${category}.${permKey}`}
                          label={perms[permKey]}
                          checked={getChecked(category, permKey)}
                          onChange={(checked) => handleToggle(category, permKey, checked)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasEdits}
                  size="sm"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 직원 */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <ShieldAlert className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">직원 권한</h3>
              <p className="text-sm text-gray-500">본인 데이터만 열람할 수 있습니다.</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
