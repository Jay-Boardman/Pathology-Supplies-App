import { Order, Product } from '../types';

const KEYS = {
  CATALOGUE: 'nhs_catalogue',
  ORDERS: 'nhs_orders',
};

// --- Catalogue Operations ---

export const getCatalogue = (): Product[] => {
  const data = localStorage.getItem(KEYS.CATALOGUE);
  return data ? JSON.parse(data) : [];
};

export const saveCatalogue = (products: Product[]) => {
  localStorage.setItem(KEYS.CATALOGUE, JSON.stringify(products));
};

export const updateProduct = (updatedProduct: Product) => {
  const products = getCatalogue();
  const index = products.findIndex((p) => p.code === updatedProduct.code);
  if (index !== -1) {
    products[index] = updatedProduct;
  } else {
    products.push(updatedProduct);
  }
  saveCatalogue(products);
};

// --- Order Operations ---

export const getOrders = (): Order[] => {
  const data = localStorage.getItem(KEYS.ORDERS);
  return data ? JSON.parse(data) : [];
};

export const saveOrder = (order: Order) => {
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
};