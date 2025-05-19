import { computed } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

export function withOutBox<T extends { id: string }>() {
  return signalStoreFeature(
    withState({
      deletions: [] as T[],
      updates: [] as T[],
      additions: [] as T[],
    }),
    withMethods((state) => {
      return {
        _addOutboxDeletion: (el: T) => {
          const newDeletions = [...state.deletions(), el];
          patchState(state, { deletions: newDeletions });
        },
        _removeOutboxDeletion: (el: T) => {
          const newDeletions = state.deletions().filter((d) => d.id !== el.id);
          patchState(state, { deletions: newDeletions });
        },
        _addOutboxUpdate: (update: T) => {
          const newUpdates = [...state.updates(), update];
          patchState(state, { updates: newUpdates });
        },
        _removeOutboxUpdate: (update: T) => {
          const newUpdates = state.updates().filter((u) => u.id !== update.id);
          patchState(state, { updates: newUpdates });
        },
        _addOutboxAddition: (tempId: string, addition: Omit<T, 'id'>) => {
          const tempAddition = { ...addition, id: tempId } as T;
          const newAdditions = [...state.additions(), tempAddition];
          patchState(state, { additions: newAdditions });
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
  );
}

function mapToPending<T extends { id: string }>(item: T) {
  return { ...item, pending: true };
}

export function mapToNonPending<T extends { id: string }>(item: T) {
  return { ...item, pending: false };
}
