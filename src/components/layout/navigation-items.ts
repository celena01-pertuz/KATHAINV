export type NavigationIcon =
  | 'home'
  | 'products'
  | 'customers'
  | 'scanner'
  | 'sales'
  | 'purchases'
  | 'reports'
  | 'more';

export interface NavigationItem {
  href: string;
  icon: NavigationIcon;
  label: string;
}

export const primaryNavigationItems: NavigationItem[] = [
  { href: '/', icon: 'home', label: 'Inicio' },
  { href: '/sales', icon: 'sales', label: 'Ventas' },
  { href: '/products', icon: 'products', label: 'Productos' },
];

export const moreNavigationItems: NavigationItem[] = [
  { href: '/customers', icon: 'customers', label: 'Clientes' },
  { href: '/scan', icon: 'scanner', label: 'Escáner' },
  { href: '/purchases', icon: 'purchases', label: 'Proveedores' },
  { href: '/reports', icon: 'reports', label: 'Reportes' },
];
