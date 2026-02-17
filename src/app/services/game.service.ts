import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  currentRoomCode: string = '';
  private gameMode: string = 'manual';
  private subMode: string = 'casual';
  private totalPlayers: number = 8; 

  constructor() { }

  // Lưu cấu hình phòng chơi
  setGameSettings(mode: string, sub: string, total: number) {
    this.gameMode = mode;
    this.subMode = sub;
    this.totalPlayers = total;
  }

  getGameMode() { return this.gameMode; }
  getSubMode() { return this.subMode; }
  getTotalPlayers() { return this.totalPlayers; }

  /**
   * CẬP NHẬT: Chia và tráo bài chuẩn xác
   * Đảm bảo tính ngẫu nhiên cao nhất để không ai bị trùng role cũ.
   */
  getRoleDeck(totalPlayers: number): string[] {
    let deck: string[] = [];

    // 1. Nhóm vai trò đặc biệt (Thêm theo thứ tự ưu tiên)
    const specialRoles = [
      'Ma Sói',    // 1
      'Tiên Tri',  // 2
      'Bảo Vệ',    // 3
      'Phù Thủy',  // 4
      'Thằng Ngố', // 5
      'Già Làng',  // 6
      'Cupid',     // 7
      'Ma Sói',    // 8 (Sói thứ 2)
      'Sói Khóa',  // 9
      'Thợ Săn'    // 10
    ];

    // Lấy các vai trò đặc biệt dựa trên số lượng người chơi thực tế
    for (let i = 0; i < totalPlayers; i++) {
      if (i < specialRoles.length) {
        deck.push(specialRoles[i]);
      } else {
        deck.push('Dân Làng');
      }
    }

    // 2. Thuật toán Tráo bài Fisher-Yates (Chuẩn công nghiệp)
    // Giúp xáo trộn mảng cực đều, tránh lỗi "ai cũng thấy mình là Tiên Tri"
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  setRoomCode(code: string) {
    this.currentRoomCode = code;
    localStorage.setItem('active_room', code);
  }

  getRoomCode() {
    return this.currentRoomCode || localStorage.getItem('active_room') || '';
  }
}