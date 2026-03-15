import * as Phaser from 'phaser';

/**
 * Generates illustrated-style game textures for multiple characters.
 * Each character wears a Girl Scout vest (Green).
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
    
    // Character definitions
    const characters = [
      { id: 'arya', hair: 0x634433, shirt: 0x38bdf8 },      // Brown hair, Light Blue shirt
      { id: 'emily', hair: 0xfde047, shirt: 0xf472b6 },     // Blonde hair, Pink shirt
      { id: 'maggie', hair: 0x1e293b, shirt: 0xa855f7 },    // Black hair, Purple shirt
      { id: 'charlotte', hair: 0xea580c, shirt: 0xfacc15 }  // Red hair, Yellow shirt
    ];

    characters.forEach(char => {
      this.generatePlayerRunFrames(char.id, char.hair, char.shirt);
    });

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
    const w = 64;
    const h = 32;
    const canvasTex = this.textures.createCanvas('shadow', w, h);
    const canvas = canvasTex.getSourceImage() as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cx, cy), 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.25)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if ('refresh' in canvasTex && typeof (canvasTex as any).refresh === 'function') {
      (canvasTex as any).refresh();
    }
  }

  private generateCookieTexture() {
    const size = 64;
    const canvasTex = this.textures.createCanvas('cookie', size, size);
    const canvas = canvasTex.getSourceImage() as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const r = 26;
    const grad = ctx.createRadialGradient(cx - 6, cy - 6, 0, cx, cy, r);
    grad.addColorStop(0, '#fcd34d');
    grad.addColorStop(0.6, '#d97706');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(146,64,14,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#451a03';
    [[cx - 12, cy - 10], [cx + 10, cy + 8], [cx + 8, cy - 12], [cx - 8, cy + 12]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 8, 6, 0, Math.PI * 2);
    ctx.fill();
    if ('refresh' in canvasTex && typeof (canvasTex as any).refresh === 'function') {
      (canvasTex as any).refresh();
    }
  }

  private generateSparkleTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillGradientStyle(0xffffff, 0xfff3c4, 0xfbbf24, 0xf59e0b, 0.9, 1, 0.95, 0.85);
    g.fillCircle(8, 8, 8);
    g.generateTexture('sparkle', 16, 16);
  }

  private drawRunnerFrame(g: Phaser.GameObjects.Graphics, frameIndex: number, hairColor: number, shirtColor: number) {
    const skin = 0xffdbac;
    const vestColor = 0x166534; // Girl Scout Green
    const pants = 0x334155;
    const outline = 0x1e293b;
    const legSwing = [0, 18, 28, 18, 0, -18][frameIndex % 6];
    const armSwing = [0, -22, -28, -22, 0, 22][frameIndex % 6];
    const cx = 28;
    const cy = 88;
    const r = 5;

    // Head/Hair
    g.fillStyle(hairColor, 1);
    g.fillRoundedRect(cx - 16, cy - 82, 32, 25, 8);
    g.fillStyle(skin, 1);
    g.fillCircle(cx, cy - 65, 14);
    
    // Shirt (Base)
    g.fillStyle(shirtColor, 1);
    g.fillRoundedRect(cx - 14, cy - 52, 28, 38, r);
    
    // Vest (Girl Scout Vest overlay)
    g.fillStyle(vestColor, 1);
    // Left side of vest
    g.fillRoundedRect(cx - 14, cy - 52, 10, 38, { tl: r, bl: r, tr: 0, br: 0 });
    // Right side of vest
    g.fillRoundedRect(cx + 4, cy - 52, 10, 38, { tl: 0, bl: 0, tr: r, br: r });

    // Arms
    g.fillStyle(shirtColor, 1);
    g.fillRoundedRect(cx - 24 + (armSwing * 0.4), cy - 50, 10, 26, 3);
    g.fillRoundedRect(cx + 14 - (armSwing * 0.4), cy - 50, 10, 26, 3);
    
    // Pants
    g.fillStyle(pants, 1);
    g.fillRoundedRect(cx - 9, cy - 14 + legSwing * 0.3, 10, 30, 3);
    g.fillRoundedRect(cx - 1, cy - 14 - legSwing * 0.3, 10, 30, 3);
    
    // Eyes
    g.fillStyle(0x333333, 1);
    g.fillCircle(cx - 4, cy - 68, 2);
    g.fillCircle(cx + 4, cy - 68, 2);

    // Outline
    g.lineStyle(2, outline, 1);
    g.strokeCircle(cx, cy - 65, 15);
    g.strokeRoundedRect(cx - 15, cy - 54, 30, 40, r);
  }

  private generatePlayerRunFrames(id: string, hair: number, shirt: number) {
    const frameWidth = 56;
    const frameHeight = 100;
    const numFrames = 6;
    const totalWidth = frameWidth * numFrames;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    
    for (let i = 0; i < numFrames; i++) {
      g.clear();
      this.drawRunnerFrame(g, i, hair, shirt);
      g.generateTexture(`player_${id}_run_frame_${i}`, frameWidth, frameHeight);
    }
    
    const key = `player_${id}_run`;
    if (!this.textures.exists(key)) {
      const canvasTex = this.textures.createCanvas(key, totalWidth, frameHeight);
      const canvas = canvasTex.getSourceImage() as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < numFrames; i++) {
        const frameImg = this.textures.get(`player_${id}_run_frame_${i}`).getSourceImage() as CanvasImageSource;
        ctx.drawImage(frameImg, i * frameWidth, 0);
      }
      const tex = this.textures.get(key);
      for (let i = 0; i < numFrames; i++) {
        tex.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
      }
      if ('refresh' in canvasTex && typeof (canvasTex as any).refresh === 'function') {
        (canvasTex as any).refresh();
      }
    }
  }

  private generateObstacleTextures() {
    const gw = 120;
    const gh = 70;
    const gV = this.make.graphics({ x: 0, y: 0, add: false });
    gV.fillStyle(0xdc2626, 1);
    gV.fillRoundedRect(10, 15, 100, 45, 8);
    gV.lineStyle(2, 0x991b1b, 1);
    gV.strokeRoundedRect(10, 15, 100, 45, 8);
    gV.fillStyle(0xfef2f2, 1);
    gV.fillRoundedRect(35, 8, 50, 25, 5);
    gV.lineStyle(1, 0xfecaca, 1);
    gV.strokeRoundedRect(35, 8, 50, 25, 5);
    gV.fillStyle(0x7dd3fc, 1);
    gV.fillRoundedRect(42, 12, 18, 14, 2);
    gV.fillStyle(0x000000, 1);
    gV.fillCircle(28, 58, 10);
    gV.fillCircle(92, 58, 10);
    gV.fillStyle(0x374151, 1);
    gV.fillCircle(28, 58, 6);
    gV.fillCircle(92, 58, 6);
    gV.generateTexture('obstacle_vehicle', gw, gh);

    const pw = 56;
    const ph = 50;
    const gP = this.make.graphics({ x: 0, y: 0, add: false });
    gP.fillStyle(0xd97706, 1);
    gP.fillEllipse(28, 30, 22, 18);
    gP.lineStyle(2, 0xb45309, 1);
    gP.strokeEllipse(28, 30, 22, 18);
    gP.fillStyle(0xf59e0b, 1);
    gP.fillCircle(28, 12, 14);
    gP.lineStyle(1, 0xd97706, 1);
    gP.strokeCircle(28, 12, 14);
    gP.fillStyle(0x78350f, 1);
    gP.fillEllipse(18, 4, 10, 14);
    gP.fillEllipse(38, 4, 10, 14);
    gP.fillStyle(0x000000, 1);
    gP.fillCircle(32, 11, 3);
    gP.fillStyle(0xfbbf24, 1);
    gP.fillRoundedRect(20, 16, 16, 4, 2);
    gP.generateTexture('obstacle_pet', pw, ph);

    const gPer = this.make.graphics({ x: 0, y: 0, add: false });
    const perW = 40;
    const perH = 90;
    gPer.fillStyle(0x166534, 1);
    gPer.fillRoundedRect(12, 0, 16, 28, 3);
    gPer.lineStyle(1, 0x14532d, 1);
    gPer.strokeRoundedRect(12, 0, 16, 28, 3);
    gPer.fillStyle(0x22c55e, 1);
    gPer.fillRoundedRect(8, 28, 24, 38, 5);
    gPer.lineStyle(1, 0x16a34a, 1);
    gPer.strokeRoundedRect(8, 28, 24, 38, 5);
    gPer.fillStyle(0xffdbac, 1);
    gPer.fillCircle(20, -5, 12);
    gPer.lineStyle(1, 0x92400e, 0.8);
    gPer.strokeCircle(20, -5, 12);
    gPer.fillStyle(0x1e40af, 1);
    gPer.fillRoundedRect(6, -12, 28, 10, 4);
    gPer.fillStyle(0x333333, 1);
    gPer.fillCircle(16, -7, 2);
    gPer.fillCircle(24, -7, 2);
    gPer.fillStyle(0x15803d, 1);
    gPer.fillRoundedRect(10, 66, 8, 24, 3);
    gPer.fillRoundedRect(22, 66, 8, 24, 3);
    gPer.generateTexture('obstacle_person', perW, perH);

    const pudW = 80;
    const pudH = 28;
    const gPud = this.make.graphics({ x: 0, y: 0, add: false });
    gPud.fillStyle(0x06b6d4, 1);
    gPud.fillEllipse(40, 14, 72, 22);
    gPud.lineStyle(2, 0x0891b2, 1);
    gPud.strokeEllipse(40, 14, 72, 22);
    gPud.fillStyle(0x67e8f9, 1);
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
      gFar.fillStyle(0x0c4a6e, 0.1);
      gFar.fillEllipse(x, h - 30, 200, 80);
    }
    gFar.generateTexture('parallax_far', w, h);

    const gMid = this.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 0; i < 14; i++) {
      const x = i * 58 + (i % 3) * 12;
      const height = 36 + (i % 4) * 18;
      gMid.fillGradientStyle(0x0f172a, 0x1e293b, 0x0c4a6e, 0x075985, 0.2, 0.22, 0.25, 0.22);
      gMid.fillRoundedRect(x, h - height, 44, height, 4);
      gMid.fillStyle(0x0369a1, 0.12);
      gMid.fillRoundedRect(x + 4, h - height + 4, 12, 10, 2);
    }
    gMid.generateTexture('parallax_mid', w, h);

    const gNear = this.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 0; i < 10; i++) {
      const x = i * 85;
      const height = 50 + (i % 2) * 25;
      gNear.fillGradientStyle(0x075985, 0x0369a1, 0x0c4a6e, 0x075985, 0.16, 0.18, 0.2, 0.18);
      gNear.fillRoundedRect(x, h - height, 70, height, 5);
    }
    gNear.generateTexture('parallax_near', w, h);
  }

  private generateCloudTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillGradientStyle(0xffffff, 0xffffff, 0xf0f9ff, 0xf0f9ff, 0.98, 0.98, 0.92, 0.92);
    g.fillCircle(30, 20, 28);
    g.fillCircle(55, 12, 22);
    g.fillCircle(55, 28, 22);
    g.fillCircle(80, 20, 28);
    g.generateTexture('cloud', 110, 50);
  }
}
