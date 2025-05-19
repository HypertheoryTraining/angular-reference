import { computed, effect } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Observable } from 'rxjs';
import { setIsMutating, withLoadingModes } from './loading-modes';
import { RxMethod } from '@ngrx/signals/rxjs-interop';
type ApiOps<T> = {
  add: RxMethod<{ tempId: string; item: Omit<T, 'id'> }> | undefined;
  delete: RxMethod<T> | undefined;
  update?: RxMethod<T> | undefined;
};

type PendingChange<T> =
  | {
      kind: 'add';
      product: Omit<T, 'id'>;
      tempId: string;
    }
  | {
      kind: 'delete';
      product: T;
    }
  | {
      kind: 'update';
      product: T;
    };
export function withOutBox<T extends { id: string }>() {
  return signalStoreFeature(
    withLoadingModes(),
    withState({
      deletions: [] as T[],
      updates: [] as T[],
      additions: [] as T[],
      _apiMethods: {
        add: undefined,
        delete: undefined,
        update: undefined,
      } as ApiOps<T>,
      _pendingOutbox: [] as PendingChange<T>[],
    }),
    withMethods((state) => {
      return {
        _addApiMethods: (api: ApiOps<T>) => {
          patchState(state, { _apiMethods: api });
        },
        _addOutboxDeletion: (el: T) => {
          const newDeletions = [...state.deletions(), el];
          const outBoxItem: PendingChange<T> = {
            kind: 'delete',
            product: el,
          };
          const newPendingOutbox = [...state._pendingOutbox(), outBoxItem];
          patchState(state, {
            deletions: newDeletions,
            _pendingOutbox: newPendingOutbox,
          });
        },
        _removeOutboxDeletion: (el: T) => {
          const newDeletions = state.deletions().filter((d) => d.id !== el.id);
          const outBoxItem: PendingChange<T> = {
            kind: 'delete',
            product: el,
          };
          const newPendingOutbox = [...state._pendingOutbox(), outBoxItem];
          patchState(state, {
            deletions: newDeletions,
            _pendingOutbox: newPendingOutbox,
          });
        },
        _addOutboxUpdate: (update: T) => {
          const newUpdates = [...state.updates(), update];
          const outBoxItem: PendingChange<T> = {
            kind: 'update',
            product: update,
          };
          const newPendingOutbox = [...state._pendingOutbox(), outBoxItem];
          patchState(state, {
            updates: newUpdates,
            _pendingOutbox: newPendingOutbox,
          });
        },
        _removeOutboxUpdate: (update: T) => {
          const newUpdates = state.updates().filter((u) => u.id !== update.id);
          patchState(state, { updates: newUpdates });
        },
        _addOutboxAddition: (tempId: string, addition: Omit<T, 'id'>) => {
          const newAddition = { ...addition, id: tempId } as T;
          const newAdditions = [...state.additions(), newAddition];
          const outBoxItem: PendingChange<T> = {
            kind: 'add',
            product: addition,
            tempId,
          };
          const newPendingOutbox = [...state._pendingOutbox(), outBoxItem];
          patchState(state, {
            additions: newAdditions,
            _pendingOutbox: newPendingOutbox,
          });
        },
        _removeOutboxAddition: (tempId: string) => {
          const newAdditions = state.additions().filter((a) => {
            if ('id' in a) {
              return a.id !== tempId;
            }
            return true;
          });
          patchState(state, { additions: newAdditions });
        },
      };
    }),
    withComputed((state) => {
      return {
        allPendingOutboxChanges: computed(() => {
          const deletions = state.deletions().map(mapToPending);
          const additions = state.additions().map(mapToPending);
          const updates = state.updates().map(mapToPending);
          return [...deletions, ...additions, ...updates];
        }),
        allPendingOutboxChangesMap: computed(() => {
          const deletions = state.deletions().map(mapToPending);
          const additions = state.additions().map(mapToPending);
          const updates = state.updates().map(mapToPending);

          const map = new Map<'deletions' | 'additions' | 'updates', T[]>();
          map.set('deletions', deletions);
          map.set('additions', additions);
          map.set('updates', updates);
          return map;
        }),
      };
    }),
    withHooks({
      onInit: (store) => {
        effect(() => {
          const idle = store.requestStatus() === 'idle';
          const outbox = store._pendingOutbox();

          if (idle) {
            if (outbox.length > 0) {
              const [pendingChange, ...rest] = store._pendingOutbox();
              patchState(store, {
                _pendingOutbox: rest,
              });
              if (pendingChange) {
                console.log({ pendingChange });
                switch (pendingChange.kind) {
                  case 'delete': {
                    if (store._apiMethods().delete) {
                      store._apiMethods().delete!(pendingChange.product);
                    }
                    return;
                  }
                  case 'add': {
                    if (store._apiMethods().add) {
                      store._apiMethods().add!({
                        tempId: pendingChange.tempId,
                        item: pendingChange.product,
                      });
                    }
                    return;
                  }
                  case 'update': {
                    if (store._apiMethods().update) {
                      store._apiMethods().update!(pendingChange.product);
                      return;
                    }
                  }
                }
              }
            }
          }
        });
      },
    }),
  );
}

function mapToPending<T extends { id: string }>(item: T) {
  return { ...item, pending: true };
}

export function mapToNonPending<T extends { id: string }>(item: T) {
  return { ...item, pending: false };
}
