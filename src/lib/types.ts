export type Role = 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface MenuItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
  roles?: Role[];
}
