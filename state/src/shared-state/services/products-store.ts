import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
} from '@ngrx/signals';
import { setEntities, withEntities } from '@ngrx/signals/entities';
import { withOutBox } from './outbox';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { computed } from '@angular/core';
type ApiProduct = { id: string; name: string; price: number };
export const ProductsStore = signalStore(
  withDevtools('ProductsStore'),
  withEntities<ApiProduct>(),
  withOutBox<ApiProduct>(),
  withMethods((state) => ({
    _loadProducts: async () =>
      await fetch('/api/products')
        .then((res) => res.json())
        .then((products) => patchState(state, setEntities(products))),
    addProduct: (product: Omit<ApiProduct, 'id'>) => {
      state.addOutboxAddition(product);
    },
    deleteProduct: (id: string) => {
      state.addOutboxDeletion(id);
    },
    doublePrice: (id: string) => {
      const product = state.entities().find((p) => p.id === id);
      if (product) {
        const updatedProduct = { ...product, price: product.price * 2 };
        state.addOutboxUpdate(updatedProduct);
      }
    },
  })),
  withComputed((state) => ({
    productList: computed(() => {
      const products = state.entities().map((p) => ({ ...p, pending: false }));
      const deletions = state.deletions();
      const updates = state.updates();
      const f1 = products.filter((product) => !deletions.includes(product.id));
      const f2 = f1.map((product) => {
        const update = updates.find((u) => u.id === product.id);
        return update ? { ...product, ...update, pending: true } : product;
      });
      return f2;
    }),
  })),
  withHooks({
    onInit: (store) => {
      store._loadProducts();
    },
  }),
);
