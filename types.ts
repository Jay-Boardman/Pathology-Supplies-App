export interface Product {
  code: string;
  description: string;
  category?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  date: string; // ISO String
  items: CartItem[];
}

export enum AppView {
  HOME = 'HOME',
  SCANNER = 'SCANNER',
  TRACKING = 'TRACKING',
  CATALOGUE = 'CATALOGUE',
}

export interface DateRange {
  start: string;
  end: string;
}
