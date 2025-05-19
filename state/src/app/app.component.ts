import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  template: `
    <div class="w-full h-full">
      <div class="flex m-8 ">
        <div class="flex-none width-1/3 p-4 m-2">
          <div class="flex flex-col gap-4 p-2">
            <a
              routerLink=""
              class="link"
              [routerLinkActive]="['uppercase']"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              Home
            </a>
            <a
              routerLink="ephemeral-user"
              class="link"
              [routerLinkActive]="['uppercase']"
            >
              Ephemeral User
            </a>
          </div>
          <div class="flex flex-col gap-4 p-2">
            <a
              routerLink="outbox"
              class="link"
              [routerLinkActive]="['uppercase']"
            >
              Outbox
            </a>
          </div>
        </div>
        <div class="w-full h-full">
          <main
            class="container mx-auto   m-4 p-8 border-2 border-accent rounded-3xl "
          >
            <div class="">
              <router-outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  `,

  styles: [],
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
})
export class AppComponent {}
