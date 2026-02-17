import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, AlertController, ToastController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../services/game.service';
import { Firestore, collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from '@angular/fire/firestore';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Tab3Page implements OnInit {
  private firestore: Firestore = inject(Firestore);
  private gameService = inject(GameService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private navCtrl = inject(NavController);

  roomCode = '';
  phase: 'night' | 'day' = 'night';
  isHost = false;
  players: any[] = [];
  myData: any = null;
  isFlipped = false;
  roomDocId = '';

roleDescriptions: { [key: string]: string } = {
  'Ma Sói': 'Chọn một người để cắn mỗi đêm.',
  'Dân Làng': 'Tìm ra Sói và treo cổ chúng vào ban ngày.',
  'Tiên Tri': 'Mỗi đêm, soi danh tính của một người.',
  'Bảo Vệ': 'Chọn một người để bảo vệ khỏi Sói mỗi đêm.',
  'Phù Thủy': 'Sở hữu một bình cứu và một bình độc.',
  'Sói Khóa': 'Cắn người và có thể khóa kỹ năng mục tiêu.',
  'Thợ Săn': 'Nếu chết, có thể chọn một người chết cùng.',
  'Cupid': 'Ghép đôi hai người thành một cặp đôi định mệnh.',
  'Thằng Ngố': 'Cố gắng để dân làng treo cổ mình để thắng.',
  'Quản Trò': 'Người điều hành ván đấu hãy "chơi" theo cách của bạn.'
};

getRoleDesc(role: string): string {
  return this.roleDescriptions[role] || 'Hãy thực hiện nhiệm vụ của vai trò này.';
}

  ngOnInit() {
    this.roomCode = this.gameService.getRoomCode();
    if (this.roomCode) this.listenToData();
  }

  listenToData() {
    const myName = localStorage.getItem('my_name');

    // 1. Lắng nghe Người chơi
    onSnapshot(query(collection(this.firestore, 'players'), where('roomId', '==', this.roomCode)), (snap) => {
      this.players = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const me = this.players.find(p => p.name === myName);
      if (me) {
        this.myData = { ...me };
        this.isHost = (me.isHost === true);
      }
    });

    // 2. Lắng nghe trạng thái Phòng & Tự động thoát nếu Host giải tán
    onSnapshot(query(collection(this.firestore, 'rooms'), where('roomCode', '==', this.roomCode)), (snap) => {
      if (!snap.empty) {
        this.roomDocId = snap.docs[0].id;
        const data = snap.docs[0].data() as any;
        this.phase = data.phase || 'night';
      } else {
        // Phòng không tồn tại -> Về trang chủ
        this.navCtrl.navigateRoot('/tabs/tab1');
      }
    });
  }

  flipCard() { this.isFlipped = !this.isFlipped; }

  async openHostAction(p: any) {
    if (!this.isHost) return;

    const alert = await this.alertCtrl.create({
      header: `Quản trò: ${p.name}`,
      subHeader: `Vai trò: ${p.role}`,
      cssClass: 'dark-alert', // Class để tùy chỉnh giao diện Alert sau này
      buttons: [
        { text: '⚔️ Sói cắn', handler: () => this.updateNote(p.id, 'kill') },
        { text: '🛡️ Bảo vệ', handler: () => this.updateNote(p.id, 'save') },
        { text: '🔮 Tiên tri', handler: () => this.updateNote(p.id, 'check') },
        { text: '🧪 Phù thủy', handler: () => this.updateNote(p.id, 'poison') },
        { text: '❌ Khai tử', cssClass: 'danger-text', handler: () => this.killPlayer(p.id) },
        { text: '🧹 Xóa dấu', handler: () => this.updateNote(p.id, null) },
        { text: 'Đóng', role: 'cancel' }
      ]
    });
    await alert.present();
  }

  private async updateNote(pid: string, noteType: string | null) {
    await updateDoc(doc(this.firestore, `players/${pid}`), { note: noteType });
  }

  private async killPlayer(pid: string) {
    await updateDoc(doc(this.firestore, `players/${pid}`), { alive: false, note: null });
  }

  async nextPhase() {
    if (!this.isHost) return;
    const newPhase = this.phase === 'night' ? 'day' : 'night';
    
    if (newPhase === 'day') {
      const batch = writeBatch(this.firestore);
      this.players.forEach(p => {
        if (p.note) batch.update(doc(this.firestore, `players/${p.id}`), { note: null });
      });
      await batch.commit();
    }
    
    await updateDoc(doc(this.firestore, `rooms/${this.roomDocId}`), { phase: newPhase });
  }
}