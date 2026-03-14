import * as Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private currentLane: number = 1;
  private laneYPositions: number[] = [300, 420, 540];
  private laneScales: number[] = [0.7, 1.0, 1.3];
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private speed: number = 10;
  
  private clouds!: Phaser.GameObjects.Group;
  private bridgeDecks: Phaser.GameObjects.TileSprite[] = [];
  
  private obstacles!: Phaser.Physics.Arcade.Group;
  private cookies!: Phaser.Physics.Arcade.Group;
  
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
  private wKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private aKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;

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
    this.speed = 10;
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

    // 1. Blue Sky Gradient Background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x00BFFF, 0x00BFFF, 1);
    sky.fillRect(0, 0, width, height);

    // 2. Animated Clouds
    this.clouds = this.add.group();
    for (let i = 0; i < 6; i++) {
      this.createCloud(Phaser.Math.Between(0, width), Phaser.Math.Between(50, 200));
    }

    // 3. Create Bridge Deck Textures & TileSprites
    this.createBridgeTextures();
    this.laneYPositions.forEach((y, index) => {
      const deckWidth = width;
      const deckHeight = 60 * this.laneScales[index];
      const tileSprite = this.add.tileSprite(width / 2, y + deckHeight / 2, width, deckHeight, `bridge_deck_${index}`);
      tileSprite.setDepth(5 + index * 10);
      this.bridgeDecks.push(tileSprite);
    });

    // 4. Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // 5. Animated Runner
    this.createPlayer();
    
    // 6. Inputs
    this.setupInputs();

    // Stats Initialization
    this.onUpdateLives(this.lives);
    this.requestNewSegment();

    // Collisions
    this.physics.add.overlap(this.player, this.obstacles, this.handleCollision, undefined, this);
    this.physics.add.overlap(this.player, this.cookies, this.collectCookie, undefined, this);
  }

  private createBridgeTextures() {
    this.laneScales.forEach((scale, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const width = 200;
      const height = 60 * scale;
      
      g.fillStyle(0x333333, 1);
      g.fillRect(0, 0, width, height);
      
      g.lineStyle(4 * scale, 0xdddddd, 1);
      g.lineBetween(0, 0, width, 0);
      g.lineBetween(0, height, width, height);
      
      g.lineStyle(2 * scale, 0xffffff, 0.2);
      for (let i = 0; i < width; i += 50) {
        g.lineBetween(i, 0, i, height);
      }

      g.generateTexture(`bridge_deck_${index}`, width, height);
    });
  }

  private createCloud(x: number, y: number) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(0, 0, 30);
    g.fillCircle(25, -10, 25);
    g.fillCircle(25, 10, 25);
    g.fillCircle(50, 0, 30);
    container.add(g);
    container.setData('speed', Phaser.Math.Between(1, 3) * 0.1);
    this.clouds.add(container);
  }

  private createPlayer() {
    const x = 150;
    const y = this.laneYPositions[this.currentLane];
    const scale = this.laneScales[this.currentLane];

    this.player = this.add.container(x, y);
    this.player.setDepth(50);
    
    const body = this.add.rectangle(0, -30, 20, 40, 0xDC634A);
    const head = this.add.arc(0, -60, 10, 0, 360, false, 0xffdbac);
    const lLeg = this.add.rectangle(-5, -10, 8, 20, 0x333333);
    const rLeg = this.add.rectangle(5, -10, 8, 20, 0x333333);
    const lArm = this.add.rectangle(-12, -35, 6, 25, 0xDC634A);
    const rArm = this.add.rectangle(12, -35, 6, 25, 0xDC634A);
    
    this.player.add([lLeg, rLeg, lArm, rArm, body, head]);
    this.player.setScale(scale);

    this.tweens.add({
      targets: lLeg,
      angle: { from: -30, to: 30 },
      duration: 200,
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: rLeg,
      angle: { from: 30, to: -30 },
      duration: 200,
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: lArm,
      angle: { from: 30, to: -30 },
      duration: 200,
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: rArm,
      angle: { from: -30, to: 30 },
      duration: 200,
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

    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.upKey.on('down', () => this.moveLane(-1));
    this.wKey.on('down', () => this.moveLane(-1));
    this.downKey.on('down', () => this.moveLane(1));
    this.sKey.on('down', () => this.moveLane(1));
    
    // Sliding logic
    const startSlide = () => this.slide();
    this.leftKey.on('down', startSlide);
    this.rightKey.on('down', startSlide);
    this.aKey.on('down', startSlide);
    this.dKey.on('down', startSlide);
  }

  update(time: number, delta: number) {
    if (!this.isGameActive || !this.player.active) return;

    this.clouds.children.iterate((cloud: any) => {
      cloud.x -= cloud.getData('speed') * delta * 0.1;
      if (cloud.x < -100) cloud.x = this.scale.width + 100;
      return true;
    });
    
    const scrollBase = this.speed * 0.5 * delta * 0.1;
    this.bridgeDecks.forEach((deck, index) => {
      deck.tilePositionX += scrollBase * this.laneScales[index];
    });

    this.distance += this.speed * 0.05;
    this.score = Math.floor(this.distance) + (this.cookiesCollected * 100);

    if (this.distance > 0 && Math.floor(this.distance) % 2500 === 0) {
      this.speed += 0.2;
    }

    const moveFactor = this.speed * 0.06 * delta;
    this.obstacles.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= moveFactor * this.laneScales[lane];
        if (child.x < -200) child.destroy();
      }
      return true;
    });

    this.cookies.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= moveFactor * this.laneScales[lane];
        if (child.x < -200) child.destroy();
      }
      return true;
    });

    if (this.distance - this.lastObstacleDistance > this.segmentLength && !this.isGenerating) {
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
      duration: 150,
      ease: 'Quad.out',
      onComplete: () => {
        this.player.setDepth(15 + this.currentLane * 10);
      }
    });
  }

  private slide() {
    if (!this.isGameActive || this.player.getData('sliding')) return;
    this.player.setData('sliding', true);
    
    const originalScaleY = this.player.scaleY;
    
    this.tweens.add({
      targets: this.player,
      scaleY: originalScaleY * 0.5,
      y: this.player.y + 20,
      duration: 400,
      yoyo: true,
      ease: 'Cubic.out',
      onComplete: () => {
        this.player.setData('sliding', false);
        this.player.scaleY = originalScaleY;
        this.player.y = this.laneYPositions[this.currentLane];
      }
    });
  }

  private async requestNewSegment() {
    this.isGenerating = true;
    try {
      const data = await generateObstacleSequence({
        playerSpeed: this.speed,
        currentScore: this.score,
        segmentLength: this.segmentLength
      });

      this.lastObstacleDistance = this.distance;
      this.placeObstacles(data.obstacles);
    } catch (e) {
      // Fallback
    } finally {
      this.isGenerating = false;
    }
  }

  private placeObstacles(obstacleData: any[]) {
    obstacleData.forEach(obs => {
      const laneIndex = parseInt(obs.lane);
      const spawnX = this.scale.width + obs.distanceFromStart + 200;
      const spawnY = this.laneYPositions[laneIndex] + 20;
      
      const container = this.add.container(spawnX, spawnY);
      const g = this.add.graphics();
      
      if (obs.type === 'vehicle') {
        g.fillStyle(0x3498db, 1);
        g.fillRoundedRect(-40, -30, 80, 40, 5);
        g.fillStyle(0x2c3e50, 1);
        g.fillCircle(-25, 10, 10);
        g.fillCircle(25, 10, 10);
      } else if (obs.type === 'pet') {
        g.fillStyle(0xe67e22, 1);
        g.fillEllipse(0, -10, 30, 20);
        g.fillCircle(15, -20, 10);
      } else if (obs.type === 'waterPuddle') {
        g.fillStyle(0x3498db, 0.6);
        g.fillEllipse(0, 0, 50, 15);
        g.lineStyle(2, 0xffffff, 0.4);
        g.strokeEllipse(0, 0, 50, 15);
      } else {
        // Person
        g.fillStyle(0x95a5a6, 1);
        g.fillRect(-10, -50, 20, 40);
        g.fillCircle(0, -60, 10);
      }
      
      container.add(g);
      this.obstacles.add(container);
      container.setData('lane', laneIndex);
      container.setData('type', obs.type);
      container.setDepth(14 + laneIndex * 10);
      container.setScale(this.laneScales[laneIndex]);
      
      const body = container.body as Phaser.Physics.Arcade.Body;
      body.setSize(60, 60);
      body.setOffset(-30, -60);

      if (Math.random() > 0.4) {
        this.createCookie(spawnX + 150, this.laneYPositions[laneIndex] - 40, laneIndex);
      }
    });
  }

  private createCookie(x: number, y: number, lane: number) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xF39C12, 1);
    g.fillCircle(0, 0, 15);
    g.fillStyle(0x603813, 1);
    g.fillCircle(-5, -5, 3);
    g.fillCircle(5, 5, 3);
    
    container.add(g);
    this.cookies.add(container);
    container.setData('lane', lane);
    container.setDepth(20 + lane * 10);
    container.setScale(this.laneScales[lane]);
    
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 30);
    body.setOffset(-15, -15);
  }

  private handleCollision(player: any, obstacle: any) {
    if (this.isInvulnerable || !this.isGameActive) return;

    const obstacleLane = obstacle.getData('lane');
    if (obstacleLane !== this.currentLane) return;

    const type = obstacle.getData('type');
    const isSliding = this.player.getData('sliding');
    
    // Some obstacles can be escaped by sliding
    if (isSliding && (type === 'pet' || type === 'waterPuddle')) return;
    
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
    const prevSpeed = this.speed;
    this.speed = Math.max(4, this.speed * 0.4);

    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 10,
      onComplete: () => {
        this.player.alpha = 1;
        this.isInvulnerable = false;
        this.tweens.addCounter({
          from: this.speed,
          to: prevSpeed,
          duration: 1000,
          onUpdate: (tween) => { this.speed = tween.getValue(); }
        });
      }
    });
  }

  private collectCookie(player: any, cookie: any) {
    if (!this.isGameActive) return;
    const cookieLane = cookie.getData('lane');
    if (cookieLane !== this.currentLane) return;

    this.cookiesCollected++;
    cookie.destroy();
    
    this.tweens.add({
      targets: this.player,
      scaleX: this.laneScales[this.currentLane] * 1.2,
      duration: 100,
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