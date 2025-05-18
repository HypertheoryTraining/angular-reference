import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ProductsStore } from './services/products-store';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-shared-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  template: `
    <p>Shared State</p>
    <button (click)="addProduct()" class="btn btn-primary">Add Product</button>

    <div>
      <ul>
        @for (product of store.productList(); track product.id) {
          <li class="m-8">
            <span class="flex flex-row gap-2">
              <span class="text-accent mr-4">{{ product.id }}</span>
              <span class="text-accent mr-4">{{ product.name }}</span>
              <span class="text-accent">{{ product.price | currency }}</span>
              @if (product.pending) {
                <span class="text-accent">Pending...</span>
              }
              <button
                (click)="store.deleteProduct(product.id)"
                class="btn btn-warning btn-sm"
              >
                Delete
              </button>
              <button
                (click)="store.doublePrice(product.id)"
                class="btn btn-warning btn-sm"
              >
                Double Price
              </button>
            </span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: ``,
})
export class SharedStateComponent {
  store = inject(ProductsStore);

  addProduct() {
    this.store.addProduct({
      name: 'New Product',
      price: 100,
    });
  }
}
