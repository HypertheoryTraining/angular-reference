import { Routes } from '@angular/router';
import { SharedStateComponent } from './shared-state';
import { ProductsStore } from './services/products-store';
export const SHARED_STATE_ROUTES: Routes = [
  {
    path: '',
    providers: [ProductsStore],
    component: SharedStateComponent,
    children: [],
  },
];
