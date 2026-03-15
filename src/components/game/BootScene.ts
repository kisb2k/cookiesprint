import * as Phaser from 'phaser';

/**
 * Generates illustrated-style game textures: player run, cookie, obstacles, parallax, particles.
 * Optional: place PNGs in public/assets/ to override (see public/assets/README.md).
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
    this.generateObstacleTextures();
    this.generateParallaxTextures();
    this.generateCloudTexture();
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
    const size = 56;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = size / 2;
    const cy = size / 2;
    g.lineStyle(3, 0x92400e, 1);
    g.fillStyle(0xfbbf24, 0.3);
    g.fillCircle(cx, cy, 26);
    g.fillStyle(0xd97706, 1);
    g.fillCircle(cx, cy, 22);
    g.strokeCircle(cx, cy, 22);
    g.fillStyle(0x451a03, 1);
    g.fillCircle(cx - 10, cy - 8, 6);
    g.fillCircle(cx + 8, cy + 6, 5);
    g.fillCircle(cx + 6, cy - 10, 4);
    g.fillCircle(cx - 6, cy + 10, 4);
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
    const outline = 0x1e293b;
    const legSwing = [0, 18, 28, 18, 0, -18][frameIndex % 6];
    const armSwing = [0, -22, -28, -22, 0, 22][frameIndex % 6];
    const cx = 28;
    const cy = 88;
    const stroke = 2;

    const drawOutline = () => {
      g.lineStyle(stroke, outline, 1);
      g.strokeCircle(cx, cy - 65, 15);
      g.strokeRect(cx - 15, cy - 54, 30, 40);
      g.strokeCircle(cx - 4, cy - 69, 2.5);
      g.strokeCircle(cx + 4, cy - 69, 2.5);
    };

    g.fillStyle(skin, 1);
    g.fillCircle(cx, cy - 65, 14);
    g.fillStyle(shirt, 1);
    g.fillRect(cx - 14, cy - 52, 28, 38);
    g.fillStyle(shirt, 1);
    g.fillRect(cx - 24 + (armSwing * 0.4), cy - 50, 10, 26);
    g.fillRect(cx + 14 - (armSwing * 0.4), cy - 50, 10, 26);
    g.fillStyle(pants, 1);
    g.fillRect(cx - 9, cy - 14 + legSwing * 0.3, 10, 30);
    g.fillRect(cx - 1, cy - 14 - legSwing * 0.3, 10, 30);
    g.fillStyle(0x333333, 1);
    g.fillCircle(cx - 4, cy - 68, 2.5);
    g.fillCircle(cx + 4, cy - 68, 2.5);
    drawOutline();
  }

  private generatePlayerRunFrames() {
    const frameWidth = 56;
    const frameHeight = 100;
    const numFrames = 6;
    const totalWidth = frameWidth * numFrames;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 0; i < numFrames; i++) {
      g.clear();
      this.drawRunnerFrame(g, i);
      g.generateTexture(`player_run_${i}`, frameWidth, frameHeight);
    }
    const key = 'player_run';
    if (!this.textures.exists(key)) {
      const canvasTex = this.textures.createCanvas(key, totalWidth, frameHeight);
      const canvas = canvasTex.getSourceImage() as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < numFrames; i++) {
        const frameImg = this.textures.get(`player_run_${i}`).getSourceImage() as CanvasImageSource;
        ctx.drawImage(frameImg, i * frameWidth, 0);
      }
      const tex = this.textures.get(key);
      for (let i = 0; i < numFrames; i++) {
        tex.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
      }
      if ('refresh' in canvasTex && typeof (canvasTex as { refresh: () => void }).refresh === 'function') {
        (canvasTex as { refresh: () => void }).refresh();
      }
    }
  }

  private generateObstacleTextures() {
    const outline = 0x1e293b;

    // Vehicle: compact car with cab, wheels, windshield
    const gw = 120;
    const gh = 70;
    const gV = this.make.graphics({ x: 0, y: 0, add: false });
    gV.lineStyle(2, outline, 1);
    gV.fillStyle(0x334155, 1);
    gV.fillRoundedRect(10, 15, 100, 45, 6);
    gV.strokeRoundedRect(10, 15, 100, 45, 6);
    gV.fillStyle(0x475569, 1);
    gV.fillRoundedRect(35, 8, 50, 25, 4);
    gV.strokeRoundedRect(35, 8, 50, 25, 4);
    gV.fillStyle(0x7dd3fc, 0.6);
    gV.fillRect(42, 12, 18, 14);
    gV.fillStyle(0x000000, 1);
    gV.fillCircle(28, 58, 10);
    gV.fillCircle(92, 58, 10);
    gV.fillStyle(0x64748b, 1);
    gV.fillCircle(28, 58, 6);
    gV.fillCircle(92, 58, 6);
    gV.generateTexture('obstacle_vehicle', gw, gh);

    // Pet: dog with ears, tail, collar
    const pw = 56;
    const ph = 50;
    const gP = this.make.graphics({ x: 0, y: 0, add: false });
    gP.lineStyle(2, outline, 1);
    gP.fillStyle(0x92400e, 1);
    gP.fillEllipse(28, 30, 22, 18);
    gP.strokeEllipse(28, 30, 22, 18);
    gP.fillStyle(0x92400e, 1);
    gP.fillCircle(28, 12, 14);
    gP.strokeCircle(28, 12, 14);
    gP.fillStyle(0x78350f, 1);
    gP.fillEllipse(18, 4, 10, 14);
    gP.fillEllipse(38, 4, 10, 14);
    gP.fillStyle(0x000000, 1);
    gP.fillCircle(32, 11, 3);
    gP.fillStyle(0xf59e0b, 1);
    gP.fillRect(20, 16, 16, 4);
    gP.generateTexture('obstacle_pet', pw, ph);

    // Person: pedestrian with cap, jacket, legs
    const gPer = this.make.graphics({ x: 0, y: 0, add: false });
    const perW = 40;
    const perH = 90;
    gPer.lineStyle(2, outline, 1);
    gPer.fillStyle(0x1e293b, 1);
    gPer.fillRect(12, 0, 16, 28);
    gPer.strokeRect(12, 0, 16, 28);
    gPer.fillStyle(0x334155, 1);
    gPer.fillRoundedRect(8, 28, 24, 38, 4);
    gPer.strokeRoundedRect(8, 28, 24, 38, 4);
    gPer.fillStyle(0xffdbac, 1);
    gPer.fillCircle(20, -5, 12);
    gPer.strokeCircle(20, -5, 12);
    gPer.fillStyle(0x64748b, 1);
    gPer.fillRect(6, -12, 28, 10);
    gPer.fillStyle(0x333333, 1);
    gPer.fillCircle(16, -7, 2);
    gPer.fillCircle(24, -7, 2);
    gPer.fillStyle(0x475569, 1);
    gPer.fillRect(10, 66, 8, 24);
    gPer.fillRect(22, 66, 8, 24);
    gPer.generateTexture('obstacle_person', perW, perH);

    // Water puddle: oval with highlight and ripple
    const pudW = 80;
    const pudH = 28;
    const gPud = this.make.graphics({ x: 0, y: 0, add: false });
    gPud.fillStyle(0x38bdf8, 0.5);
    gPud.fillEllipse(40, 14, 72, 22);
    gPud.lineStyle(2, 0x0ea5e9, 0.6);
    gPud.strokeEllipse(40, 14, 72, 22);
    gPud.fillStyle(0x7dd3fc, 0.4);
    gPud.fillEllipse(32, 10, 24, 10);
    gPud.generateTexture('obstacle_waterPuddle', pudW, pudH);
  }

  private generateParallaxTextures() {
    const w = 800;
    const h = 220;

    const gFar = this.make.graphics({ x: 0, y: 0, add: false });
    gFar.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0x0ea5e9, 0x0ea5e9, 0.5, 0.5, 0, 1);
    gFar.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x = i * 160 + (i % 2) * 40;
      gFar.fillStyle(0x0c4a6e, 0.12);
      gFar.fillEllipse(x, h - 30, 200, 80);
    }
    gFar.generateTexture('parallax_far', w, h);

    const gMid = this.make.graphics({ x: 0, y: 0, add: false });
    gMid.fillStyle(0x0c4a6e, 0.22);
    for (let i = 0; i < 14; i++) {
      const x = i * 58 + (i % 3) * 12;
      const height = 36 + (i % 4) * 18;
      gMid.fillRect(x, h - height, 44, height);
      gMid.fillStyle(0x0369a1, 0.15);
      gMid.fillRect(x + 4, h - height + 4, 12, 10);
      gMid.fillStyle(0x0c4a6e, 0.22);
    }
    gMid.generateTexture('parallax_mid', w, h);

    const gNear = this.make.graphics({ x: 0, y: 0, add: false });
    gNear.fillStyle(0x075985, 0.18);
    for (let i = 0; i < 10; i++) {
      const x = i * 85;
      const height = 50 + (i % 2) * 25;
      gNear.fillRect(x, h - height, 70, height);
    }
    gNear.generateTexture('parallax_near', w, h);
  }

  private generateCloudTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(30, 20, 28);
    g.fillCircle(55, 12, 22);
    g.fillCircle(55, 28, 22);
    g.fillCircle(80, 20, 28);
    g.generateTexture('cloud', 110, 50);
  }
}
