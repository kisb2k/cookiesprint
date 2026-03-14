import * as Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private currentLane: number = 1;
  private laneWidth: number = 160;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private speed: number = 8;
  
  private road!: Phaser.GameObjects.TileSprite;
  private leftSidewalk!: Phaser.GameObjects.TileSprite;
  private rightSidewalk!: Phaser.GameObjects.TileSprite;
  private roadLines!: Phaser.GameObjects.TileSprite;
  
  private obstacles!: Phaser.Physics.Arcade.Group;
  private cookies!: Phaser.Physics.Arcade.Group;
  
  private lastObstacleDistance: number = 0;
  private segmentLength: number = 1500;
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
    // Reset core state on every init (start/restart)
    this.score = 0;
    this.distance = 0;
    this.cookiesCollected = 0;
    this.speed = 8;
    this.currentLane = 1;
    this.isJumping = false;
    this.isSliding = false;
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
    this.load.image('street', assets['street-texture']);
    this.load.image('sidewalk', assets['sidewalk-texture']);
  }

  create() {
    const { width, height } = this.scale;

    // Environment Layers
    this.leftSidewalk = this.add.tileSprite(40, height / 2, 80, height, 'sidewalk');
    this.rightSidewalk = this.add.tileSprite(width - 40, height / 2, 80, height, 'sidewalk');

    this.road = this.add.tileSprite(width / 2, height / 2, width - 160, height, 'street');
    this.road.setTint(0x444444);

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillRect(0, 0, 10, 40);
    graphics.generateTexture('roadLine', 10, 60);
    graphics.destroy();

    this.roadLines = this.add.tileSprite(width / 2, height / 2, width - 160, height, 'roadLine');

    // Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(this.getLaneX(this.currentLane), height - 150, 'girl');
    this.player.setScale(0.8);
    this.player.setDepth(10);
    this.player.setImmovable(true);

    // Inputs
    this.setupInputs();

    // Stats
    this.onUpdateLives(this.lives);

    // Initial AI Obstacles
    this.requestNewSegment();

    // Collision Handlers using Phaser Physics
    this.physics.add.overlap(this.player, this.obstacles, this.handleCollision, undefined, this);
    this.physics.add.overlap(this.player, this.cookies, this.collectCookie, undefined, this);

    // Initial pause check
    if (this.startPaused) {
      this.scene.pause();
    }
  }

  private setupInputs() {
    this.input.keyboard?.on('keydown-LEFT', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-UP', () => this.jump());
    this.input.keyboard?.on('keydown-DOWN', () => this.slide());
    this.input.keyboard?.on('keydown-A', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-D', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-W', () => this.jump());
    this.input.keyboard?.on('keydown-S', () => this.slide());
  }

  update(time: number, delta: number) {
    if (!this.player.active) return;

    // Move environment
    this.road.tilePositionY -= this.speed;
    this.leftSidewalk.tilePositionY -= this.speed;
    this.rightSidewalk.tilePositionY -= this.speed;
    this.roadLines.tilePositionY -= this.speed;
    
    // Update score/distance
    this.distance += this.speed * 0.1;
    this.score = Math.floor(this.distance) + (this.cookiesCollected * 50);

    // Dynamic speed increase
    if (this.distance > 0 && Math.floor(this.distance) % 1000 === 0) {
      this.speed += 0.05;
    }

    // Move and Clean up
    this.updatePhysicsGroup(this.obstacles);
    this.updatePhysicsGroup(this.cookies);

    // Check if we need more obstacles
    if (this.distance - this.lastObstacleDistance > this.segmentLength && !this.isGenerating) {
      this.requestNewSegment();
    }
  }

  private updatePhysicsGroup(group: Phaser.Physics.Arcade.Group) {
    group.children.iterate((child: any) => {
      if (child) {
        child.y += this.speed;
        if (child.y > this.scale.height + 200) {
          child.destroy();
        }
      }
      return true;
    });
  }

  private getLaneX(lane: number) {
    const center = this.scale.width / 2;
    return center + (lane - 1) * this.laneWidth;
  }

  private moveLane(dir: number) {
    const targetLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
    if (targetLane === this.currentLane) return;

    this.currentLane = targetLane;
    this.tweens.add({
      targets: this.player,
      x: this.getLaneX(this.currentLane),
      duration: 120,
      ease: 'Cubic.out'
    });
  }

  private jump() {
    if (this.isJumping || this.isSliding) return;
    this.isJumping = true;
    
    this.tweens.add({
      targets: this.player,
      y: this.player.y - 150,
      scale: 1.3,
      duration: 400,
      yoyo: true,
      ease: 'Quad.out',
      onComplete: () => {
        this.isJumping = false;
        this.player.setScale(0.8);
      }
    });
  }

  private slide() {
    if (this.isJumping || this.isSliding) return;
    this.isSliding = true;
    
    this.tweens.add({
      targets: this.player,
      scaleY: 0.4,
      scaleX: 1.2,
      duration: 250,
      yoyo: true,
      ease: 'Quad.inOut',
      onComplete: () => {
        this.isSliding = false;
        this.player.setScale(0.8);
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
      // Fallback obstacles if AI fails
      this.placeObstacles([
        { type: 'waterPuddle', lane: '1', distanceFromStart: 300 }
      ]);
    } finally {
      this.isGenerating = false;
    }
  }

  private placeObstacles(obstacleData: any[]) {
    obstacleData.forEach(obs => {
      const spawnY = -obs.distanceFromStart - 200;
      const x = this.getLaneX(parseInt(obs.lane));
      
      const obstacle = this.obstacles.create(x, spawnY, obs.type);
      if (obstacle) {
        obstacle.setData('type', obs.type);
        obstacle.setDepth(5);
        if (obs.type === 'vehicle') obstacle.setScale(0.7);
        else if (obs.type === 'pet') obstacle.setScale(0.6);
        else obstacle.setScale(0.8);
        
        // Refresh body for physics scaling
        obstacle.body.updateFromGameObject();
      }

      if (Math.random() > 0.4) {
        const cookie = this.cookies.create(x, spawnY + 200, 'cookie');
        cookie.setScale(0.6);
        cookie.setDepth(4);
        cookie.body.updateFromGameObject();
      }
    });
  }

  private handleCollision(player: any, obstacle: any) {
    if (this.isInvulnerable || !this.player.active) return;

    const type = obstacle.getData('type');
    
    // Skill checks for jumping over puddles or sliding under vehicles (if logic allows)
    if (type === 'waterPuddle' && this.isJumping) return;
    
    // We hit an obstacle
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
    this.speed = Math.max(4, this.speed * 0.4); // Slow down

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 150,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.player.alpha = 1;
        this.isInvulnerable = false;
        // Gradually recover speed
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
    this.cookiesCollected++;
    cookie.destroy();
    
    // Small feedback
    this.tweens.add({
      targets: this.player,
      alpha: 0.7,
      duration: 50,
      yoyo: true
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
    // Restart with startPaused: false so it doesn't pause immediately in create()
    this.scene.restart({ startPaused: false });
  }
}
