export type NavigationIcon =
  | 'home'
  | 'products'
  | 'customers'
  | 'scanner'
  | 'sales'
  | 'purchases'
  | 'reports';

export interface NavigationItem {
  href: string;
  icon: NavigationIcon;
  label: string;
}

export const navigationItems: NavigationItem[] = [
  { href: '/', icon: 'home', label: 'Inicio' },
  { href: '/products', icon: 'products', label: 'Productos' },
  { href: '/customers', icon: 'customers', label: 'Clientes' },
  { href: '/scan', icon: 'scanner', label: 'Escáner' },
  { href: '/sales', icon: 'sales', label: 'Ventas' },
  { href: '/purchases', icon: 'purchases', label: 'Compras' },
  { href: '/reports', icon: 'reports', label: 'Reportes' },
];
