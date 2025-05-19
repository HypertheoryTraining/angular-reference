export type ApiProduct = { id: string; name: string; price: number };

export class ProductsApi {
  getProducts(): Promise<ApiProduct[]> {
    return fetch('https://some-api/products')
      .then((res) => res.json())
      .then((products) => products as ApiProduct[]);
  }
  deleteProduct(id: string) {
    return fetch(`https://some-api/products/${id}`, { method: 'DELETE' }).then(
      (res) => {
        if (res.status === 204) {
          return;
        }
        throw new Error('Could not delete product');
      },
    );
  }
  addProduct(product: Omit<ApiProduct, 'id'>): Promise<ApiProduct> {
    return fetch('https://some-api/products', {
      method: 'POST',
      body: JSON.stringify(product),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((product) => product as ApiProduct);
  }
  updateProduct(product: ApiProduct): Promise<ApiProduct> {
    return fetch(`https://some-api/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((product) => product as ApiProduct);
  }
}
