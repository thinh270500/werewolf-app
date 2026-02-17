import { Component, inject } from '@angular/core';
import { IonicModule, LoadingController, AlertController, NavController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class Tab1Page {
  private gameService = inject(GameService);
  private firestore: Firestore = inject(Firestore);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private navCtrl = inject(NavController);

  playerCount: number = 8;
  gameMode: string = 'manual';
  subMode: string = 'casual'; 
  roomCode: string = '';

  onModeChange() { 
    console.log('Mode đã chọn:', this.gameMode); 
  }

  async createRoom() {
    const alert = await this.alertCtrl.create({
      header: 'Tên Chủ Làng 👑',
      inputs: [{ name: 'playerName', placeholder: 'Nhập biệt danh của anh...', type: 'text' }],
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Tạo Phòng',
          handler: (data) => {
            if (!data.playerName) return false;
            this.processCreateRoom(data.playerName);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async processCreateRoom(playerName: string) {
    const loading = await this.loadingCtrl.create({ message: 'Đang tạo phòng...' });
    await loading.present();

    try {
      const newRoomCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await addDoc(collection(this.firestore, 'rooms'), {
        roomCode: newRoomCode,
        totalPlayers: this.playerCount,
        mode: this.gameMode,
        subMode: this.subMode,
        status: 'waiting', // Trạng thái chờ
        phase: 'night', 
        createdAt: new Date()
      });

      const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${playerName}${newRoomCode}`;
      await addDoc(collection(this.firestore, 'players'), {
        roomId: newRoomCode,
        name: playerName,
        isHost: true, // Lưu kiểu boolean chuẩn
        avatar: avatar,
        role: '', 
        alive: true
      });

      localStorage.setItem('my_name', playerName);
      this.gameService.setRoomCode(newRoomCode);
      this.gameService.setGameSettings(this.gameMode, this.subMode, this.playerCount);

      await loading.dismiss();
      this.navCtrl.navigateForward('/tabs/tab2');
    } catch (e) { 
      await loading.dismiss(); 
      console.error("Lỗi tạo phòng:", e);
    }
  }

  async joinRoom() {
    if (!this.roomCode) {
      this.showError("Anh chưa nhập mã phòng kìa!");
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Biệt danh của bạn',
      inputs: [{ name: 'playerName', placeholder: 'Tên bạn là gì?', type: 'text' }],
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Vào Phòng',
          handler: (data) => {
            if (!data.playerName) return false;
            this.processJoinRoom(data.playerName);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async processJoinRoom(playerName: string) {
    const loading = await this.loadingCtrl.create({ message: 'Đang tìm phòng...' });
    await loading.present();

    try {
      const roomQuery = query(collection(this.firestore, 'rooms'), where('roomCode', '==', this.roomCode));
      const roomSnap = await getDocs(roomQuery);

      if (roomSnap.empty) {
        await loading.dismiss();
        this.showError("Mã phòng không tồn tại!");
        return;
      }

      const roomData = roomSnap.docs[0].data();

      // --- SỬA LỖI SỐ 4: KIỂM TRA TRẠNG THÁI PHÒNG ---
      if (roomData['status'] !== 'waiting') {
        await loading.dismiss();
        this.showError("Phòng này đã bắt đầu hoặc không còn nhận thêm người!");
        return;
      }

      const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${playerName}${Math.random()}`;
      await addDoc(collection(this.firestore, 'players'), {
        roomId: this.roomCode,
        name: playerName,
        isHost: false, // Người tham gia không phải host
        avatar: avatar,
        role: '',
        alive: true
      });

      localStorage.setItem('my_name', playerName);
      this.gameService.setRoomCode(this.roomCode);
      // Đồng bộ cài đặt từ host sang người chơi
      this.gameService.setGameSettings(roomData['mode'], roomData['subMode'], roomData['totalPlayers']);

      await loading.dismiss();
      this.navCtrl.navigateForward('/tabs/tab2');
    } catch (e) { 
      await loading.dismiss(); 
      console.error("Lỗi vào phòng:", e);
    }
  }

  async showError(msg: string) {
    const alert = await this.alertCtrl.create({ header: 'Lỗi', message: msg, buttons: ['OK'] });
    await alert.present();
  }
} 