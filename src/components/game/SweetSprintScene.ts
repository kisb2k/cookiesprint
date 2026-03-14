
import * as Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
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
  
  private obstacles: Phaser.GameObjects.Group | null = null;
  private cookies: Phaser.GameObjects.Group | null = null;
  
  private lastObstacleDistance: number = 0;
  private segmentLength: number = 1500;
  private isGenerating: boolean = false;

  private onGameOver: (score: number, cookies: number) => void;

  constructor(onGameOver: (score: number, cookies: number) => void) {
    super('SweetSprintScene');
    this.onGameOver = onGameOver;
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
    // 1. Sidewalks
    this.leftSidewalk = this.add.tileSprite(40, height / 2, 80, height, 'sidewalk');
    this.rightSidewalk = this.add.tileSprite(width - 40, height / 2, 80, height, 'sidewalk');

    // 2. Main Road
    this.road = this.add.tileSprite(width / 2, height / 2, width - 160, height, 'street');
    this.road.setTint(0x444444);

    // 3. Road Lines (Lane markings)
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.5);
    // Draw lane lines onto a texture
    graphics.fillRect(0, 0, 10, 40);
    graphics.generateTexture('roadLine', 10, 60);
    graphics.destroy();

    this.roadLines = this.add.tileSprite(width / 2, height / 2, width - 160, height, 'roadLine');
    // Align lines to lanes
    this.roadLines.setTilePosition(0, 0);

    // Player
    this.player = this.add.sprite(this.getLaneX(this.currentLane), height - 150, 'girl');
    this.player.setScale(0.8);
    this.player.setDepth(10);

    // Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // Inputs
    this.setupInputs();

    // Initial AI Obstacles
    this.requestNewSegment();

    // Collisions
    this.physics.add.overlap(this.player, this.obstacles, (p, o) => this.handleCollision(o as Phaser.GameObjects.Sprite));
    this.physics.add.overlap(this.player, this.cookies, (p, c) => this.collectCookie(c as Phaser.GameObjects.Sprite));
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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { x, y } = pointer;
      this.input.once('pointerup', (upPointer: Phaser.Input.Pointer) => {
        const dx = upPointer.x - x;
        const dy = upPointer.y - y;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 50) this.moveLane(1);
          else if (dx < -50) this.moveLane(-1);
        } else {
          if (dy < -50) this.jump();
          else if (dy > 50) this.slide();
        }
      });
    });
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
      this.speed += 0.1;
    }

    // Move and Clean up obstacles
    this.updateGroup(this.obstacles);
    this.updateGroup(this.cookies);

    // Check if we need more obstacles
    if (this.distance - this.lastObstacleDistance > this.segmentLength && !this.isGenerating) {
      this.requestNewSegment();
    }
  }

  private updateGroup(group: Phaser.GameObjects.Group | null) {
    group?.children.iterate((child: any) => {
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
      // Offset spawn point above screen
      const spawnY = -obs.distanceFromStart - 200;
      const x = this.getLaneX(parseInt(obs.lane));
      
      const obstacle = this.obstacles?.create(x, spawnY, obs.type);
      if (obstacle) {
        obstacle.setData('type', obs.type);
        obstacle.setDepth(5);
        if (obs.type === 'vehicle') obstacle.setScale(0.7);
        else if (obs.type === 'pet') obstacle.setScale(0.6);
        else obstacle.setScale(0.8);
      }

      // Add cookies in patterns around obstacles
      if (Math.random() > 0.3) {
        const cookie = this.cookies?.create(x, spawnY + 200, 'cookie');
        cookie?.setScale(0.6);
        cookie?.setDepth(4);
      }
    });
  }

  private handleCollision(obstacle: Phaser.GameObjects.Sprite) {
    const type = obstacle.getData('type');
    
    // Skill checks
    if (type === 'waterPuddle' && this.isJumping) return;
    if (type === 'vehicle' && this.isSliding) return;
    if (type === 'pet' && this.isJumping) return;

    this.gameOver();
  }

  private collectCookie(cookie: Phaser.GameObjects.Sprite) {
    this.cookiesCollected++;
    cookie.destroy();
    
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
    this.onGameOver(this.score, this.cookiesCollected);
  }

  public restart() {
    this.scene.restart();
    this.score = 0;
    this.distance = 0;
    this.cookiesCollected = 0;
    this.speed = 8;
    this.currentLane = 1;
    this.isJumping = false;
    this.isSliding = false;
  }
}
