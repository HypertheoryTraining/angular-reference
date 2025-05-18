import { http, HttpResponse } from 'msw';

export const ProductHandler = [
  http.get('/api/products', () => {
    return HttpResponse.json([
      { id: 1, name: 'E Product 1', price: 32.23 },
      { id: 2, name: 'D Product 2', price: 118.23 },
      { id: 3, name: 'C Product 3', price: 42.18 },
      { id: 4, name: 'B Product 4', price: 103.23 },
      { id: 5, name: 'A Product 5', price: 1.89 },
    ]);
  }),
];
