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
  withLoadingModes,
} from './loading-modes';
import { mapToNonPending, withOutBox } from './outbox';
import { ProductsApi } from './product-api';
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
      _addProduct: rxMethod<{
        tempId: string;
        product: Omit<ApiProduct, 'id'>;
      }>(
        pipe(
          tap(() => {
            patchState(state, setIsMutating());
          }),
          mergeMap(
            (args: { tempId: string; product: Omit<ApiProduct, 'id'> }) => {
              return service.addProduct(args.product).pipe(
                tapResponse(
                  (product) => {
                    patchState(state, setEntity(product), setIsIdle());
                    state._removeOutboxAddition(args.tempId);
                  },
                  () => patchState(state, setError('Could not add')),
                ),
              );
            },
          ),
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
        const proposedChange: PendingChange = {
          kind: 'delete',
          product: p,
        };
        const newPendingChanges = [...state.pendingChanges(), proposedChange];
        state._addOutboxDeletion(p);
        patchState(state, { pendingChanges: newPendingChanges });
      },
      _deleteProduct: rxMethod<ApiProduct>(
        pipe(
          tap(() => {
            patchState(state, setIsMutating());
          }),
          mergeMap((p: ApiProduct) =>
            service.deleteProduct(p.id).pipe(
              tapResponse(
                () => {
                  patchState(state, removeEntity(p.id), setIsIdle());
                  state._removeOutboxDeletion(p);
                },
                () => patchState(state, setError('Could not delete')),
              ),
            ),
          ),
        ),
      ),
      doublePrice: (p: ApiProduct) => {
        const updatedProduct = { ...p, price: p.price * 2 };
        state._addOutboxUpdate(updatedProduct);
        const proposedChange: PendingChange = {
          kind: 'update',
          product: updatedProduct,
        };
        const newPendingChanges = [...state.pendingChanges(), proposedChange];
        state._addOutboxUpdate(updatedProduct);
        patchState(state, { pendingChanges: newPendingChanges });
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

      effect(() => {
        const idle = store.requestStatus() === 'idle';
        const any = store.pendingChanges().length > 0;

        if (any) {
          if (idle) {
            const pendingChange = store.pendingChanges()?.pop();

            if (pendingChange) {
              console.log({ pendingChange });
              switch (pendingChange.kind) {
                case 'delete':
                  store._deleteProduct(pendingChange.product);
                  return;
                case 'update':
                  store._doublePrice(pendingChange.product);
                  return;
                case 'add':
                  store._addProduct({
                    tempId: pendingChange.tempId,
                    product: pendingChange.product,
                  });
                  return;
              }
            }
          }
        }
      });
    },
  }),
);
