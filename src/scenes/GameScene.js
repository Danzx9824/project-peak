/**
 * GameScene - Main gameplay scene with levels, parallax, particles, and HUD
 */
import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { LEVELS, parseLevel } from '../levels/LevelData.js';
import { THEMES } from '../utils/AssetGenerator.js';

const TILE = 16;

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.currentLevel = data.level || 0;
        this.deaths = data.deaths || 0;
        this.totalTime = data.totalTime || 0;
    }

    create() {
        const levelData = parseLevel(this.currentLevel);
        this.levelData = levelData;
        const theme = THEMES[levelData.theme];

        // ── World bounds ──
        const worldW = levelData.width * TILE;
        const worldH = levelData.height * TILE;
        this.physics.world.setBounds(0, 0, worldW, worldH);

        // ── Background layers (parallax) ──
        this.createParallaxBackground(levelData.theme, worldW, worldH);

        // ── Create tilemap ──
        this.createTilemap(levelData);

        // ── Create player ──
        const spawnX = levelData.spawn.x * TILE + TILE / 2;
        const spawnY = levelData.spawn.y * TILE + TILE / 2;
        this.player = new Player(this, spawnX, spawnY);
        this.player.setCheckpoint(spawnX, spawnY);

        // ── Collisions ──
        this.physics.add.collider(this.player, this.solidLayer);
        if (this.platformLayer) {
            const platformCollider = this.physics.add.collider(this.player, this.platformLayer);
            // One-way platforms: only collide from above
            platformCollider.processCallback = (player, tile) => {
                return player.body.velocity.y >= 0 && player.body.bottom <= tile.pixelY + 4;
            };
        }

        // Spike overlaps
        if (this.spikeSprites && this.spikeSprites.length > 0) {
            this.spikeGroup = this.physics.add.staticGroup();
            this.spikeSprites.forEach(s => this.spikeGroup.add(s));
            this.physics.add.overlap(this.player, this.spikeGroup, () => {
                this.player.die();
                this.deaths++;
                this.updateDeathCount();
            });
        }

        // Exit overlap
        if (this.exitSprites && this.exitSprites.length > 0) {
            this.exitGroup = this.physics.add.staticGroup();
            this.exitSprites.forEach(s => this.exitGroup.add(s));
            this.physics.add.overlap(this.player, this.exitGroup, () => {
                this.nextLevel();
            });
        }

        // Checkpoint overlap
        if (this.checkpointSprites && this.checkpointSprites.length > 0) {
            this.checkpointGroup = this.physics.add.staticGroup();
            this.checkpointSprites.forEach(s => this.checkpointGroup.add(s));
            this.physics.add.overlap(this.player, this.checkpointGroup, (player, cp) => {
                if (!cp.getData('activated')) {
                    cp.setData('activated', true);
                    cp.setTint(0x60ff60);
                    this.player.setCheckpoint(cp.x, cp.y);
                    // Flash effect
                    this.cameras.main.flash(100, 255, 255, 200);
                }
            });
        }

        // ── Camera ──
        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
        this.cameras.main.setDeadzone(20, 20);
        this.cameras.main.fadeIn(500, 10, 6, 18);

        // ── Particle systems ──
        this.createParticles(levelData.theme, worldW, worldH);

        // ── HUD ──
        this.createHUD(levelData);

        // ── Fall death zone ──
        this.fallZoneY = worldH + 20;

        // ── Level transition flag ──
        this.isTransitioning = false;

        // ── Timer ──
        this.levelStartTime = this.time.now;
    }

    createParallaxBackground(themeKey, worldW, worldH) {
        const W = 320, H = 180;

        // Sky (fixed to camera)
        this.bgSky = this.add.image(W / 2, H / 2, `sky_${themeKey}`)
            .setScrollFactor(0)
            .setDepth(-10);

        // Far mountains (very slow scroll)
        this.bgFar = this.add.image(W / 2, H / 2, `bgfar_${themeKey}`)
            .setScrollFactor(0.05, 0.02)
            .setDepth(-9)
            .setAlpha(0.8);

        // Mid mountains
        this.bgMid = this.add.image(W / 2, H / 2, `bgmid_${themeKey}`)
            .setScrollFactor(0.15, 0.05)
            .setDepth(-8)
            .setAlpha(0.7);

        // Near layer
        this.bgNear = this.add.image(W / 2, H / 2, `bgnear_${themeKey}`)
            .setScrollFactor(0.3, 0.1)
            .setDepth(-7)
            .setAlpha(0.6);
    }

    createTilemap(levelData) {
        const themeKey = levelData.theme;
        this.spikeSprites = [];
        this.exitSprites = [];
        this.checkpointSprites = [];

        // Build solid tiles array (only solid ground tiles)
        const solidTiles = [];
        const platformTiles = [];

        for (let row = 0; row < levelData.height; row++) {
            const solidRow = [];
            const platRow = [];
            for (let col = 0; col < levelData.width; col++) {
                const tile = levelData.tiles[row][col];

                if (tile === 1 || tile === 2) {
                    solidRow.push(tile);
                } else {
                    solidRow.push(-1);
                }

                if (tile === 7) {
                    platRow.push(7);
                } else {
                    platRow.push(-1);
                }

                // Spikes as physics sprites
                if (tile >= 3 && tile <= 6) {
                    const spike = this.physics.add.sprite(
                        col * TILE + TILE / 2,
                        row * TILE + TILE / 2,
                        `tiles_${themeKey}`, tile
                    );
                    spike.body.setImmovable(true);
                    spike.body.allowGravity = false;
                    // Smaller hitbox for "fair" spikes
                    spike.body.setSize(10, 10);
                    spike.body.setOffset(3, 3);
                    spike.setDepth(2);
                    this.spikeSprites.push(spike);
                }

                // Exit
                if (tile === 8) {
                    const ex = this.physics.add.sprite(
                        col * TILE + TILE / 2,
                        row * TILE + TILE / 2,
                        `tiles_${themeKey}`, 8
                    );
                    ex.body.setImmovable(true);
                    ex.body.allowGravity = false;
                    ex.body.setSize(12, 14);
                    ex.body.setOffset(2, 1);
                    ex.setDepth(2);
                    // Pulsing glow
                    this.tweens.add({
                        targets: ex,
                        alpha: { from: 0.7, to: 1 },
                        scaleX: { from: 1, to: 1.1 },
                        scaleY: { from: 1, to: 1.1 },
                        duration: 800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                    this.exitSprites.push(ex);
                }

                // Checkpoint
                if (tile === 9) {
                    const cp = this.physics.add.sprite(
                        col * TILE + TILE / 2,
                        row * TILE + TILE / 2,
                        `tiles_${themeKey}`, 9
                    );
                    cp.body.setImmovable(true);
                    cp.body.allowGravity = false;
                    cp.body.setSize(12, 14);
                    cp.body.setOffset(2, 1);
                    cp.setDepth(2);
                    cp.setData('activated', false);
                    this.checkpointSprites.push(cp);
                }
            }
            solidTiles.push(solidRow);
            platformTiles.push(platRow);
        }

        // Create solid tilemap
        const solidMap = this.make.tilemap({
            data: solidTiles,
            tileWidth: TILE,
            tileHeight: TILE
        });
        const solidTileset = solidMap.addTilesetImage(`tiles_${themeKey}`, `tiles_${themeKey}`, TILE, TILE, 0, 0);
        this.solidLayer = solidMap.createLayer(0, solidTileset, 0, 0);
        this.solidLayer.setCollisionBetween(1, 2);
        this.solidLayer.setDepth(1);

        // Create platform tilemap
        const platMap = this.make.tilemap({
            data: platformTiles,
            tileWidth: TILE,
            tileHeight: TILE
        });
        const platTileset = platMap.addTilesetImage(`tiles_${themeKey}`, `tiles_${themeKey}`, TILE, TILE, 0, 0);
        this.platformLayer = platMap.createLayer(0, platTileset, 0, 0);
        this.platformLayer.setCollisionBetween(7, 7);
        this.platformLayer.setDepth(1);
    }

    createParticles(themeKey, worldW, worldH) {
        // Dust particles (emitted on jump/land)
        this.dustEmitter = this.add.particles(0, 0, 'particle_dust', {
            speed: { min: 10, max: 30 },
            angle: { min: 200, max: 340 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,
            gravityY: 50,
            emitting: false
        });
        this.dustEmitter.setDepth(11);

        // Dash trail particles
        this.trailEmitter = this.add.particles(0, 0, 'particle_trail', {
            speed: { min: 5, max: 20 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 300,
            emitting: false
        });
        this.trailEmitter.setDepth(9);

        // Death particles
        this.deathEmitter = this.add.particles(0, 0, 'particle_death', {
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 100,
            emitting: false
        });
        this.deathEmitter.setDepth(12);

        // Ambient wind particles
        this.windEmitter = this.add.particles(0, 0, 'particle_leaf', {
            x: { min: 0, max: worldW },
            y: { min: 0, max: worldH },
            speedX: { min: 8, max: 25 },
            speedY: { min: -8, max: 8 },
            scale: { start: 1, end: 0.3 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 5000,
            frequency: 1500,
            quantity: 1,
            rotate: { min: 0, max: 360 }
        });
        this.windEmitter.setDepth(5);

        // Pollen/sparkle particles
        this.pollenEmitter = this.add.particles(0, 0, 'particle_pollen', {
            x: { min: 0, max: worldW },
            y: { min: 0, max: worldH },
            speedX: { min: 3, max: 10 },
            speedY: { min: -15, max: -3 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.3, end: 0 },
            lifespan: 6000,
            frequency: 600,
            quantity: 1
        });
        this.pollenEmitter.setDepth(5);
    }

    createHUD(levelData) {
        // Death counter
        this.deathIcon = this.add.image(8, 8, 'icon_death')
            .setScrollFactor(0)
            .setDepth(100);

        this.deathText = this.add.text(16, 5, `${this.deaths}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(100);

        // Level name (fades in and out)
        const levelName = this.add.text(160, 12, levelData.name, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffffff',
            align: 'center',
            stroke: '#1a0a2e',
            strokeThickness: 1
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        this.tweens.add({
            targets: levelName,
            alpha: { from: 1, to: 0 },
            delay: 2000,
            duration: 1000
        });

        // Timer
        this.timerText = this.add.text(310, 5, '0:00', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '4px',
            color: '#aaaacc'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    }

    updateDeathCount() {
        this.deathText.setText(`${this.deaths}`);
        // Flash red
        this.deathText.setColor('#ff4060');
        this.time.delayedCall(300, () => {
            if (this.deathText) this.deathText.setColor('#ffffff');
        });
    }

    nextLevel() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const nextLevelIndex = this.currentLevel + 1;
        const elapsed = Math.floor((this.time.now - this.levelStartTime) / 1000);
        const newTotalTime = this.totalTime + elapsed;

        if (nextLevelIndex >= LEVELS.length) {
            // Victory!
            this.showVictory(newTotalTime);
            return;
        }

        // Fade to next level
        this.cameras.main.fadeOut(600, 10, 6, 18);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.restart({ level: nextLevelIndex, deaths: this.deaths, totalTime: newTotalTime });
        });
    }

    showVictory(totalTime) {
        const W = 320, H = 180;

        // Darken everything
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0612, 0.8)
            .setScrollFactor(0).setDepth(200);
        overlay.setAlpha(0);
        this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

        // Victory text
        const victoryText = this.add.text(W / 2, H / 2 - 30, '🏔️ SUMMIT REACHED!', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#ffe060',
            align: 'center',
            stroke: '#4a1a5e',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

        const mins = Math.floor(totalTime / 60);
        const secs = totalTime % 60;

        const statsText = this.add.text(W / 2, H / 2, `Deaths: ${this.deaths}\nTime: ${mins}:${secs.toString().padStart(2, '0')}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

        const restartText = this.add.text(W / 2, H / 2 + 35, 'PRESS SPACE TO RESTART', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '4px',
            color: '#aaaacc',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

        this.tweens.add({ targets: victoryText, alpha: 1, duration: 500, delay: 300 });
        this.tweens.add({ targets: statsText, alpha: 1, duration: 500, delay: 600 });
        this.tweens.add({ targets: restartText, alpha: 1, duration: 500, delay: 900 });

        // Blinking restart prompt
        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: restartText,
                alpha: { from: 0.3, to: 1 },
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.cameras.main.fadeOut(500, 10, 6, 18);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });
    }

    update(time, delta) {
        if (this.isTransitioning) return;

        // Update player
        if (this.player) {
            this.player.update(time, delta);

            // Fall death
            if (this.player.y > this.fallZoneY && !this.player.isDead) {
                this.player.die();
                this.deaths++;
                this.updateDeathCount();
            }
        }

        // Update timer
        const elapsed = Math.floor((time - this.levelStartTime) / 1000) + this.totalTime;
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        if (this.timerText) {
            this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
        }
    }
}
