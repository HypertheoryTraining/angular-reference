import { Routes } from '@angular/router';
import { HomeComponent } from './home';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'ephemeral-user',
    loadChildren: () =>
      import('../ephemeral-user/routes').then((m) => m.EPHEMERAL_USER_ROUTES),
  },
  {
    path: 'outbox',
    loadChildren: () =>
      import('../shared-state/routes').then((m) => m.SHARED_STATE_ROUTES),
  },
];
