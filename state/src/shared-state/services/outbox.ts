import {
  patchState,
  signalStoreFeature,
  withMethods,
  withState,
} from '@ngrx/signals';

type OutBoxState<T> = {
  deletions: string[];
  updates: Partial<T>[];
  additions: Partial<T>[];
};
export function withOutBox<T>() {
  return signalStoreFeature(
    withState<OutBoxState<T>>({
      deletions: [],
      updates: [],
      additions: [],
    }),
    withMethods((state) => {
      return {
        addOutboxDeletion: (id: string) => {
          const newDeletions = [...state.deletions(), id];
          patchState(state, { deletions: newDeletions });
        },
        removeDeletion: (id: string) => {
          const newDeletions = state.deletions().filter((d) => d !== id);
          patchState(state, { deletions: newDeletions });
        },
        addOutboxUpdate: (update: T) => {
          const newUpdates = [...state.updates(), update];
          patchState(state, { updates: newUpdates });
        },
        removeUpdate: (update: T) => {
          const newUpdates = state.updates().filter((u) => u !== update);
          patchState(state, { updates: newUpdates });
        },
        addOutboxAddition: (addition: Partial<T>) => {
          const newAdditions = [...state.additions(), addition];
          patchState(state, { additions: newAdditions });
        },
        removeAddition: (addition: Partial<T>) => {
          const newAdditions = state.additions().filter((a) => a !== addition);
          patchState(state, { additions: newAdditions });
        },
      };
    }),
  );
}
