
import Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private currentLane: number = 1;
  private laneWidth: number = 160;
  private lanes: number[] = [0, 1, 2];
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private speed: number = 8;
  
  private streetSegments: Phaser.GameObjects.TileSprite[] = [];
  private obstacles: Phaser.GameObjects.Group | null = null;
  private cookies: Phaser.GameObjects.Group | null = null;
  
  private lastObstacleDistance: number = 0;
  private segmentLength: number = 1000;
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
  }

  create() {
    const { width, height } = this.scale;

    // Street background
    const street = this.add.tileSprite(width / 2, height / 2, width, height, 'street');
    this.streetSegments.push(street);

    // Player
    this.player = this.add.sprite(this.getLaneX(this.currentLane), height - 150, 'girl');
    this.player.setScale(0.8);

    // Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // Inputs
    this.input.keyboard?.on('keydown-LEFT', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-UP', () => this.jump());
    this.input.keyboard?.on('keydown-DOWN', () => this.slide());
    this.input.keyboard?.on('keydown-A', () => this.moveLane(-1));
    this.input.keyboard?.on('keydown-D', () => this.moveLane(1));
    this.input.keyboard?.on('keydown-W', () => this.jump());
    this.input.keyboard?.on('keydown-S', () => this.slide());

    // Swipe controls for mobile/touch
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

    // Initial AI Obstacles
    this.requestNewSegment();

    // Collisions
    this.physics.add.overlap(this.player, this.obstacles, (p, o) => this.handleCollision(o as Phaser.GameObjects.Sprite));
    this.physics.add.overlap(this.player, this.cookies, (p, c) => this.collectCookie(c as Phaser.GameObjects.Sprite));
  }

  update(time: number, delta: number) {
    if (!this.player.active) return;

    // Move environment
    this.streetSegments.forEach(s => s.tilePositionY -= this.speed);
    
    // Update score/distance
    this.distance += this.speed * 0.1;
    this.score = Math.floor(this.distance) + (this.cookiesCollected * 50);

    // Dynamic speed increase
    if (this.distance > 0 && Math.floor(this.distance) % 500 === 0) {
      this.speed += 0.05;
    }

    // Move objects
    this.obstacles?.children.iterate((child: any) => {
      if (child) {
        child.y += this.speed;
        if (child.y > this.scale.height + 100) {
          child.destroy();
        }
      }
      return true;
    });

    this.cookies?.children.iterate((child: any) => {
      if (child) {
        child.y += this.speed;
        if (child.y > this.scale.height + 100) {
          child.destroy();
        }
      }
      return true;
    });

    // Check if we need more obstacles
    if (this.distance - this.lastObstacleDistance > this.segmentLength && !this.isGenerating) {
      this.requestNewSegment();
    }
  }

  private getLaneX(lane: number) {
    const center = this.scale.width / 2;
    return center + (lane - 1) * this.laneWidth;
  }

  private moveLane(dir: number) {
    if (this.isGenerating) return; // Prevent glitches during AI calls if necessary
    const targetLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
    if (targetLane === this.currentLane) return;

    this.currentLane = targetLane;
    this.tweens.add({
      targets: this.player,
      x: this.getLaneX(this.currentLane),
      duration: 150,
      ease: 'Power2'
    });
  }

  private jump() {
    if (this.isJumping || this.isSliding) return;
    this.isJumping = true;
    
    this.tweens.add({
      targets: this.player,
      y: this.player.y - 120,
      scale: 1.2,
      duration: 350,
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
      scaleX: 1.1,
      duration: 200,
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
      console.error('AI generation failed', e);
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
        // Special hitboxes for slide/jump
        if (obs.type === 'vehicle') obstacle.setScale(0.6);
        else if (obs.type === 'pet') obstacle.setScale(0.5);
        else obstacle.setScale(0.7);
      }

      // Occasionally add cookies nearby
      if (Math.random() > 0.4) {
        const cookie = this.cookies?.create(x, spawnY + 150, 'cookie');
        cookie?.setScale(0.6);
      }
    });
  }

  private handleCollision(obstacle: Phaser.GameObjects.Sprite) {
    const type = obstacle.getData('type');
    
    // Some obstacles can be avoided by jumping or sliding
    if (type === 'waterPuddle' && this.isJumping) return;
    if (type === 'vehicle' && this.isSliding) return; // Urban "low-clearance" trick or just game logic

    // Basic collision = Game Over
    this.gameOver();
  }

  private collectCookie(cookie: Phaser.GameObjects.Sprite) {
    this.cookiesCollected++;
    cookie.destroy();
    
    // Flash effect
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
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
  }
}
