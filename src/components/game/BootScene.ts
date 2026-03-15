import * as Phaser from 'phaser';

/**
 * Generates all game textures (player run frames, cookie, sparkle, shadow, parallax).
 * No external assets required.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.generateDustTexture();
    this.generateShadowTexture();
    this.generateCookieTexture();
    this.generateSparkleTexture();
    this.generatePlayerRunFrames();
    this.generateParallaxTextures();
    this.scene.start('SweetSprintScene');
  }

  private generateDustTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('dust', 8, 8);
  }

  private generateShadowTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(32, 16, 48, 16);
    g.generateTexture('shadow', 64, 32);
  }

  private generateCookieTexture() {
    const size = 48;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Glow
    g.fillStyle(0xf59e0b, 0.25);
    g.fillCircle(size / 2, size / 2, 22);
    // Base
    g.fillStyle(0xd97706, 1);
    g.fillCircle(size / 2, size / 2, 18);
    // Chips
    g.fillStyle(0x451a03, 1);
    g.fillCircle(size / 2 - 8, size / 2 - 6, 5);
    g.fillCircle(size / 2 + 6, size / 2 + 4, 4);
    g.fillCircle(size / 2 + 4, size / 2 - 8, 3);
    g.generateTexture('cookie', size, size);
  }

  private generateSparkleTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xfbbf24, 0.9);
    g.fillCircle(8, 8, 5);
    g.generateTexture('sparkle', 16, 16);
  }

  private drawRunnerFrame(g: Phaser.GameObjects.Graphics, frameIndex: number) {
    const skin = 0xffdbac;
    const shirt = 0x0ea5e9;
    const pants = 0x334155;
    const legSwing = [0, 25, 0, -25][frameIndex];
    const armSwing = [0, -30, 0, 30][frameIndex];
    const cx = 24;
    const cy = 80;
    // Shadow placeholder area (transparent)
    // Head
    g.fillStyle(skin, 1);
    g.fillCircle(cx, cy - 65, 14);
    // Torso
    g.fillStyle(shirt, 1);
    g.fillRect(cx - 14, cy - 52, 28, 38);
    // Arms
    g.fillStyle(shirt, 1);
    g.fillRect(cx - 22 + armSwing * 0.3, cy - 48, 10, 24);
    g.fillRect(cx + 12 - armSwing * 0.3, cy - 48, 10, 24);
    // Legs
    g.fillStyle(pants, 1);
    g.fillRect(cx - 8, cy - 14 + legSwing * 0.2, 10, 28);
    g.fillRect(cx - 2, cy - 14 - legSwing * 0.2, 10, 28);
    // Eyes
    g.fillStyle(0x333333, 1);
    g.fillCircle(cx - 4, cy - 68, 2.5);
    g.fillCircle(cx + 4, cy - 68, 2.5);
  }

  private generatePlayerRunFrames() {
    const frameWidth = 48;
    const frameHeight = 96;
    const totalWidth = frameWidth * 4;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 0; i < 4; i++) {
      g.clear();
      this.drawRunnerFrame(g, i);
      g.generateTexture(`player_run_${i}`, frameWidth, frameHeight);
    }
    // Build sprite sheet from 4 frames for animation (canvas texture + frame regions)
    const key = 'player_run';
    if (!this.textures.exists(key)) {
      const canvasTex = this.textures.createCanvas(key, totalWidth, frameHeight);
      const canvas = canvasTex.getSourceImage() as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < 4; i++) {
        const frameImg = this.textures.get(`player_run_${i}`).getSourceImage() as CanvasImageSource;
        ctx.drawImage(frameImg, i * frameWidth, 0);
      }
      const tex = this.textures.get(key);
      tex.add(0, 0, 0, 0, frameWidth, frameHeight);
      tex.add(1, 0, frameWidth, 0, frameWidth, frameHeight);
      tex.add(2, 0, frameWidth * 2, 0, frameWidth, frameHeight);
      tex.add(3, 0, frameWidth * 3, 0, frameWidth, frameHeight);
      if ('refresh' in canvasTex && typeof (canvasTex as { refresh: () => void }).refresh === 'function') {
        (canvasTex as { refresh: () => void }).refresh();
      }
    }
  }

  private generateParallaxTextures() {
    // Far hills / gradient band for parallax
    const w = 800;
    const h = 200;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0x0ea5e9, 0x0ea5e9, 0.4, 0.4, 0, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture('parallax_far', w, h);
    // Mid layer - distant city/silhouette style
    const g2 = this.make.graphics({ x: 0, y: 0, add: false });
    g2.fillStyle(0x0c4a6e, 0.25);
    for (let i = 0; i < 12; i++) {
      const x = i * 70 + (i % 2) * 20;
      const height = 40 + (i % 3) * 25;
      g2.fillRect(x, h - height, 50, height);
    }
    g2.generateTexture('parallax_mid', w, h);
  }
}
