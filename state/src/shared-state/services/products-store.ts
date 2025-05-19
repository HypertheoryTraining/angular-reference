import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
} from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { mapToNonPending, withOutBox } from './outbox';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { computed, effect, inject } from '@angular/core';
import { ProductsApi } from './product-api';
import {
  setIsIdle,
  setError,
  setIsLoading,
  setIsMutating,
  withLoadingModes,
  clearError,
  setIsBackgroundFetching,
} from './loading-modes';
type ApiProduct = { id: string; name: string; price: number };
export const ProductsStore = signalStore(
  withDevtools('ProductsStore'),
  withEntities<ApiProduct>(),
  withLoadingModes(),
  withOutBox<ApiProduct>(),
  withMethods((state) => {
    const service = inject(ProductsApi);
    return {
      _loadProducts: async () => {
        await service
          .getProducts()
          .then((products) =>
            patchState(state, setEntities(products), setIsIdle()),
          );
      },
      addProduct: async (product: Omit<ApiProduct, 'id'>) => {
        const tempId = crypto.randomUUID();
        state._addOutboxAddition(tempId, product);
        patchState(state, setIsMutating());
        await service.addProduct(product).then((res) => {
          patchState(state, addEntity(res), setIsIdle());
          state._removeOutboxAddition(tempId);
        });
      },
      deleteProduct: async (p: ApiProduct) => {
        patchState(state, setIsMutating());
        state._addOutboxDeletion(p);
        try {
          await service.deleteProduct(p.id);

          patchState(state, removeEntity(p.id), setIsIdle);
          state._removeOutboxDeletion(p);
        } catch (e) {
          console.error('Error deleting product:', e);
          // Handle the error as needed, e.g., show a notification
          patchState(state, addEntity(p), setError('Could not delete'));
          state._removeOutboxDeletion(p);
        }
      },
      doublePrice: async (p: ApiProduct) => {
        const updatedProduct = { ...p, price: p.price * 2 };
        patchState(state, setIsMutating());
        state._addOutboxUpdate(updatedProduct);
        await service.updateProduct(updatedProduct);
        patchState(state, setEntity(updatedProduct), setIsIdle);
        state._removeOutboxUpdate(updatedProduct);
      },
      clearError: () => {
        patchState(state, clearError());
      },
    };
  }),
  withComputed((state) => ({
    productList: computed(() => {
      const products = state.entities().map(mapToNonPending);
      const changes = state.allPendingOutboxChanges();

      const resultMap = new Map<string, ApiProduct & { pending: boolean }>();
      products.forEach((product) => {
        resultMap.set(product.id, product);
      });
      changes.forEach((product) => {
        resultMap.set(product.id, { ...product, pending: true });
      });

      return Array.from(resultMap.values());
    }),
  })),
  withHooks({
    onInit: (store) => {
      patchState(store, setIsLoading());
      store._loadProducts();

      effect((cleanup) => {
        const timer = setInterval(() => {
          patchState(store, setIsBackgroundFetching());
          store._loadProducts();
        }, 5000);
        cleanup(() => {
          clearInterval(timer);
        });
      });
    },
  }),
);
