import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, LoadingController, NavController, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../services/game.service';
import { Firestore, doc, onSnapshot, collection, query, where, getDocs, writeBatch } from '@angular/fire/firestore';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Tab2Page implements OnInit {
  private firestore: Firestore = inject(Firestore);
  private gameService = inject(GameService);
  private loadingCtrl = inject(LoadingController);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  roomCode: string = '';
  gameMode: string = '';
  subMode: string = '';
  totalMax: number = 8;
  players: any[] = [];
  isHostUser: boolean = false;

  availableRoles = [
    { name: 'Ma Sói', color: 'danger', icon: 'wolf-outline' },
    { name: 'Dân Làng', color: 'primary', icon: 'people-outline' },
    { name: 'Tiên Tri', color: 'secondary', icon: 'eye-outline' },
    { name: 'Bảo Vệ', color: 'success', icon: 'shield-checkmark-outline' },
    { name: 'Phù Thủy', color: 'tertiary', icon: 'flask-outline' },
    { name: 'Sói Khóa', color: 'danger', icon: 'lock-closed-outline' },
    { name: 'Thợ Săn', color: 'warning', icon: 'bow-outline' },
    { name: 'Cupid', color: 'medium', icon: 'heart-outline' },
    { name: 'Thằng Ngố', color: 'light', icon: 'happy-outline' }
  ];
  
  selectedRoles: string[] = [];

  ngOnInit() {
    this.roomCode = this.gameService.getRoomCode();
    this.gameMode = this.gameService.getGameMode();
    this.subMode = this.gameService.getSubMode();
    this.totalMax = this.gameService.getTotalPlayers(); 
    if (this.roomCode) {
      this.listenToPlayers();
      this.listenToGameStatus();
    }
  }

  ionViewWillEnter() {
    this.selectedRoles = []; // Reset bộ bài khi quay lại trang này
  }

  listenToPlayers() {
    const q = query(collection(this.firestore, 'players'), where('roomId', '==', this.roomCode));
    onSnapshot(q, (snapshot) => {
      const myName = localStorage.getItem('my_name');
      this.players = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const me = this.players.find(p => p.name === myName);
      this.isHostUser = me?.isHost === true;
    });
  }

  listenToGameStatus() {
    const q = query(collection(this.firestore, 'rooms'), where('roomCode', '==', this.roomCode));
    onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const roomData = snapshot.docs[0].data();
        if (roomData['status'] === 'playing') {
          this.navCtrl.navigateForward('/tabs/tab3', { animated: false });
        }
      } else {
        this.navCtrl.navigateRoot('/tabs/tab1'); // Phòng bị xóa
      }
    });
  }

  get displayCount(): number {
    return this.players.filter(p => !p.isHost).length;
  }

  addRole(roleName: string) {
    if (this.selectedRoles.length < this.displayCount) {
      this.selectedRoles.push(roleName);
    }
  }

  removeRole(roleName: string) {
    const index = this.selectedRoles.lastIndexOf(roleName);
    if (index > -1) this.selectedRoles.splice(index, 1);
  }

  getRoleCount(roleName: string): number {
    return this.selectedRoles.filter(r => r === roleName).length;
  }

  async endGame() {
    const alert = await this.alertCtrl.create({
      header: 'GIẢI TÁN PHÒNG?',
      message: 'Xác nhận xóa phòng và đá tất cả người chơi.',
      buttons: [
        { text: 'HỦY', role: 'cancel' },
        { text: 'GIẢI TÁN', handler: async () => {
          const batch = writeBatch(this.firestore);
          this.players.forEach(p => batch.delete(doc(this.firestore, `players/${p.id}`)));
          const roomSnap = await getDocs(query(collection(this.firestore, 'rooms'), where('roomCode', '==', this.roomCode)));
          roomSnap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }}
      ]
    });
    await alert.present();
  }

  async startGame() {
    if (this.selectedRoles.length !== this.displayCount) return;
    const loading = await this.loadingCtrl.create({ message: 'Đang xào bài...' });
    await loading.present();

    try {
      // Xóa actions cũ
      const actionsQuery = query(collection(this.firestore, 'actions'), where('roomId', '==', this.roomCode));
      const oldActions = await getDocs(actionsQuery);
      if (!oldActions.empty) {
        const delBatch = writeBatch(this.firestore);
        oldActions.forEach(d => delBatch.delete(d.ref));
        await delBatch.commit();
      }

      // Trộn bài
      let deck = [...this.selectedRoles];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      const batch = writeBatch(this.firestore);
      const playersToAssign = this.players.filter(p => !p.isHost);
      const host = this.players.find(p => p.isHost);

      if (host) batch.update(doc(this.firestore, `players/${host.id}`), { role: 'Quản Trò', alive: true, note: null });

      playersToAssign.forEach((p, i) => {
        batch.update(doc(this.firestore, `players/${p.id}`), { 
          role: deck[i], alive: true, note: null, lostLife: false 
        });
      });

      const roomSnap = await getDocs(query(collection(this.firestore, 'rooms'), where('roomCode', '==', this.roomCode)));
      if (!roomSnap.empty) {
        batch.update(doc(this.firestore, `rooms/${roomSnap.docs[0].id}`), { status: 'playing', phase: 'night' });
      }

      await batch.commit();
      await loading.dismiss();
    } catch (e) { await loading.dismiss(); }
  }
}