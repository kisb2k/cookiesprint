import * as Phaser from 'phaser';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private currentLane: number = 1;
  // Lane layout: Y = character container, scale = perspective. Runway width and deck height tuned so character meets bridge organically.
  private laneYPositions: number[] = [220, 360, 500];
  private laneScales: number[] = [0.55, 0.82, 1.15];
  private laneSpeedMultipliers: number[] = [0.6, 1.0, 1.8];
  /** Texture tile width for bridge deck (tiles repeat across full screen). */
  private readonly bridgeTextureWidth = 200;
  /** Base deck height in texture (scaled per lane). Thinner deck = clearer running surface. */
  private readonly bridgeDeckBaseHeight = 72;
  
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
  // Tracks how long the player has stayed in the same lane (ms)
  private laneDwellTimeMs: number = 0;
  private lastLaneIndex: number = 1;
  private lanePressureCooldownMs: number = 0;
  
  private lastSpawnDistance: number = 0;
  private spawnInterval: number = 250; 

  private lives: number = 2;
  private isInvulnerable: boolean = false;
  private isGameActive: boolean = false;

  private onGameOver: (score: number, cookies: number) => void;
  private onUpdateLives: (lives: number) => void;
  private onUpdateScore: (score: number) => void;
  private onUpdateCookies: (cookies: number) => void;
  private onSoundEvent?: (event: 'jump' | 'slide' | 'cookie' | 'hit' | 'gameover') => void;

  private parallaxFar!: Phaser.GameObjects.TileSprite;
  private parallaxMid!: Phaser.GameObjects.TileSprite;
  private cookieCollectEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shakeAmount: number = 0;
  private shakeOrigin: { x: number; y: number } = { x: 0, y: 0 };

  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  constructor(
    onGameOver: (score: number, cookies: number) => void,
    onUpdateLives: (lives: number) => void,
    onUpdateScore: (score: number) => void,
    onUpdateCookies: (cookies: number) => void,
    onSoundEvent?: (event: 'jump' | 'slide' | 'cookie' | 'hit' | 'gameover') => void
  ) {
    super('SweetSprintScene');
    this.onGameOver = onGameOver;
    this.onUpdateLives = onUpdateLives;
    this.onUpdateScore = onUpdateScore;
    this.onUpdateCookies = onUpdateCookies;
    this.onSoundEvent = onSoundEvent;
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
    this.laneDwellTimeMs = 0;
    this.lastLaneIndex = this.currentLane;
    this.lanePressureCooldownMs = 0;
  }

  create() {
    const { width, height } = this.scale;

    // Sky Background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0xbae6fd, 0xbae6fd, 1);
    sky.fillRect(0, 0, width, height);

    // Parallax layers (textures from BootScene)
    if (this.textures.exists('parallax_far')) {
      this.parallaxFar = this.add.tileSprite(width / 2, 100, width, 200, 'parallax_far');
      this.parallaxFar.setDepth(1);
      this.parallaxFar.setOrigin(0.5, 0);
    }
    if (this.textures.exists('parallax_mid')) {
      this.parallaxMid = this.add.tileSprite(width / 2, 180, width, 200, 'parallax_mid');
      this.parallaxMid.setDepth(3);
      this.parallaxMid.setOrigin(0.5, 0);
    }

    this.createDistantBridge();

    // Clouds
    this.clouds = this.add.group();
    for (let i = 0; i < 8; i++) {
      this.createCloud(Phaser.Math.Between(0, width), Phaser.Math.Between(30, 120));
    }

    // Bridge Decks: full screen width, positioned so top surface aligns with character feet
    this.createBridgeTextures();
    this.laneYPositions.forEach((laneY, index) => {
      const scale = this.laneScales[index];
      const deckHeight = Math.round(this.bridgeDeckBaseHeight * scale);
      const feetY = laneY - 48 * scale;
      const tileSprite = this.add.tileSprite(width / 2, feetY, width, deckHeight, `bridge_deck_${index}`);
      tileSprite.setDepth(10 + index * 10);
      tileSprite.setOrigin(0.5, 0);
      this.bridgeDecks.push(tileSprite);
    });

    // Particles for running
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

    // Cookie collect burst (sparkle texture from BootScene)
    if (this.textures.exists('sparkle')) {
      this.cookieCollectEmitter = this.add.particles(0, 0, 'sparkle', {
        speed: { min: 80, max: 180 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 400,
        frequency: -1,
        blendMode: 'ADD'
      });
      this.cookieCollectEmitter.stop();
    }

    // Player run animation (from BootScene texture)
    if (this.textures.exists('player_run')) {
      this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('player_run', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1
      });
    }

    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    this.createPlayer();
    this.setupInputs();

    this.onUpdateLives(this.lives);
    this.onUpdateScore(0);
    this.onUpdateCookies(0);

    // Initial spawn
    this.spawnObstacleSet();

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
    this.distantBridge = this.add.tileSprite(400, 150, 800, 100, 'distant_bridge');
    this.distantBridge.setAlpha(0.4);
    this.distantBridge.setDepth(5);
  }

  private createBridgeTextures() {
    // dust texture is created in BootScene. Deck texture tiles across full screen width.
    this.laneScales.forEach((scale, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const textureWidth = this.bridgeTextureWidth;
      const textureHeight = Math.round(this.bridgeDeckBaseHeight * scale);
      
      // Main Deck
      g.fillStyle(0x334155, 1);
      g.fillRect(0, 0, textureWidth, textureHeight);
      
      // Railing Top (running surface edge)
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, textureWidth, Math.max(4, Math.round(8 * scale)));
      
      // Center Line
      g.fillStyle(0x475569, 0.5);
      g.fillRect(0, textureHeight / 2 - Math.round(2 * scale), textureWidth, Math.round(4 * scale));
      
      // Side Shadow (bottom edge)
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, textureHeight - Math.round(6 * scale), textureWidth, Math.round(6 * scale));
      
      // Grid Detail
      g.lineStyle(Math.round(2 * scale), 0x64748b, 0.4);
      for (let i = 0; i < textureWidth; i += 40) {
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

    if (this.textures.exists('shadow') && this.textures.exists('player_run')) {
      // Sprite-based player with shadow
      const shadow = this.add.sprite(0, 28, 'shadow');
      shadow.setOrigin(0.5, 0.5);
      this.player.add(shadow);
      const runner = this.add.sprite(0, -48, 'player_run', 0);
      runner.setOrigin(0.5, 1);
      if (this.anims.exists('run')) runner.play('run');
      this.player.add(runner);
    } else {
      // Fallback: graphics-based player
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
      this.tweens.add({ targets: lLeg, angle: { from: -35, to: 35 }, duration: 250, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: rLeg, angle: { from: 35, to: -35 }, duration: 250, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: lArm, angle: { from: 45, to: -45 }, duration: 250, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: rArm, angle: { from: -45, to: 45 }, duration: 250, yoyo: true, repeat: -1 });
    }

    this.player.setScale(this.laneScales[this.currentLane]);
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

    // Screen shake
    if (this.shakeAmount > 0) {
      const cam = this.cameras.main;
      this.shakeOrigin ??= { x: cam.scrollX, y: cam.scrollY };
      cam.setScroll(
        this.shakeOrigin.x + (Math.random() - 0.5) * 12,
        this.shakeOrigin.y + (Math.random() - 0.5) * 12
      );
      this.shakeAmount -= delta;
      if (this.shakeAmount <= 0) {
        cam.setScroll(this.shakeOrigin.x, this.shakeOrigin.y);
        this.shakeOrigin = { x: 0, y: 0 };
      }
    }

    // Parallax layers
    if (this.parallaxFar) {
      this.parallaxFar.tilePositionX += this.baseSpeed * 0.02 * delta * 0.05;
    }
    if (this.parallaxMid) {
      this.parallaxMid.tilePositionX += this.baseSpeed * 0.04 * delta * 0.05;
    }

    // Distant background movement
    this.distantBridge.tilePositionX += this.baseSpeed * 0.1 * delta * 0.05;
    this.clouds.children.iterate((cloud: any) => {
      cloud.x -= cloud.getData('speed') * delta * 0.1;
      if (cloud.x < -100) cloud.x = 900;
      return true;
    });
    
    // Bridge movement (parallax by lane)
    this.bridgeDecks.forEach((deck, index) => {
      deck.tilePositionX += this.baseSpeed * 0.05 * delta * this.laneSpeedMultipliers[index];
    });

    // Distance measurement (dependent on current lane speed)
    this.distance += (this.baseSpeed * 0.005 * delta * this.laneSpeedMultipliers[this.currentLane]);
    if (Math.floor(this.distance) !== this.score) {
      this.score = Math.floor(this.distance);
      this.onUpdateScore(this.score);
    }

    // Speed increases slowly over time
    if (this.score > 0 && this.score % 500 === 0) {
      this.baseSpeed += 0.01;
    }

    // Move obstacles and cookies matching their lane speed
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

    // Lane dwell tracking: if player camps in one lane for too long, spawn a pressure obstacle
    this.updateLaneDwell(delta);

    // Ensure at least 1 obstacle is always on screen or being spawned
    const activeObstacles = this.obstacles.countActive();
    if (activeObstacles === 0 || (this.distance - this.lastSpawnDistance > this.spawnInterval)) {
      this.spawnObstacleSet();
      this.lastSpawnDistance = this.distance;
      // Adjust spawn interval based on speed/distance
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
    this.onSoundEvent?.('jump');
    
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
    this.onSoundEvent?.('slide');
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

  /**
   * Tracks how long the player stays in the same lane.
   * If they remain in one lane for more than 1.5 seconds, and there isn't already
   * a near obstacle in that lane, spawn a \"pressure\" obstacle ahead of them.
   */
  private updateLaneDwell(delta: number) {
    if (!this.isGameActive) return;

    if (this.currentLane !== this.lastLaneIndex) {
      this.lastLaneIndex = this.currentLane;
      this.laneDwellTimeMs = 0;
      return;
    }

    this.laneDwellTimeMs += delta;
    if (this.lanePressureCooldownMs > 0) {
      this.lanePressureCooldownMs -= delta;
    }

    // Only trigger if player has camped longer than 1.5s and cooldown elapsed
    if (this.laneDwellTimeMs < 1500 || this.lanePressureCooldownMs > 0) {
      return;
    }

    const lane = this.currentLane;
    // Check for an existing obstacle already reasonably close in this lane
    let hasNearby = false;
    this.obstacles.children.iterate((child: any) => {
      if (!child || !child.active) return true;
      if (child.getData('lane') !== lane) return true;
      // If an obstacle is in front of the player and not too far away, skip spawning
      if (child.x > 200 && child.x < 700) {
        hasNearby = true;
        return false;
      }
      return true;
    });

    if (!hasNearby) {
      const type = ['vehicle', 'pet', 'person', 'waterPuddle'][Phaser.Math.Between(0, 3)];
      this.createObstacle(lane, type, 900);
    }

    // Reset dwell timer and start a short cooldown so we don't flood obstacles
    this.laneDwellTimeMs = 0;
    this.lanePressureCooldownMs = 800;
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

    // Spawn cookies evenly distributed
    const cookieCount = Phaser.Math.Between(1, 2);
    for (let j = 0; j < cookieCount; j++) {
      let cookieLane = Phaser.Math.Between(0, 2);
      const cookieSurfaceY = this.laneYPositions[cookieLane] - 48 * this.laneScales[cookieLane];
      this.createCookie(900 + Phaser.Math.Between(100, 600), cookieSurfaceY - 8, cookieLane);
    }
  }

  private createObstacle(laneIdx: number, type: string, x: number) {
    const surfaceY = this.laneYPositions[laneIdx] - 48 * this.laneScales[laneIdx];
    const spawnY = surfaceY + 22;
    const container = this.add.container(x, spawnY);
    // Shadow under obstacle
    if (this.textures.exists('shadow')) {
      const shadow = this.add.sprite(0, 25, 'shadow');
      shadow.setOrigin(0.5, 0.5);
      shadow.setScale(1.2);
      container.add(shadow);
    }
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
      // Person
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
    if (this.textures.exists('cookie') && this.textures.exists('shadow')) {
      const shadow = this.add.sprite(0, 20, 'shadow');
      shadow.setOrigin(0.5, 0.5);
      shadow.setScale(0.6);
      container.add(shadow);
      const cookieSprite = this.add.sprite(0, 0, 'cookie');
      cookieSprite.setOrigin(0.5, 0.5);
      container.add(cookieSprite);
    } else {
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
    }
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
    // Sliding only dodges small obstacles
    if (this.player.getData('sliding') && (type === 'pet' || type === 'waterPuddle')) return;
    // Jumping also dodges those same obstacles
    if (this.player.getData('jumping') && (type === 'waterPuddle' || type === 'pet')) return;
    
    obstacle.destroy();
    this.lives--;
    this.onUpdateLives(this.lives);
    this.onSoundEvent?.('hit');

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
    this.shakeOrigin = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
    this.shakeAmount = 180;

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 120,
      yoyo: true,
      repeat: 8,
      onComplete: () => {
        this.player.alpha = 1;
        this.isInvulnerable = false;
        // Slow speed recovery
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

    const collectX = cookie.x;
    const collectY = cookie.y;
    this.cookiesCollected++;
    this.onUpdateCookies(this.cookiesCollected);
    this.onSoundEvent?.('cookie');
    cookie.destroy();

    if (this.cookieCollectEmitter) {
      this.cookieCollectEmitter.setPosition(collectX, collectY);
      this.cookieCollectEmitter.explode(16);
    }
    
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
    this.onSoundEvent?.('gameover');
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