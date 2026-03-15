import * as Phaser from 'phaser';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private currentLane: number = 1;
  private characterId: string = 'arya';
  
  private laneYPositions: number[] = [220, 360, 500];
  private laneScales: number[] = [0.55, 0.82, 1.15];
  private laneSpeedMultipliers: number[] = [0.6, 1.0, 1.8];
  private readonly bridgeTextureWidth = 200;
  private readonly bridgeDeckBaseHeight = 72;
  private readonly obstacleScaleMultiplier = 0.78;
  private readonly playerScaleMultiplier = 1.05;
  
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
  
  private laneDwellTimeMs: number = 0;
  private lastLaneIndex: number = 1;
  private lanePressureCooldownMs: number = 0;
  
  private lastSpawnDistance: number = 0;
  private spawnInterval: number = 250;
  private lastSpeedBoostAt: number = 0; 

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
  private parallaxNear!: Phaser.GameObjects.TileSprite;
  private cookieCollectEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly playerVisualHeight = 50;
  private shakeAmount: number = 0;
  private shakeOrigin: { x: number; y: number } = { x: 0, y: 0 };

  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private static readonly SWIPE_THRESHOLD = 40;

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
    this.lastSpeedBoostAt = 0;
  }

  public setCharacter(id: string) {
    this.characterId = id;
    if (this.player && this.player.active) {
      this.updatePlayerTexture();
    }
  }

  private updatePlayerTexture() {
    const runner = this.player.getAt(1) as Phaser.GameObjects.Sprite;
    const animKey = `run_${this.characterId}`;
    
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(`player_${this.characterId}_run`, { start: 0, end: 5 }),
        frameRate: 14,
        repeat: -1
      });
    }
    
    runner.setTexture(`player_${this.characterId}_run`, 0);
    runner.play(animKey);
  }

  create() {
    const { width, height } = this.scale;

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0xbae6fd, 0xbae6fd, 1);
    sky.fillRect(0, 0, width, height);

    if (this.textures.exists('parallax_far')) {
      this.parallaxFar = this.add.tileSprite(width / 2, 100, width, 200, 'parallax_far');
      this.parallaxFar.setDepth(1);
      this.parallaxFar.setOrigin(0.5, 0);
    }
    if (this.textures.exists('parallax_mid')) {
      this.parallaxMid = this.add.tileSprite(width / 2, 180, width, 220, 'parallax_mid');
      this.parallaxMid.setDepth(3);
      this.parallaxMid.setOrigin(0.5, 0);
    }
    if (this.textures.exists('parallax_near')) {
      this.parallaxNear = this.add.tileSprite(width / 2, 260, width, 220, 'parallax_near');
      this.parallaxNear.setDepth(4);
      this.parallaxNear.setOrigin(0.5, 0);
    }

    this.createDistantBridge();
    this.clouds = this.add.group();
    for (let i = 0; i < 8; i++) {
      this.createCloud(Phaser.Math.Between(0, width), Phaser.Math.Between(30, 120));
    }

    this.createBridgeTextures();
    this.laneYPositions.forEach((laneY, index) => {
      const scale = this.laneScales[index];
      const deckHeight = Math.round(this.bridgeDeckBaseHeight * scale);
      const feetY = laneY - this.playerVisualHeight * scale;
      const tileSprite = this.add.tileSprite(width / 2, feetY, width, deckHeight, `bridge_deck_${index}`);
      tileSprite.setDepth(10 + index * 10);
      tileSprite.setOrigin(0.5, 0);
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
    g.fillGradientStyle(0x38bdf8, 0x38bdf8, 0x0ea5e9, 0x0ea5e9, 0.15, 0.15, 0.25, 0.25);
    g.fillRoundedRect(0, 0, 400, 100, 4);
    g.lineStyle(1.5, 0x0ea5e9, 0.25);
    g.lineBetween(0, 22, 400, 22);
    for (let i = 0; i < 400; i += 50) {
      g.lineBetween(i, 22, i + 25, 4);
      g.lineBetween(i + 25, 4, i + 50, 22);
    }
    g.generateTexture('distant_bridge', 400, 100);
    this.distantBridge = this.add.tileSprite(400, 150, 800, 100, 'distant_bridge');
    this.distantBridge.setAlpha(0.4);
    this.distantBridge.setDepth(5);
  }

  private createBridgeTextures() {
    const bridgePalette = [
      { deckTop: 0x0d9488, deckBottom: 0x115e59, rail: 0x14b8a6, line: 0x2dd4bf, shadow: 0x0f766e },
      { deckTop: 0xb45309, deckBottom: 0x92400e, rail: 0xd97706, line: 0xf59e0b, shadow: 0x78350f },
      { deckTop: 0x4f46e5, deckBottom: 0x3730a3, rail: 0x6366f1, line: 0x818cf8, shadow: 0x312e81 },
    ];
    this.laneScales.forEach((scale, index) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const textureWidth = this.bridgeTextureWidth;
      const textureHeight = Math.round(this.bridgeDeckBaseHeight * scale);
      const radius = Math.max(2, Math.round(4 * scale));
      const railH = Math.max(4, Math.round(8 * scale));
      const shadowH = Math.round(6 * scale);
      const pal = bridgePalette[index] ?? bridgePalette[1];

      g.fillStyle(pal.deckBottom, 1);
      g.fillRect(0, 0, textureWidth, textureHeight);
      g.fillGradientStyle(pal.deckTop, pal.deckTop, pal.deckBottom, pal.deckBottom, 1, 1, 1, 1);
      g.fillRoundedRect(0, 0, textureWidth, textureHeight, radius);
      g.fillStyle(pal.rail, 1);
      g.fillRoundedRect(0, 0, textureWidth, railH, radius);
      g.fillStyle(pal.line, 0.85);
      g.fillRect(0, textureHeight / 2 - Math.round(2 * scale), textureWidth, Math.round(4 * scale));
      g.fillStyle(pal.shadow, 1);
      g.fillRoundedRect(0, textureHeight - shadowH, textureWidth, shadowH, radius);
      g.lineStyle(Math.round(1.5 * scale), pal.line, 0.35);
      for (let i = 0; i < textureWidth; i += 50) {
        g.lineBetween(i, railH, i, textureHeight - shadowH);
      }
      g.generateTexture(`bridge_deck_${index}`, textureWidth, textureHeight);
    });
  }

  private createCloud(x: number, y: number) {
    const container = this.add.container(x, y);
    if (this.textures.exists('cloud')) {
      const cloud = this.add.sprite(0, 0, 'cloud');
      cloud.setOrigin(0.5, 0.5);
      container.add(cloud);
    }
    container.setData('speed', Phaser.Math.Between(2, 6) * 0.05);
    container.setDepth(2);
    this.clouds.add(container);
  }

  private createPlayer() {
    this.player = this.add.container(150, this.laneYPositions[this.currentLane]);
    this.player.setDepth(15 + this.currentLane * 10);

    const shadow = this.add.sprite(0, 30, 'shadow');
    shadow.setOrigin(0.5, 0.5);
    this.player.add(shadow);
    
    // Initial runner sprite - texture updated via updatePlayerTexture
    const runner = this.add.sprite(0, -this.playerVisualHeight, `player_${this.characterId}_run`, 0);
    runner.setOrigin(0.5, 1);
    this.player.add(runner);

    this.player.setScale(this.laneScales[this.currentLane] * this.playerScaleMultiplier);
    this.physics.add.existing(this.player);
    const bodyPhys = this.player.body as Phaser.Physics.Arcade.Body;
    bodyPhys.setSize(30, 80);
    bodyPhys.setOffset(-15, -80);
    
    this.updatePlayerTexture();
  }

  private setupInputs() {
    this.setupKeyboardInput();
    this.setupTouchInput();
  }

  private setupKeyboardInput() {
    if (!this.input.keyboard) return;
    this.upKey = this.input.keyboard.addKey('UP');
    this.downKey = this.input.keyboard.addKey('DOWN');
    this.leftKey = this.input.keyboard.addKey('LEFT');
    this.rightKey = this.input.keyboard.addKey('RIGHT');
    this.upKey.on('down', () => {
      if (this.currentLane === 0) this.jump();
      else this.moveLane(-1);
    });
    this.downKey.on('down', () => this.moveLane(1));
    this.leftKey.on('down', () => this.slide());
    this.rightKey.on('down', () => this.slide());
  }

  private setupTouchInput() {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.pointerDownX = ptr.x;
      this.pointerDownY = ptr.y;
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const dx = ptr.x - this.pointerDownX;
      const dy = ptr.y - this.pointerDownY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < SweetSprintScene.SWIPE_THRESHOLD && absDy < SweetSprintScene.SWIPE_THRESHOLD) return;
      if (absDx > absDy) {
        if (absDx >= SweetSprintScene.SWIPE_THRESHOLD) this.slide();
      } else {
        if (absDy >= SweetSprintScene.SWIPE_THRESHOLD) {
          if (dy < 0) {
            if (this.currentLane === 0) this.jump();
            else this.moveLane(-1);
          } else this.moveLane(1);
        }
      }
    });
  }

  update(time: number, delta: number) {
    if (!this.isGameActive || !this.player.active) {
      this.particles.stop();
      return;
    }

    this.particles.start();
    this.particles.follow = this.player;

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

    if (this.parallaxFar) this.parallaxFar.tilePositionX += this.baseSpeed * 0.02 * delta * 0.05;
    if (this.parallaxMid) this.parallaxMid.tilePositionX += this.baseSpeed * 0.04 * delta * 0.05;
    if (this.parallaxNear) this.parallaxNear.tilePositionX += this.baseSpeed * 0.07 * delta * 0.05;

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

    const speedMilestone = Math.floor(this.score / 1000) * 1000;
    if (speedMilestone >= 1000 && speedMilestone > this.lastSpeedBoostAt) {
      this.baseSpeed += 0.2;
      this.lastSpeedBoostAt = speedMilestone;
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

    this.updateLaneDwell(delta);

    const activeObstacles = this.obstacles.countActive();
    if (activeObstacles === 0 || (this.distance - this.lastSpawnDistance > this.spawnInterval)) {
      this.spawnObstacleSet();
      this.lastSpawnDistance = this.distance;
      const per500mReduction = Math.floor(this.score / 500) * 12;
      this.spawnInterval = Math.max(80, 280 - (this.distance / 120) - per500mReduction);
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
      scale: this.laneScales[this.currentLane] * this.playerScaleMultiplier,
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
      y: this.player.y - 110,
      duration: 380,
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
      scaleY: this.laneScales[this.currentLane] * this.playerScaleMultiplier * 0.4,
      y: this.player.y + 22,
      duration: 400,
      yoyo: true,
      ease: 'Cubic.out',
      onComplete: () => {
        this.player.setData('sliding', false);
        this.player.scaleY = this.laneScales[this.currentLane] * this.playerScaleMultiplier;
        this.player.y = this.laneYPositions[this.currentLane];
      }
    });
  }

  private updateLaneDwell(delta: number) {
    if (!this.isGameActive) return;

    if (this.currentLane !== this.lastLaneIndex) {
      this.lastLaneIndex = this.currentLane;
      this.laneDwellTimeMs = 0;
      return;
    }

    this.laneDwellTimeMs += delta;
    if (this.lanePressureCooldownMs > 0) this.lanePressureCooldownMs -= delta;

    if (this.laneDwellTimeMs < 1500 || this.lanePressureCooldownMs > 0) return;

    const lane = this.currentLane;
    let hasNearby = false;
    this.obstacles.children.iterate((child: any) => {
      if (!child || !child.active) return true;
      if (child.getData('lane') !== lane) return true;
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

    this.laneDwellTimeMs = 0;
    this.lanePressureCooldownMs = 800;
  }

  private spawnObstacleSet() {
    const obstacleCount = Math.min(4, 1 + Math.floor(this.score / 500));
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
      const cookieSurfaceY = this.laneYPositions[cookieLane] - this.playerVisualHeight * this.laneScales[cookieLane];
      this.createCookie(900 + Phaser.Math.Between(100, 600), cookieSurfaceY - 8, cookieLane);
    }
  }

  private createObstacle(laneIdx: number, type: string, x: number) {
    const surfaceY = this.laneYPositions[laneIdx] - this.playerVisualHeight * this.laneScales[laneIdx];
    const spawnY = surfaceY + 22;
    const container = this.add.container(x, spawnY);
    const shadow = this.add.sprite(0, 28, 'shadow');
    shadow.setOrigin(0.5, 0.5);
    shadow.setScale(1.2);
    container.add(shadow);
    
    const sprite = this.add.sprite(0, 0, `obstacle_${type}`);
    sprite.setOrigin(0.5, 1);
    container.add(sprite);
    
    container.setData('lane', laneIdx);
    container.setData('type', type);
    container.setDepth(14 + laneIdx * 10);
    container.setScale(this.laneScales[laneIdx] * this.obstacleScaleMultiplier);
    this.physics.add.existing(container);
    this.obstacles.add(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(70, 70);
    body.setOffset(-35, -70);
    
    this.tweens.add({
      targets: container,
      y: spawnY - 4,
      duration: 800 + laneIdx * 100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createCookie(x: number, y: number, lane: number) {
    const container = this.add.container(x, y);
    const shadow = this.add.sprite(0, 20, 'shadow');
    shadow.setOrigin(0.5, 0.5);
    shadow.setScale(0.6);
    container.add(shadow);
    const cookieSprite = this.add.sprite(0, 0, 'cookie');
    cookieSprite.setOrigin(0.5, 0.5);
    container.add(cookieSprite);
    
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
    if (obstacle.getData('lane') !== this.currentLane) return;

    const type = obstacle.getData('type');
    if (this.player.getData('sliding') && (type === 'pet' || type === 'waterPuddle')) return;
    if (this.player.getData('jumping') && (type === 'waterPuddle' || type === 'pet')) return;
    
    obstacle.destroy();
    this.lives--;
    this.onUpdateLives(this.lives);
    this.onSoundEvent?.('hit');

    if (this.lives <= 0) this.gameOver();
    else this.triggerHitEffect();
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
    if (cookie.getData('lane') !== this.currentLane) return;

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
      scale: this.laneScales[this.currentLane] * this.playerScaleMultiplier * 1.3,
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
