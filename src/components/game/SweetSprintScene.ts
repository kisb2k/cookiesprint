import * as Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private currentLane: number = 1;
  private laneYPositions: number[] = [300, 420, 540]; // 3 distinct bridge levels
  private laneScales: number[] = [0.65, 0.9, 1.2];
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private speed: number = 10;
  
  private backgroundSky!: Phaser.GameObjects.TileSprite;
  private bridgeDecks!: Phaser.GameObjects.TileSprite[];
  private bridgeRailings!: Phaser.GameObjects.TileSprite[];
  
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
    const assets = PlaceHolderImages.reduce((acc, img) => {
      acc[img.id] = img.imageUrl;
      return acc;
    }, {} as Record<string, string>);

    this.load.image('girl', assets['girl-run']);
    this.load.image('cookie', assets['cookie']);
    this.load.image('vehicle', assets['vehicle']);
    this.load.image('pet', assets['pet']);
    this.load.image('person', assets['person']);
    this.load.image('waterPuddle', assets['water-puddle']);
    this.load.image('deck', assets['bridge-deck']);
    this.load.image('sky', assets['city-skyline']);
    this.load.image('railing', assets['bridge-railing']);
  }

  create() {
    const { width, height } = this.scale;

    // Sky Background (Parallax)
    this.backgroundSky = this.add.tileSprite(width / 2, 150, width, 400, 'sky');
    this.backgroundSky.setScrollFactor(0);
    this.backgroundSky.setAlpha(0.6);

    // Bridge Levels
    this.bridgeDecks = [];
    this.bridgeRailings = [];

    // Create 3 bridge decks corresponding to lanes
    this.laneYPositions.forEach((y, index) => {
      const deckWidth = width;
      const deckHeight = 120 * (this.laneScales[index]);
      
      const deck = this.add.tileSprite(width / 2, y + 20, deckWidth, deckHeight, 'deck');
      deck.setDepth(5 + index * 10);
      deck.setAlpha(0.9);
      this.bridgeDecks.push(deck);

      const rail = this.add.tileSprite(width / 2, y - deckHeight / 2, deckWidth, 40, 'railing');
      rail.setDepth(6 + index * 10);
      rail.setAlpha(0.8);
      this.bridgeRailings.push(rail);
    });

    // Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(150, this.laneYPositions[this.currentLane], 'girl');
    this.player.setScale(this.laneScales[this.currentLane]);
    this.player.setDepth(50); // Always in front of the decks
    this.player.setImmovable(true);

    // Player Animation (Bobbing)
    this.tweens.add({
      targets: this.player,
      y: this.player.y - 5,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Inputs
    this.setupInputs();

    // Stats
    this.onUpdateLives(this.lives);

    // Initial AI Obstacles
    this.requestNewSegment();

    // Collision Handlers
    this.physics.add.overlap(this.player, this.obstacles, this.handleCollision, undefined, this);
    this.physics.add.overlap(this.player, this.cookies, this.collectCookie, undefined, this);

    if (this.startPaused) {
      this.scene.pause();
    }
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

    // Move environment
    this.backgroundSky.tilePositionX += this.speed * 0.2;
    this.bridgeDecks.forEach((deck, i) => {
      deck.tilePositionX += this.speed * (this.laneScales[i]);
    });
    this.bridgeRailings.forEach((rail, i) => {
      rail.tilePositionX += this.speed * (this.laneScales[i]);
    });
    
    // Update score/distance
    this.distance += this.speed * 0.05;
    this.score = Math.floor(this.distance) + (this.cookiesCollected * 100);

    // Dynamic speed increase
    if (this.distance > 0 && Math.floor(this.distance) % 2500 === 0) {
      this.speed += 0.15;
    }

    // Move and Clean up Obstacles
    this.obstacles.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= this.speed * this.laneScales[lane];
        if (child.x < -200) child.destroy();
      }
      return true;
    });

    // Move and Clean up Cookies
    this.cookies.children.iterate((child: any) => {
      if (child) {
        const lane = child.getData('lane');
        child.x -= this.speed * this.laneScales[lane];
        if (child.x < -200) child.destroy();
      }
      return true;
    });

    // Check if we need more obstacles
    if (this.distance - this.lastObstacleDistance > this.segmentLength && !this.isGenerating) {
      this.requestNewSegment();
    }
  }

  private moveLane(dir: number) {
    const targetLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
    if (targetLane === this.currentLane) return;

    this.currentLane = targetLane;
    
    // Animate transition between bridge levels
    this.tweens.add({
      targets: this.player,
      y: this.laneYPositions[this.currentLane],
      scale: this.laneScales[this.currentLane],
      duration: 200,
      ease: 'Back.out',
      onStart: () => {
        // Visual cue for switching "decks"
        this.player.setAlpha(0.8);
      },
      onComplete: () => {
        this.player.setAlpha(1);
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
      y: originalY - 150,
      duration: 350,
      yoyo: true,
      ease: 'Quad.out',
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
      scaleX: this.laneScales[this.currentLane] * 1.2,
      duration: 250,
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
      this.placeObstacles([{ type: 'waterPuddle', lane: '1', distanceFromStart: 500 }]);
    } finally {
      this.isGenerating = false;
    }
  }

  private placeObstacles(obstacleData: any[]) {
    obstacleData.forEach(obs => {
      const laneIndex = parseInt(obs.lane);
      const spawnX = this.scale.width + obs.distanceFromStart + 200;
      const spawnY = this.laneYPositions[laneIndex];
      const scale = this.laneScales[laneIndex];
      
      const obstacle = this.obstacles.create(spawnX, spawnY, obs.type);
      if (obstacle) {
        obstacle.setData('type', obs.type);
        obstacle.setData('lane', laneIndex);
        obstacle.setDepth(14 + laneIndex * 10);
        obstacle.setScale(scale);
        
        // Depth Animations
        if (obs.type === 'vehicle') {
          this.tweens.add({
            targets: obstacle,
            x: obstacle.x - 20,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        } else if (obs.type === 'pet') {
          this.tweens.add({
            targets: obstacle,
            y: obstacle.y - 15,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Bounce.inOut'
          });
        }
        
        obstacle.body.updateFromGameObject();
      }

      // Cookies on the bridge decks
      if (Math.random() > 0.3) {
        const cookie = this.cookies.create(spawnX + 100, spawnY - 40, 'cookie');
        cookie.setScale(scale * 0.8);
        cookie.setData('lane', laneIndex);
        cookie.setDepth(20 + laneIndex * 10);
        cookie.body.updateFromGameObject();
        
        this.tweens.add({
          targets: cookie,
          y: cookie.y - 10,
          angle: 360,
          duration: 1500,
          repeat: -1,
          ease: 'Linear'
        });
      }
    });
  }

  private handleCollision(player: any, obstacle: any) {
    if (this.isInvulnerable || !this.player.active) return;

    const obstacleLane = obstacle.getData('lane');
    if (obstacleLane !== this.currentLane) return;

    const type = obstacle.getData('type');
    if (type === 'waterPuddle' && this.player.getData('jumping')) return;
    if (type === 'vehicle' && this.player.getData('sliding')) return;
    
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
      duration: 120,
      yoyo: true,
      repeat: 8,
      onComplete: () => {
        this.player.alpha = 1;
        this.isInvulnerable = false;
        this.tweens.addCounter({
          from: this.speed,
          to: prevSpeed,
          duration: 1500,
          onUpdate: (tween) => {
            this.speed = tween.getValue();
          }
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
      scaleX: this.laneScales[this.currentLane] * 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Bounce.out'
    });
  }

  private gameOver() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.onUpdateLives(0);
    this.onGameOver(this.score, this.cookiesCollected);
  }

  public pauseGame() {
    this.scene.pause();
  }

  public resumeGame() {
    this.scene.resume();
  }

  public restart() {
    this.scene.restart({ startPaused: false });
  }
}