import * as Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerParts: { body: Phaser.GameObjects.Rectangle, head: Phaser.GameObjects.Arc, lLeg: Phaser.GameObjects.Rectangle, rLeg: Phaser.GameObjects.Rectangle } = {} as any;
  
  private currentLane: number = 1;
  private laneYPositions: number[] = [300, 420, 540];
  private laneScales: number[] = [0.7, 1.0, 1.3];
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private speed: number = 10;
  
  private clouds!: Phaser.GameObjects.Group;
  private bridgeDecks!: Phaser.GameObjects.Graphics[];
  
  private obstacles!: Phaser.Physics.Arcade.Group;
  private cookies!: Phaser.Physics.Arcade.Group;
  
  private lastObstacleDistance: number = 0;
  private segmentLength: number = 2000;
  private isGenerating: boolean = false;

  private lives: number = 2;
  private isInvulnerable: boolean = false;
  private startPaused: boolean = true;

  private onGameOver: (score: number, cookies: number) => void;
  private onUpdateLives: (lives: number) => void;

  constructor(
    onGameOver: (score: number, cookies: number) => void,
    onUpdateLives: (lives: number) => void
  ) {
    super('SweetSprintScene');
    this.onGameOver = onGameOver;
    this.onUpdateLives = onUpdateLives;
  }

  init(data?: { startPaused?: boolean }) {
    this.score = 0;
    this.distance = 0;
    this.cookiesCollected = 0;
    this.speed = 10;
    this.currentLane = 1;
    this.lives = 2;
    this.isInvulnerable = false;
    this.lastObstacleDistance = 0;
    this.isGenerating = false;
    this.startPaused = data?.startPaused ?? true;
  }

  preload() {
    // No external image assets needed - we draw everything!
  }

  create() {
    const { width, height } = this.scale;

    // 1. Blue Sky Background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x00BFFF, 0x00BFFF, 1);
    sky.fillRect(0, 0, width, height);

    // 2. Animated Clouds
    this.clouds = this.add.group();
    for (let i = 0; i < 6; i++) {
      this.createCloud(Phaser.Math.Between(0, width), Phaser.Math.Between(50, 200));
    }

    // 3. Bridge Levels
    this.bridgeDecks = [];
    this.laneYPositions.forEach((y, index) => {
      const g = this.add.graphics();
      this.drawBridgeDeck(g, y, index);
      this.bridgeDecks.push(g);
    });

    // 4. Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // 5. Animated Runner (Procedural)
    this.createPlayer();
    
    // 6. Inputs
    this.setupInputs();

    // Stats Initialization
    this.onUpdateLives(this.lives);
    this.requestNewSegment();

    // Collisions
    this.physics.add.overlap(this.player, this.obstacles, this.handleCollision, undefined, this);
    this.physics.add.overlap(this.player, this.cookies, this.collectCookie, undefined, this);

    if (this.startPaused) {
      this.scene.pause();
    }
  }

  private drawBridgeDeck(g: Phaser.Graphics, y: number, index: number) {
    const width = this.scale.width;
    const depth = 60 * this.laneScales[index];
    
    g.clear();
    // Deck floor
    g.fillStyle(0x333333, 1);
    g.fillRect(0, y, width, depth);
    
    // Railings
    g.lineStyle(4 * this.laneScales[index], 0xdddddd, 1);
    g.lineBetween(0, y, width, y);
    g.lineBetween(0, y + depth, width, y + depth);
    
    // Details (lines)
    g.lineStyle(2, 0xffffff, 0.3);
    for (let i = 0; i < width; i += 100) {
      g.lineBetween(i, y, i, y + depth);
    }
    
    g.setDepth(5 + index * 10);
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
    
    // Body Parts
    const body = this.add.rectangle(0, -30, 20, 40, 0xDC634A);
    const head = this.add.arc(0, -60, 10, 0, 360, false, 0xffdbac);
    const lLeg = this.add.rectangle(-5, -10, 8, 20, 0x333333);
    const rLeg = this.add.rectangle(5, -10, 8, 20, 0x333333);
    
    this.player.add([lLeg, rLeg, body, head]);
    this.playerParts = { body, head, lLeg, rLeg };
    this.player.setScale(scale);

    // Running Animation Loop
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
      targets: this.player,
      y: y - 5,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add invisible physics body
    this.physics.add.existing(this.player);
    const bodyPhys = this.player.body as Phaser.Physics.Arcade.Body;
    bodyPhys.setSize(30, 80);
    bodyPhys.setOffset(-15, -80);
  }

  private setupInputs() {
    this.input.keyboard?.on('keydown-UP', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-W', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-S', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.jump());
    this.input.keyboard?.on('keydown-SHIFT', () => this.slide());
  }

  update(time: number, delta: number) {
    if (!this.player.active) return;

    // Move Clouds
    this.clouds.children.iterate((cloud: any) => {
      cloud.x -= cloud.getData('speed') * delta * 0.1;
      if (cloud.x < -100) cloud.x = this.scale.width + 100;
      return true;
    });

    // Bridge details movement (simulated)
    this.bridgeDecks.forEach((deck, i) => {
      // In a real TileSprite we'd scroll, here we just keep score
    });
    
    // Update score/distance
    this.distance += this.speed * 0.05;
    this.score = Math.floor(this.distance) + (this.cookiesCollected * 100);

    if (this.distance > 0 && Math.floor(this.distance) % 2500 === 0) {
      this.speed += 0.2;
    }

    // Move Obstacles & Cookies
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

  private jump() {
    if (this.player.getData('jumping') || this.player.getData('sliding')) return;
    this.player.setData('jumping', true);
    
    const originalY = this.laneYPositions[this.currentLane];
    
    this.tweens.add({
      targets: this.player,
      y: originalY - 120 * this.laneScales[this.currentLane],
      duration: 300,
      yoyo: true,
      ease: 'Sine.out',
      onComplete: () => {
        this.player.setData('jumping', false);
        this.player.y = originalY;
      }
    });
  }

  private slide() {
    if (this.player.getData('jumping') || this.player.getData('sliding')) return;
    this.player.setData('sliding', true);
    
    this.tweens.add({
      targets: this.player,
      scaleY: this.laneScales[this.currentLane] * 0.5,
      duration: 200,
      yoyo: true,
      ease: 'Cubic.inOut',
      onComplete: () => {
        this.player.setData('sliding', false);
        this.player.setScale(this.laneScales[this.currentLane]);
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
      
      // Draw Obstacle Programmatically
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
      } else {
        g.fillStyle(0x95a5a6, 1);
        g.fillRect(-15, -50, 30, 50);
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

      // Cookies
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
    g.fillCircle(0, 8, 3);
    
    container.add(g);
    this.cookies.add(container);
    container.setData('lane', lane);
    container.setDepth(20 + lane * 10);
    container.setScale(this.laneScales[lane]);
    
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 30);
    body.setOffset(-15, -15);

    this.tweens.add({
      targets: container,
      angle: 360,
      duration: 2000,
      repeat: -1
    });
  }

  private handleCollision(player: any, obstacle: any) {
    if (this.isInvulnerable || !this.player.active) return;

    const obstacleLane = obstacle.getData('lane');
    if (obstacleLane !== this.currentLane) return;

    // Type logic
    const type = obstacle.getData('type');
    if (this.player.getData('jumping') && (type === 'pet' || type === 'waterPuddle')) return;
    if (this.player.getData('sliding') && type === 'vehicle') return;
    
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
    this.physics.pause();
    this.onUpdateLives(0);
    this.onGameOver(this.score, this.cookiesCollected);
  }

  public pauseGame() { this.scene.pause(); }
  public resumeGame() { this.scene.resume(); }
  public restart() { this.scene.restart({ startPaused: false }); }
}
