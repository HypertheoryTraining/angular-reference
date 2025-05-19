import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
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
type PendingChange =
  | {
      kind: 'add';
      product: Omit<ApiProduct, 'id'>;
      tempId: string;
    }
  | {
      kind: 'delete';
      product: ApiProduct;
    }
  | {
      kind: 'update';
      product: ApiProduct;
    };

export const ProductsStore = signalStore(
  withDevtools('ProductsStore'),
  withState({
    pendingChanges: [] as PendingChange[],
  }),
  withEntities<ApiProduct>(),
  withLoadingModes(),
  withOutBox<ApiProduct>(),
  withMethods((state) => {
    const service = inject(ProductsApi);
    return {
      addProduct: (product: Omit<ApiProduct, 'id'>) => {
        const pendingChanges = state.pendingChanges();
        const proposedChange: PendingChange = {
          kind: 'add',
          product: { ...product },
          tempId: crypto.randomUUID(),
        };
        const newPendingChanges = [...pendingChanges, proposedChange];
        state._addOutboxAddition(proposedChange.tempId, product);
        patchState(state, { pendingChanges: newPendingChanges });
      },
      _addProduct: async (tempId: string, product: Omit<ApiProduct, 'id'>) => {
        patchState(state, setIsMutating());
        await service.addProduct(product).then((res) => {
          patchState(state, addEntity(res), setIsIdle());
          state._removeOutboxAddition(tempId);
        });
      },
      _loadProducts: async () => {
        await service
          .getProducts()
          .then((products) =>
            patchState(state, setEntities(products), setIsIdle()),
          );
      },

      deleteProduct: (p: ApiProduct) => {
        const proposedChange: PendingChange = {
          kind: 'delete',
          product: p,
        };
        const newPendingChanges = [...state.pendingChanges(), proposedChange];
        state._addOutboxDeletion(p);
        patchState(state, { pendingChanges: newPendingChanges });
      },
      _deleteProduct: async (p: ApiProduct) => {
        patchState(state, setIsMutating());

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
      doublePrice: (p: ApiProduct) => {
        const updatedProduct = { ...p, price: p.price * 2 };
        state._addOutboxUpdate(updatedProduct);
        const proposedChange: PendingChange = {
          kind: 'update',
          product: updatedProduct,
        };
        const newPendingChanges = [...state.pendingChanges(), proposedChange];
        patchState(state, { pendingChanges: newPendingChanges });
      },
      _doublePrice: async (p: ApiProduct) => {
        const updatedProduct = { ...p, price: p.price * 2 };
        patchState(state, setIsMutating());

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

      effect(async () => {
        const idle = store.requestStatus() === 'idle';
        const any = store.pendingChanges().length > 0;

        if (any) {
          if (idle) {
            const pendingChange = store.pendingChanges()?.pop();

            if (pendingChange) {
              console.log({ pendingChange });
              switch (pendingChange.kind) {
                case 'delete':
                  await store._deleteProduct(pendingChange.product);
                  return;
                case 'update':
                  await store._doublePrice(pendingChange.product);
                  return;
                case 'add':
                  await store._addProduct(
                    pendingChange.tempId,
                    pendingChange.product,
                  );
                  return;
              }
              // You can call a method to add the product here
            }
          }
        }
      });
    },
  }),
);
