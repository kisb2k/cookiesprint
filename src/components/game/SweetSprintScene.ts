import * as Phaser from 'phaser';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private currentLane: number = 1;
  private laneYPositions: number[] = [280, 410, 540];
  private laneScales: number[] = [0.6, 1.0, 1.6];
  private laneSpeedMultipliers: number[] = [0.6, 1.0, 1.8];
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private baseSpeed: number = 8; 
  
  private clouds!: Phaser.GameObjects.Group;
  private bridgeDecks: Phaser.GameObjects.TileSprite[] = [];
  private distantBridge!: Phaser.GameObjects.TileSprite;
  
  private obstacles!: Phaser.Physics.Arcade.Group;
  private cookies!: Phaser.Physics.Arcade.Group;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  private lastSpawnDistance: number = 0;
  private spawnInterval: number = 250; 

  private lives: number = 2;
  private isInvulnerable: boolean = false;
  private isGameActive: boolean = false;

  private onGameOver: (score: number, cookies: number) => void;
  private onUpdateLives: (lives: number) => void;
  private onUpdateScore: (score: number) => void;
  private onUpdateCookies: (cookies: number) => void;

  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  constructor(
    onGameOver: (score: number, cookies: number) => void,
    onUpdateLives: (lives: number) => void,
    onUpdateScore: (score: number) => void,
    onUpdateCookies: (cookies: number) => void
  ) {
    super('SweetSprintScene');
    this.onGameOver = onGameOver;
    this.onUpdateLives = onUpdateLives;
    this.onUpdateScore = onUpdateScore;
    this.onUpdateCookies = onUpdateCookies;
  }

  init() {
    this.score = 0;
    this.distance = 0;
    this.cookiesCollected = 0;
    this.baseSpeed = 8;
    this.currentLane = 1;
    this.lives = 2;
    this.isInvulnerable = false;
    this.lastSpawnDistance = 0;
    this.isGameActive = false;
    this.bridgeDecks = [];
  }

  create() {
    const { width, height } = this.scale;

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0xbae6fd, 0xbae6fd, 1);
    sky.fillRect(0, 0, width, height);

    this.createDistantBridge();

    this.clouds = this.add.group();
    for (let i = 0; i < 8; i++) {
      this.createCloud(Phaser.Math.Between(0, width), Phaser.Math.Between(30, 120));
    }

    this.createBridgeTextures();
    this.laneYPositions.forEach((y, index) => {
      const deckHeight = Math.round(160 * this.laneScales[index]); 
      const tileSprite = this.add.tileSprite(width / 2, y, width, deckHeight, `bridge_deck_${index}`);
      tileSprite.setDepth(10 + index * 10);
      tileSprite.setOrigin(0.5, 0.4);
      this.bridgeDecks.push(tileSprite);
    });

    this.particles = this.add.particles(0, 0, 'dust', {
      speed: { min: 20, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 400,
      gravityY: -50,
      frequency: 50,
      blendMode: 'ADD'
    });
    this.particles.stop();

    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    this.createPlayer();
    this.setupInputs();

    this.onUpdateLives(this.lives);
    this.onUpdateScore(0);
    this.onUpdateCookies(0);

    this.spawnObstacleSet();

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
    this.distantBridge = this.add.tileSprite(400, 180, 800, 100, 'distant_bridge');
    this.distantBridge.setAlpha(0.4);
    this.distantBridge.setDepth(5);
  }

  private createBridgeTextures() {
    const p = this.make.graphics({ x: 0, y: 0, add: false });
    p.fillStyle(0xffffff, 1);
    p.fillCircle(4, 4, 4);
    p.generateTexture('dust', 8, 8);

    this.laneScales.forEach((scale, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const textureWidth = 200;
      const textureHeight = Math.round(160 * scale);
      
      g.fillStyle(0x334155, 1);
      g.fillRect(0, 0, textureWidth, textureHeight);
      
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, textureWidth, Math.round(12 * scale));
      
      g.fillStyle(0x475569, 0.5);
      g.fillRect(0, textureHeight / 2 - Math.round(2 * scale), textureWidth, Math.round(4 * scale));
      
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, textureHeight - Math.round(10 * scale), textureWidth, Math.round(10 * scale));
      
      g.lineStyle(Math.round(3 * scale), 0x64748b, 0.4);
      for (let i = 0; i < textureWidth; i += 50) {
        g.lineBetween(i, 0, i, textureHeight);
      }
      
      g.generateTexture(`bridge_deck_${index}`, textureWidth, textureHeight);
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
    container.setDepth(2);
    this.clouds.add(container);
  }

  private createPlayer() {
    this.player = this.add.container(150, this.laneYPositions[this.currentLane]);
    this.player.setDepth(15 + this.currentLane * 10);
    const skinColor = 0xffdbac;
    const shirtColor = 0x0ea5e9;
    const pantsColor = 0x334155;
    
    const head = this.add.arc(0, -65, 12, 0, 360, false, skinColor);
    const torso = this.add.rectangle(0, -35, 24, 35, shirtColor);
    const lArm = this.add.rectangle(-15, -40, 8, 22, shirtColor);
    const rArm = this.add.rectangle(15, -40, 8, 22, shirtColor);
    const lLeg = this.add.rectangle(-6, -10, 10, 25, pantsColor);
    const rLeg = this.add.rectangle(6, -10, 10, 25, pantsColor);
    const lEye = this.add.circle(4, -68, 2, 0x333333);
    const rEye = this.add.circle(8, -68, 2, 0x333333);
    this.player.add([lLeg, rLeg, lArm, rArm, torso, head, lEye, rEye]);
    this.player.setScale(this.laneScales[this.currentLane]);

    this.tweens.add({ targets: lLeg, angle: { from: -35, to: 35 }, duration: 250, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: rLeg, angle: { from: 35, to: -35 }, duration: 250, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: lArm, angle: { from: 45, to: -45 }, duration: 250, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: rArm, angle: { from: -45, to: 45 }, duration: 250, yoyo: true, repeat: -1 });

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

    this.upKey.on('down', () => {
      if (this.currentLane === 0) {
        this.jump();
      } else {
        this.moveLane(-1);
      }
    });
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
    this.particles.follow = this.player;

    this.distantBridge.tilePositionX += this.baseSpeed * 0.1 * delta * 0.05;
    this.clouds.children.iterate((cloud: any) => {
      cloud.x -= cloud.getData('speed') * delta * 0.1;
      if (cloud.x < -100) cloud.x = 900;
      return true;
    });
    
    this.bridgeDecks.forEach((deck, index) => {
      deck.tilePositionX += this.baseSpeed * 0.05 * delta * this.laneSpeedMultipliers[index];
    });

    this.distance += (this.baseSpeed * 0.005 * delta * this.laneSpeedMultipliers[this.currentLane]);
    if (Math.floor(this.distance) !== this.score) {
      this.score = Math.floor(this.distance);
      this.onUpdateScore(this.score);
    }

    if (this.score > 0 && this.score % 500 === 0) {
      this.baseSpeed += 0.01;
    }

    this.obstacles.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= (this.baseSpeed * 0.05 * delta) * this.laneSpeedMultipliers[lane];
        if (child.x < -300) child.destroy();
      }
      return true;
    });

    this.cookies.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= (this.baseSpeed * 0.05 * delta) * this.laneSpeedMultipliers[lane];
        if (child.x < -300) child.destroy();
      }
      return true;
    });

    const activeObstacles = this.obstacles.countActive();
    if (activeObstacles === 0 || (this.distance - this.lastSpawnDistance > this.spawnInterval)) {
      this.spawnObstacleSet();
      this.lastSpawnDistance = this.distance;
      this.spawnInterval = Math.max(120, 280 - (this.distance / 150));
    }
  }

  private moveLane(dir: number) {
    if (!this.isGameActive || this.player.getData('jumping')) return;
    const targetLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
    if (targetLane === this.currentLane) return;

    this.currentLane = targetLane;
    this.tweens.add({
      targets: this.player,
      y: this.laneYPositions[this.currentLane],
      scale: this.laneScales[this.currentLane],
      duration: 200,
      ease: 'Quad.out',
      onComplete: () => {
        this.player.setDepth(15 + this.currentLane * 10);
      }
    });
  }

  private jump() {
    if (!this.isGameActive || this.player.getData('jumping')) return;
    this.player.setData('jumping', true);
    
    this.tweens.add({
      targets: this.player,
      y: this.player.y - 120,
      duration: 400,
      ease: 'Cubic.out',
      yoyo: true,
      onComplete: () => {
        this.player.setData('jumping', false);
        this.player.y = this.laneYPositions[this.currentLane];
      }
    });
  }

  private slide() {
    if (!this.isGameActive || this.player.getData('sliding') || this.player.getData('jumping')) return;
    this.player.setData('sliding', true);
    this.tweens.add({
      targets: this.player,
      scaleY: this.laneScales[this.currentLane] * 0.4,
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

  private spawnObstacleSet() {
    const obstacleCount = Math.min(3, 1 + Math.floor(this.distance / 1200));
    const usedLanes = new Set<number>();

    for (let i = 0; i < obstacleCount; i++) {
      let lane = Phaser.Math.Between(0, 2);
      if (!usedLanes.has(lane)) {
        usedLanes.add(lane);
        const type = ['vehicle', 'pet', 'person', 'waterPuddle'][Phaser.Math.Between(0, 3)];
        this.createObstacle(lane, type, 900 + (i * 350));
      }
    }

    const cookieCount = Phaser.Math.Between(1, 2);
    for (let j = 0; j < cookieCount; j++) {
      let cookieLane = Phaser.Math.Between(0, 2);
      this.createCookie(900 + Phaser.Math.Between(100, 600), this.laneYPositions[cookieLane] - 40, cookieLane);
    }
  }

  private createObstacle(laneIdx: number, type: string, x: number) {
    const spawnY = this.laneYPositions[laneIdx] + 10;
    const container = this.add.container(x, spawnY);
    const g = this.add.graphics();
    
    if (type === 'vehicle') {
      g.fillStyle(0x334155, 1);
      g.fillRoundedRect(-50, -40, 100, 50, 8);
      g.fillStyle(0x475569, 1);
      g.fillRoundedRect(-50, -35, 100, 20, 2);
      g.fillStyle(0x000000, 1);
      g.fillCircle(-30, 10, 12);
      g.fillCircle(30, 10, 12);
    } else if (type === 'pet') {
      g.fillStyle(0x92400e, 1);
      g.fillEllipse(0, -10, 24, 16);
      g.fillCircle(12, -20, 10);
      g.fillStyle(0x000000, 1);
      g.fillCircle(14, -22, 2);
    } else if (type === 'waterPuddle') {
      g.fillStyle(0x38bdf8, 0.5);
      g.fillEllipse(0, 5, 60, 18);
      g.lineStyle(2, 0xffffff, 0.3);
      g.strokeEllipse(0, 5, 60, 18);
    } else {
      g.fillStyle(0x1e293b, 1);
      g.fillRect(-12, -60, 24, 45);
      g.fillStyle(0xffdbac, 1);
      g.fillCircle(0, -70, 12);
    }
    
    container.add(g);
    container.setData('lane', laneIdx);
    container.setData('type', type);
    container.setDepth(14 + laneIdx * 10);
    container.setScale(this.laneScales[laneIdx]);
    
    this.physics.add.existing(container);
    this.obstacles.add(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(70, 70);
    body.setOffset(-35, -70);
  }

  private createCookie(x: number, y: number, lane: number) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xf59e0b, 0.3);
    g.fillCircle(0, 0, 22);
    g.fillStyle(0xd97706, 1);
    g.fillCircle(0, 0, 16);
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
    if (this.player.getData('jumping') && (type === 'waterPuddle' || type === 'pet')) return;
    
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
    const oldSpeed = this.baseSpeed;
    this.baseSpeed = Math.max(4, this.baseSpeed * 0.4);

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
          from: this.baseSpeed,
          to: oldSpeed,
          duration: 1200,
          onUpdate: (tw) => { this.baseSpeed = tw.getValue(); }
        });
      }
    });
  }

  private collectCookie(player: any, cookie: any) {
    if (!this.isGameActive) return;
    const lane = cookie.getData('lane');
    if (lane !== this.currentLane) return;

    this.cookiesCollected++;
    this.onUpdateCookies(this.cookiesCollected);
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