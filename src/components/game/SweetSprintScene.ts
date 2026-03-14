import * as Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private currentLane: number = 1;
  private laneYPositions: number[] = [320, 440, 560];
  private laneScales: number[] = [0.75, 1.0, 1.25];
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private speed: number = 12;
  
  private clouds!: Phaser.GameObjects.Group;
  private bridgeDecks: Phaser.GameObjects.TileSprite[] = [];
  private distantBridge!: Phaser.GameObjects.TileSprite;
  
  private obstacles!: Phaser.Physics.Arcade.Group;
  private cookies!: Phaser.Physics.Arcade.Group;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  private lastObstacleDistance: number = 0;
  private segmentLength: number = 2000;
  private isGenerating: boolean = false;

  private lives: number = 2;
  private isInvulnerable: boolean = false;
  private isGameActive: boolean = false;

  private onGameOver: (score: number, cookies: number) => void;
  private onUpdateLives: (lives: number) => void;

  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  constructor(
    onGameOver: (score: number, cookies: number) => void,
    onUpdateLives: (lives: number) => void
  ) {
    super('SweetSprintScene');
    this.onGameOver = onGameOver;
    this.onUpdateLives = onUpdateLives;
  }

  init() {
    this.score = 0;
    this.distance = 0;
    this.cookiesCollected = 0;
    this.speed = 12;
    this.currentLane = 1;
    this.lives = 2;
    this.isInvulnerable = false;
    this.lastObstacleDistance = 0;
    this.isGenerating = false;
    this.isGameActive = false;
    this.bridgeDecks = [];
  }

  create() {
    const { width, height } = this.scale;

    // 1. Enhanced Sky Gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0xbae6fd, 0xbae6fd, 1);
    sky.fillRect(0, 0, width, height);

    // 2. Parallax distant bridge silhouette
    this.createDistantBridge();

    // 3. Clouds
    this.clouds = this.add.group();
    for (let i = 0; i < 8; i++) {
      this.createCloud(Phaser.Math.Between(0, width), Phaser.Math.Between(30, 150));
    }

    // 4. Detailed Bridge Textures
    this.createBridgeTextures();
    this.laneYPositions.forEach((y, index) => {
      const deckHeight = 80 * this.laneScales[index];
      const tileSprite = this.add.tileSprite(width / 2, y, width, deckHeight, `bridge_deck_${index}`);
      tileSprite.setDepth(5 + index * 10);
      tileSprite.setOrigin(0.5, 0);
      this.bridgeDecks.push(tileSprite);
    });

    // 5. Particle System for dust/speed
    const dashParticles = this.add.particles(0, 0, 'dust', {
      speed: { min: 20, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 400,
      gravityY: -50,
      frequency: 50,
      blendMode: 'ADD',
      follow: this.player
    });
    this.particles = dashParticles;
    this.particles.stop();

    // 6. Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // 7. Player
    this.createPlayer();
    
    // 8. Inputs
    this.setupInputs();

    this.onUpdateLives(this.lives);
    this.requestNewSegment();

    // Collisions
    this.physics.add.overlap(this.player, this.obstacles, this.handleCollision, undefined, this);
    this.physics.add.overlap(this.player, this.cookies, this.collectCookie, undefined, this);
  }

  private createDistantBridge() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x0ea5e9, 0.2);
    g.fillRect(0, 0, 400, 100);
    g.lineStyle(2, 0x0ea5e9, 0.3);
    g.lineBetween(0, 20, 400, 20);
    for (let i = 0; i < 400; i += 40) {
      g.lineBetween(i, 20, i + 20, 0);
      g.lineBetween(i + 20, 0, i + 40, 20);
    }
    g.generateTexture('distant_bridge', 400, 100);
    this.distantBridge = this.add.tileSprite(400, 250, 800, 100, 'distant_bridge');
    this.distantBridge.setAlpha(0.4);
  }

  private createBridgeTextures() {
    // Basic dust particle texture
    const p = this.make.graphics({ x: 0, y: 0, add: false });
    p.fillStyle(0xffffff, 1);
    p.fillCircle(4, 4, 4);
    p.generateTexture('dust', 8, 8);

    this.laneScales.forEach((scale, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const width = 200;
      const height = 80 * scale;
      
      // Main Deck
      g.fillStyle(0x334155, 1);
      g.fillRect(0, 0, width, height);
      
      // Top Railing
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, width, 6 * scale);
      
      // Perspective/Depth line
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, height - (4 * scale), width, 4 * scale);
      
      // Grid lines
      g.lineStyle(2 * scale, 0x64748b, 0.4);
      for (let i = 0; i < width; i += 40) {
        g.lineBetween(i, 0, i, height);
      }
      
      g.generateTexture(`bridge_deck_${index}`, width, height);
    });
  }

  private createCloud(x: number, y: number) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, 0, 25);
    g.fillCircle(20, -10, 20);
    g.fillCircle(20, 10, 20);
    g.fillCircle(40, 0, 25);
    container.add(g);
    container.setData('speed', Phaser.Math.Between(2, 6) * 0.05);
    this.clouds.add(container);
  }

  private createPlayer() {
    this.player = this.add.container(150, this.laneYPositions[this.currentLane]);
    this.player.setDepth(50);
    
    // Character parts
    const skinColor = 0xffdbac;
    const shirtColor = 0x0ea5e9;
    const pantsColor = 0x334155;
    
    const head = this.add.arc(0, -65, 12, 0, 360, false, skinColor);
    const torso = this.add.rectangle(0, -35, 24, 35, shirtColor);
    const lArm = this.add.rectangle(-15, -40, 8, 22, shirtColor);
    const rArm = this.add.rectangle(15, -40, 8, 22, shirtColor);
    const lLeg = this.add.rectangle(-6, -10, 10, 25, pantsColor);
    const rLeg = this.add.rectangle(6, -10, 10, 25, pantsColor);

    // Eyes
    const lEye = this.add.circle(4, -68, 2, 0x333333);
    const rEye = this.add.circle(8, -68, 2, 0x333333);
    
    this.player.add([lLeg, rLeg, lArm, rArm, torso, head, lEye, rEye]);
    this.player.setScale(this.laneScales[this.currentLane]);

    // Running Tweens
    this.tweens.add({
      targets: lLeg,
      angle: { from: -35, to: 35 },
      duration: 250,
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: rLeg,
      angle: { from: 35, to: -35 },
      duration: 250,
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: lArm,
      angle: { from: 45, to: -45 },
      duration: 250,
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: rArm,
      angle: { from: -45, to: 45 },
      duration: 250,
      yoyo: true,
      repeat: -1
    });

    this.physics.add.existing(this.player);
    const bodyPhys = this.player.body as Phaser.Physics.Arcade.Body;
    bodyPhys.setSize(30, 80);
    bodyPhys.setOffset(-15, -80);
  }

  private setupInputs() {
    if (!this.input.keyboard) return;
    this.upKey = this.input.keyboard.addKey('UP');
    this.downKey = this.input.keyboard.addKey('DOWN');
    this.leftKey = this.input.keyboard.addKey('LEFT');
    this.rightKey = this.input.keyboard.addKey('RIGHT');

    this.upKey.on('down', () => this.moveLane(-1));
    this.downKey.on('down', () => this.moveLane(1));
    this.leftKey.on('down', () => this.slide());
    this.rightKey.on('down', () => this.slide());
  }

  update(time: number, delta: number) {
    if (!this.isGameActive || !this.player.active) {
      this.particles.stop();
      return;
    }

    this.particles.start();

    // Parallax
    this.distantBridge.tilePositionX += this.speed * 0.1;
    this.clouds.children.iterate((cloud: any) => {
      cloud.x -= cloud.getData('speed') * delta * 0.1;
      if (cloud.x < -100) cloud.x = 900;
      return true;
    });
    
    this.bridgeDecks.forEach((deck, index) => {
      deck.tilePositionX += this.speed * 0.8 * this.laneScales[index];
    });

    this.distance += this.speed * 0.04;
    this.score = Math.floor(this.distance) + (this.cookiesCollected * 50);

    if (Math.floor(this.distance) % 1500 === 0) {
      this.speed += 0.15;
    }

    const moveStep = this.speed * 0.1 * delta;
    this.obstacles.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= moveStep * this.laneScales[lane];
        if (child.x < -200) child.destroy();
      }
      return true;
    });

    this.cookies.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= moveStep * this.laneScales[lane];
        if (child.x < -200) child.destroy();
      }
      return true;
    });

    if (this.distance - this.lastObstacleDistance > (this.segmentLength / 2) && !this.isGenerating) {
      this.requestNewSegment();
    }
  }

  private moveLane(dir: number) {
    if (!this.isGameActive) return;
    const targetLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
    if (targetLane === this.currentLane) return;

    this.currentLane = targetLane;
    this.tweens.add({
      targets: this.player,
      y: this.laneYPositions[this.currentLane],
      scale: this.laneScales[this.currentLane],
      duration: 180,
      ease: 'Back.out',
      onComplete: () => {
        this.player.setDepth(15 + this.currentLane * 10);
      }
    });
  }

  private slide() {
    if (!this.isGameActive || this.player.getData('sliding')) return;
    this.player.setData('sliding', true);
    
    this.tweens.add({
      targets: this.player,
      scaleY: this.player.scaleY * 0.4,
      y: this.player.y + 25,
      duration: 450,
      yoyo: true,
      ease: 'Cubic.out',
      onComplete: () => {
        this.player.setData('sliding', false);
        this.player.scaleY = this.laneScales[this.currentLane];
        this.player.y = this.laneYPositions[this.currentLane];
      }
    });
  }

  private async requestNewSegment() {
    this.isGenerating = true;
    this.lastObstacleDistance = this.distance;
    try {
      const data = await generateObstacleSequence({
        playerSpeed: this.speed,
        currentScore: this.score,
        segmentLength: this.segmentLength
      });
      if (data?.obstacles?.length > 0) {
        this.placeObstacles(data.obstacles);
      } else {
        this.generateFallbackSegment();
      }
    } catch (e) {
      this.generateFallbackSegment();
    } finally {
      this.isGenerating = false;
    }
  }

  private generateFallbackSegment() {
    const types: any[] = ['vehicle', 'pet', 'person', 'waterPuddle'];
    const obstacles = [];
    for (let i = 0; i < 4; i++) {
      obstacles.push({
        type: types[Math.floor(Math.random() * types.length)],
        lane: Math.floor(Math.random() * 3).toString(),
        distanceFromStart: i * 500 + Math.random() * 200
      });
    }
    this.placeObstacles(obstacles);
  }

  private placeObstacles(obstacleData: any[]) {
    obstacleData.forEach(obs => {
      const laneIdx = parseInt(obs.lane);
      const spawnX = 1000 + obs.distanceFromStart;
      const spawnY = this.laneYPositions[laneIdx] + 15;
      
      const container = this.add.container(spawnX, spawnY);
      const g = this.add.graphics();
      
      if (obs.type === 'vehicle') {
        g.fillStyle(0x334155, 1);
        g.fillRoundedRect(-50, -40, 100, 50, 8);
        g.fillStyle(0x475569, 1);
        g.fillRoundedRect(-50, -35, 100, 20, 2);
        g.fillStyle(0x000000, 1);
        g.fillCircle(-30, 10, 12);
        g.fillCircle(30, 10, 12);
      } else if (obs.type === 'pet') {
        g.fillStyle(0x92400e, 1);
        g.fillEllipse(0, -10, 24, 16);
        g.fillCircle(12, -20, 10);
        g.fillStyle(0x000000, 1);
        g.fillCircle(14, -22, 2);
      } else if (obs.type === 'waterPuddle') {
        g.fillStyle(0x38bdf8, 0.5);
        g.fillEllipse(0, 5, 60, 18);
        g.lineStyle(2, 0xffffff, 0.3);
        g.strokeEllipse(0, 5, 60, 18);
      } else {
        // Person
        g.fillStyle(0x1e293b, 1);
        g.fillRect(-12, -60, 24, 45);
        g.fillStyle(0xffdbac, 1);
        g.fillCircle(0, -70, 12);
      }
      
      container.add(g);
      container.setData('lane', laneIdx);
      container.setData('type', obs.type);
      container.setDepth(14 + laneIdx * 10);
      container.setScale(this.laneScales[laneIdx]);
      
      this.physics.add.existing(container);
      this.obstacles.add(container);
      
      const body = container.body as Phaser.Physics.Arcade.Body;
      body.setSize(70, 70);
      body.setOffset(-35, -70);

      if (Math.random() > 0.4) {
        this.createCookie(spawnX + 150, this.laneYPositions[laneIdx] - 50, laneIdx);
      }
    });
  }

  private createCookie(x: number, y: number, lane: number) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    // Cookie Glow
    g.fillStyle(0xf59e0b, 0.3);
    g.fillCircle(0, 0, 22);
    // Cookie Base
    g.fillStyle(0xd97706, 1);
    g.fillCircle(0, 0, 16);
    // Chips
    g.fillStyle(0x451a03, 1);
    g.fillCircle(-6, -4, 4);
    g.fillCircle(4, 5, 3);
    g.fillCircle(5, -6, 2);
    
    container.add(g);
    container.setData('lane', lane);
    container.setDepth(20 + lane * 10);
    container.setScale(this.laneScales[lane]);
    
    this.physics.add.existing(container);
    this.cookies.add(container);
    
    this.tweens.add({
      targets: container,
      y: y - 10,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private handleCollision(player: any, obstacle: any) {
    if (this.isInvulnerable || !this.isGameActive) return;

    const obstacleLane = obstacle.getData('lane');
    if (obstacleLane !== this.currentLane) return;

    const type = obstacle.getData('type');
    if (this.player.getData('sliding') && (type === 'pet' || type === 'waterPuddle')) return;
    
    obstacle.destroy();
    this.lives--;
    this.onUpdateLives(this.lives);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.triggerHitEffect();
    }
  }

  private triggerHitEffect() {
    this.isInvulnerable = true;
    const oldSpeed = this.speed;
    this.speed = Math.max(5, this.speed * 0.4);

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 120,
      yoyo: true,
      repeat: 8,
      onComplete: () => {
        this.player.alpha = 1;
        this.isInvulnerable = false;
        this.tweens.addCounter({
          from: this.speed,
          to: oldSpeed,
          duration: 1200,
          onUpdate: (tw) => { this.speed = tw.getValue(); }
        });
      }
    });
  }

  private collectCookie(player: any, cookie: any) {
    if (!this.isGameActive) return;
    const lane = cookie.getData('lane');
    if (lane !== this.currentLane) return;

    this.cookiesCollected++;
    cookie.destroy();
    
    this.tweens.add({
      targets: this.player,
      scale: this.laneScales[this.currentLane] * 1.3,
      duration: 80,
      yoyo: true
    });
  }

  private gameOver() {
    this.isGameActive = false;
    this.physics.pause();
    this.onGameOver(this.score, this.cookiesCollected);
  }

  public pauseGame() { 
    this.isGameActive = false;
    this.physics.pause();
  }
  
  public resumeGame() { 
    this.isGameActive = true;
    this.physics.resume();
  }
  
  public restart() { 
    this.scene.restart(); 
  }
}
