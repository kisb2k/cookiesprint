import * as Phaser from 'phaser';
import { generateObstacleSequence } from '@/ai/flows/dynamic-obstacle-placement-flow';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export class SweetSprintScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private currentLane: number = 1;
  private laneYPositions: number[] = [320, 440, 540];
  private laneScales: number[] = [0.7, 1.0, 1.3];
  
  private score: number = 0;
  private distance: number = 0;
  private cookiesCollected: number = 0;
  private speed: number = 10;
  
  private road!: Phaser.GameObjects.TileSprite;
  private backgroundFar!: Phaser.GameObjects.TileSprite;
  private backgroundNear!: Phaser.GameObjects.TileSprite;
  
  private obstacles!: Phaser.Physics.Arcade.Group;
  private cookies!: Phaser.Physics.Arcade.Group;
  
  private lastObstacleDistance: number = 0;
  private segmentLength: number = 1800;
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
    this.load.image('street', assets['street-texture']);
    this.load.image('sidewalk', assets['sidewalk-texture']);
  }

  create() {
    const { width, height } = this.scale;

    // Environment Layers (Horizontal Parallax)
    this.backgroundFar = this.add.tileSprite(width / 2, 150, width, 300, 'sidewalk');
    this.backgroundFar.setTint(0x888888);
    this.backgroundFar.setScrollFactor(0);

    this.road = this.add.tileSprite(width / 2, height - 150, width, 400, 'street');
    this.road.setTint(0x444444);
    this.road.setScrollFactor(0);

    this.backgroundNear = this.add.tileSprite(width / 2, height - 40, width, 80, 'sidewalk');
    this.backgroundNear.setScrollFactor(0);

    // Groups
    this.obstacles = this.physics.add.group();
    this.cookies = this.physics.add.group();

    // Player
    this.player = this.physics.add.sprite(150, this.laneYPositions[this.currentLane], 'girl');
    this.player.setScale(this.laneScales[this.currentLane]);
    this.player.setDepth(20);
    this.player.setImmovable(true);

    // Initial Idle Animation (Squash and Stretch)
    this.tweens.add({
      targets: this.player,
      scaleY: this.laneScales[this.currentLane] * 0.95,
      scaleX: this.laneScales[this.currentLane] * 1.05,
      duration: 200,
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

    // Move environment horizontally
    this.road.tilePositionX += this.speed;
    this.backgroundFar.tilePositionX += this.speed * 0.3;
    this.backgroundNear.tilePositionX += this.speed * 1.2;
    
    // Update score/distance
    this.distance += this.speed * 0.05;
    this.score = Math.floor(this.distance) + (this.cookiesCollected * 100);

    // Dynamic speed increase
    if (this.distance > 0 && Math.floor(this.distance) % 2000 === 0) {
      this.speed += 0.1;
    }

    // Move and Clean up Obstacles
    this.obstacles.children.iterate((child: any) => {
      if (child) {
        child.x -= this.speed;
        if (child.x < -200) child.destroy();
      }
      return true;
    });

    // Move and Clean up Cookies
    this.cookies.children.iterate((child: any) => {
      if (child) {
        child.x -= this.speed;
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
    
    // Animate lane change with depth scaling
    this.tweens.add({
      targets: this.player,
      y: this.laneYPositions[this.currentLane],
      scale: this.laneScales[this.currentLane],
      duration: 150,
      ease: 'Cubic.out',
      onUpdate: () => {
        // Update depth based on lane to handle overlapping correctly
        this.player.setDepth(10 + this.currentLane * 10);
      }
    });
  }

  private jump() {
    if (this.player.getData('jumping') || this.player.getData('sliding')) return;
    this.player.setData('jumping', true);
    
    const originalY = this.laneYPositions[this.currentLane];
    
    this.tweens.add({
      targets: this.player,
      y: originalY - 180,
      duration: 400,
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
      scaleY: this.laneScales[this.currentLane] * 0.4,
      scaleX: this.laneScales[this.currentLane] * 1.3,
      duration: 300,
      yoyo: true,
      ease: 'Expo.inOut',
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
        obstacle.setDepth(10 + laneIndex * 10);
        obstacle.setScale(scale);
        
        // Add "Depth Animation" to obstacles
        if (obs.type === 'vehicle') {
          obstacle.setScale(scale * 1.1);
          this.tweens.add({
            targets: obstacle,
            y: obstacle.y - 5,
            duration: 100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        } else if (obs.type === 'pet') {
          obstacle.setScale(scale * 0.8);
          this.tweens.add({
            targets: obstacle,
            y: obstacle.y - 30,
            angle: 15,
            duration: 250,
            yoyo: true,
            repeat: -1,
            ease: 'Bounce.out'
          });
        } else if (obs.type === 'person') {
          this.tweens.add({
            targets: obstacle,
            scaleX: scale * 0.9,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Power1.easeInOut'
          });
        }
        
        obstacle.body.updateFromGameObject();
      }

      // Add Cookies with animations
      if (Math.random() > 0.4) {
        const cookie = this.cookies.create(spawnX + 150, spawnY - 50, 'cookie');
        cookie.setScale(scale * 0.7);
        cookie.setDepth(30);
        cookie.body.updateFromGameObject();
        
        this.tweens.add({
          targets: cookie,
          y: cookie.y - 20,
          angle: 360,
          duration: 1000,
          repeat: -1,
          ease: 'Linear'
        });
      }
    });
  }

  private handleCollision(player: any, obstacle: any) {
    if (this.isInvulnerable || !this.player.active) return;

    const type = obstacle.getData('type');
    const obstacleLane = obstacle.getData('lane');

    // Lane mismatch check (simple depth check)
    if (obstacleLane !== this.currentLane) return;
    
    // Skill checks
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
    this.speed = Math.max(5, this.speed * 0.5);

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 100,
      yoyo: true,
      repeat: 10,
      onComplete: () => {
        this.player.alpha = 1;
        this.isInvulnerable = false;
        this.tweens.addCounter({
          from: this.speed,
          to: prevSpeed,
          duration: 2000,
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
    
    this.tweens.add({
      targets: this.player,
      scaleX: this.laneScales[this.currentLane] * 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Back.out'
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
