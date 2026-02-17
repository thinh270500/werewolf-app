import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true, // Chuyển thành true
  imports: [IonApp, IonRouterOutlet], // Thêm các thành phần của Ionic vào đây
})
export class AppComponent {
  constructor() {}
}