import { withDevtools } from '@angular-architects/ngrx-toolkit';
import { computed, effect, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  removeEntity,
  setEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { mergeMap, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setIsBackgroundFetching,
  setIsIdle,
  setIsLoading,
  setIsMutating,
} from './loading-modes';
import { mapToNonPending, withOutBox } from './outbox';
import { ProductsApi } from './product-api';
type ApiProduct = { id: string; name: string; price: number };

export const ProductsStore = signalStore(
  withDevtools('ProductsStore'),

  withEntities<ApiProduct>(),

  withOutBox<ApiProduct>(),
  withMethods((state) => {
    const service = inject(ProductsApi);
    return {
      addProduct: (product: Omit<ApiProduct, 'id'>) => {
        state._addOutboxAddition(crypto.randomUUID(), product);
      },
      _addProduct: rxMethod<{
        tempId: string;
        item: Omit<ApiProduct, 'id'>;
      }>(
        pipe(
          tap(() => {
            patchState(state, setIsMutating());
          }),
          mergeMap((args: { tempId: string; item: Omit<ApiProduct, 'id'> }) => {
            return service.addProduct(args.item).pipe(
              tapResponse(
                (product) => {
                  patchState(state, setEntity(product), setIsIdle());
                  state._removeOutboxAddition(args.tempId);
                },
                () => patchState(state, setError('Could not add')),
              ),
            );
          }),
        ),
      ),
      _loadProducts: rxMethod<void>(
        pipe(
          switchMap(() =>
            service.getProducts().pipe(
              tapResponse(
                (products) => {
                  patchState(state, setEntities(products), setIsIdle());
                },
                () => patchState(state, setError('Could not load')),
              ),
            ),
          ),
        ),
      ),

      deleteProduct: (p: ApiProduct) => {
        state._addOutboxDeletion(p);
      },
      _deleteProduct: rxMethod<ApiProduct>(
        pipe(
          mergeMap((p: ApiProduct) =>
            service.deleteProduct(p.id).pipe(
              tapResponse(
                () => {
                  patchState(state, removeEntity(p.id), setIsIdle());
                  state._removeOutboxDeletion(p);
                },
                () => {
                  patchState(state, setError('Could not delete'));
                  state._removeOutboxDeletion(p);
                },
              ),
            ),
          ),
        ),
      ),
      doublePrice: (p: ApiProduct) => {
        const updatedProduct = { ...p, price: p.price * 2 };

        state._addOutboxUpdate(updatedProduct);
      },
      _doublePrice: rxMethod<ApiProduct>(
        pipe(
          tap(() => {
            patchState(state, setIsMutating());
          }),
          mergeMap((p: ApiProduct) =>
            service.updateProduct(p).pipe(
              tapResponse(
                (product) => {
                  patchState(state, setEntity(product), setIsIdle());
                  state._removeOutboxUpdate(product);
                },
                () => patchState(state, setError('Could not update')),
              ),
            ),
          ),
        ),
      ),
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
      store._addApiMethods({
        add: store._addProduct,
        delete: store._deleteProduct,
        update: store._doublePrice,
      });

      patchState(store, setIsLoading());
      store._loadProducts();

      effect((cleanup) => {
        const timer = setInterval(() => {
          if (store.requestStatus() === 'idle') {
            patchState(store, setIsBackgroundFetching());
            store._loadProducts();
          }
        }, 5000);
        cleanup(() => {
          clearInterval(timer);
        });
      });
    },
  }),
);
