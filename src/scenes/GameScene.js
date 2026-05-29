/**
 * GameScene - PICO-8 style 128x128 screen, fixed camera, room transitions
 */
import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { LEVELS, parseLevel } from '../levels/LevelData.js';
import { THEMES } from '../utils/AssetGenerator.js';
import { MusicManager } from '../utils/MusicManager.js';

const TILE = 8;
const ROOM_W = 128;
const ROOM_H = 128;

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.musicManager = new MusicManager();
    }

    init(data) {
        this.currentLevel = data.level || 0;
        this.deaths = data.deaths || 0;
        this.totalTime = data.totalTime || 0;
        this.strawberries = data.strawberries || 0;
    }

    create() {
        const levelData = parseLevel(this.currentLevel);
        this.levelData = levelData;
        const theme = THEMES[levelData.theme];

        const worldW = levelData.width * TILE;
        const worldH = levelData.height * TILE;
        this.physics.world.setBounds(0, 0, worldW, worldH);

        // Background
        this.bgSky = this.add.image(160, 90, `sky_${levelData.theme}`).setScrollFactor(0).setDepth(-10);

        this.createTilemap(levelData);

        const spawnX = levelData.spawn.x * TILE + TILE / 2;
        const spawnY = levelData.spawn.y * TILE + TILE / 2;
        this.player = new Player(this, spawnX, spawnY);
        this.player.setCheckpoint(spawnX, spawnY);

        this.physics.add.collider(this.player, this.solidLayer);
        if (this.platformLayer) {
            const platformCollider = this.physics.add.collider(this.player, this.platformLayer);
            platformCollider.processCallback = (player, tile) => {
                return player.body.velocity.y >= 0 && player.body.bottom <= tile.pixelY + 4;
            };
        }

        if (this.spikeSprites && this.spikeSprites.length > 0) {
            this.spikeGroup = this.physics.add.staticGroup();
            this.spikeSprites.forEach(s => this.spikeGroup.add(s));
            this.physics.add.overlap(this.player, this.spikeGroup, () => {
                this.player.die();
                this.deaths++;
                this.updateDeathCount();
            });
        }

        if (this.exitSprites && this.exitSprites.length > 0) {
            this.exitGroup = this.physics.add.staticGroup();
            this.exitSprites.forEach(s => this.exitGroup.add(s));
            this.physics.add.overlap(this.player, this.exitGroup, () => {
                this.nextLevel();
            });
        }

        if (this.checkpointSprites && this.checkpointSprites.length > 0) {
            this.checkpointGroup = this.physics.add.staticGroup();
            this.checkpointSprites.forEach(s => this.checkpointGroup.add(s));
            this.physics.add.overlap(this.player, this.checkpointGroup, (player, cp) => {
                if (!cp.getData('activated')) {
                    cp.setData('activated', true);
                    cp.setTint(0x60ff60);
                    this.player.setCheckpoint(cp.x, cp.y);
                    this.cameras.main.flash(100, 255, 255, 200);
                }
            });
        }

        // Strawberries Group and Overlap
        this.strawberryGroup = this.physics.add.group();
        this.physics.add.overlap(this.player, this.strawberryGroup, (player, berry) => {
            if (berry.getData('collected')) return;
            berry.setData('collected', true);
            berry.disableBody(true, true);

            const floatText = this.add.text(berry.x, berry.y - 10, '+1', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: '#ff6b8a',
                stroke: '#1a0a2e',
                strokeThickness: 1
            }).setOrigin(0.5).setDepth(20);

            this.tweens.add({
                targets: floatText,
                y: floatText.y - 15,
                alpha: 0,
                duration: 600,
                ease: 'Sine.easeOut',
                onComplete: () => floatText.destroy()
            });

            if (this.sparkleEmitter) {
                this.sparkleEmitter.emitParticleAt(berry.x, berry.y, 8);
            }

            berry.destroy();

            this.strawberries++;
            this.updateStrawberryCount();
            this.player.updateSpeed(this.strawberries);
            this.player.playSound('collect');

            // Dynamic spawn
            let spawnAmount = Math.floor(this.strawberries / 5) + 1;
            if (spawnAmount > 4) spawnAmount = 4; // Stop increasing after 15 points (max 4 on screen)
            this.spawnStrawberries(spawnAmount);
        });

        // Initial spawn
        this.spawnStrawberries(1);
        this.player.updateSpeed(this.strawberries);

        if (this.crumblingSprites && this.crumblingSprites.length > 0) {
            this.crumblingGroup = this.physics.add.staticGroup();
            this.crumblingSprites.forEach(s => this.crumblingGroup.add(s));
            this.physics.add.collider(this.player, this.crumblingGroup, (player, block) => {
                if (player.body.bottom <= block.y && player.body.velocity.y >= 0) {
                    if (!block.getData('crumbling')) {
                        block.setData('crumbling', true);
                        this.tweens.add({
                            targets: block,
                            x: block.x + 1,
                            yoyo: true,
                            repeat: 10,
                            duration: 40,
                            onComplete: () => {
                                block.disableBody(true, true);
                                this.time.delayedCall(3000, () => {
                                    block.enableBody(true, block.getData('originX'), block.getData('originY'), true, true);
                                    block.setData('crumbling', false);
                                });
                            }
                        });
                    }
                }
            });
        }

        // Camera setup (fixed to rooms)
        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.cameras.main.fadeIn(100, 10, 6, 18);

        this.createParticles(levelData.theme, worldW, worldH);
        this.createHUD(levelData);

        this.isTransitioning = false;
        this.levelStartTime = this.time.now;

        // Start BGM
        this.musicManager.init();
        this.musicManager.start();
    }

    createTilemap(levelData) {
        const themeKey = levelData.theme;
        this.spikeSprites = [];
        this.exitSprites = [];
        this.checkpointSprites = [];
        this.strawberrySprites = [];
        this.crumblingSprites = [];

        const solidTiles = [];
        const platformTiles = [];

        for (let row = 0; row < levelData.height; row++) {
            const solidRow = [];
            const platRow = [];
            for (let col = 0; col < levelData.width; col++) {
                const tile = levelData.tiles[row][col];

                if (tile === 1 || tile === 2) solidRow.push(tile);
                else solidRow.push(-1);

                if (tile === 7) platRow.push(7);
                else platRow.push(-1);

                if (tile >= 3 && tile <= 6) {
                    const spike = this.physics.add.sprite(col * TILE + TILE / 2, row * TILE + TILE / 2, `tiles_${themeKey}`, tile);
                    spike.body.setImmovable(true);
                    spike.body.allowGravity = false;
                    spike.body.setSize(4, 4);
                    spike.body.setOffset(2, 2);
                    spike.setDepth(2);
                    this.spikeSprites.push(spike);
                }

                if (tile === 8) {
                    const ex = this.physics.add.sprite(col * TILE + TILE / 2, row * TILE + TILE / 2, `tiles_${themeKey}`, 8);
                    ex.body.setImmovable(true);
                    ex.body.allowGravity = false;
                    ex.body.setSize(6, 6);
                    ex.body.setOffset(1, 1);
                    ex.setDepth(2);
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

                if (tile === 9) {
                    const cp = this.physics.add.sprite(col * TILE + TILE / 2, row * TILE + TILE / 2, `tiles_${themeKey}`, 9);
                    cp.body.setImmovable(true);
                    cp.body.allowGravity = false;
                    cp.body.setSize(6, 6);
                    cp.body.setOffset(1, 1);
                    cp.setDepth(2);
                    cp.setData('activated', false);
                    this.checkpointSprites.push(cp);
                }
            }
            solidTiles.push(solidRow);
            platformTiles.push(platRow);
        }

        levelData.crumbling.forEach(pos => {
            const block = this.physics.add.sprite(pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, `tiles_${themeKey}`, 10);
            block.body.setImmovable(true);
            block.body.allowGravity = false;
            block.body.setSize(8, 6);
            block.body.setOffset(0, 0);
            block.setDepth(1);
            block.setData('originX', block.x);
            block.setData('originY', block.y);
            block.setData('crumbling', false);
            this.crumblingSprites.push(block);
        });

        const solidMap = this.make.tilemap({ data: solidTiles, tileWidth: TILE, tileHeight: TILE });
        const solidTileset = solidMap.addTilesetImage(`tiles_${themeKey}`, `tiles_${themeKey}`, TILE, TILE, 0, 0);
        this.solidLayer = solidMap.createLayer(0, solidTileset, 0, 0);
        this.solidLayer.setCollisionBetween(1, 2);
        this.solidLayer.setDepth(1);

        const platMap = this.make.tilemap({ data: platformTiles, tileWidth: TILE, tileHeight: TILE });
        const platTileset = platMap.addTilesetImage(`tiles_${themeKey}`, `tiles_${themeKey}`, TILE, TILE, 0, 0);
        this.platformLayer = platMap.createLayer(0, platTileset, 0, 0);
        this.platformLayer.setCollisionBetween(7, 7);
        this.platformLayer.setDepth(1);
    }

    createParticles(themeKey, worldW, worldH) {
        this.dustEmitter = this.add.particles(0, 0, 'particle_dust', {
            speed: { min: 10, max: 20 },
            angle: { min: 200, max: 340 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 300,
            gravityY: 50,
            emitting: false
        });
        this.dustEmitter.setDepth(11);

        this.trailEmitter = this.add.particles(0, 0, 'particle_trail', {
            speed: { min: 5, max: 15 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 200,
            emitting: false
        });
        this.trailEmitter.setDepth(9);

        this.deathEmitter = this.add.particles(0, 0, 'particle_death', {
            speed: { min: 30, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            gravityY: 100,
            emitting: false
        });
        this.deathEmitter.setDepth(12);

        this.sparkleEmitter = this.add.particles(0, 0, 'particle_sparkle', {
            speed: { min: 10, max: 30 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            gravityY: 20,
            emitting: false
        });
        this.sparkleEmitter.setDepth(12);

        this.pollenEmitter = this.add.particles(0, 0, 'particle_pollen', {
            x: { min: 0, max: worldW },
            y: { min: 0, max: worldH },
            speedX: { min: 2, max: 8 },
            speedY: { min: -10, max: -2 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 4000,
            frequency: 300,
            quantity: 1
        });
        this.pollenEmitter.setDepth(5);
    }

    createHUD(levelData) {
        this.deathIcon = this.add.image(8, 8, 'icon_death').setScrollFactor(0).setDepth(100);
        this.deathText = this.add.text(14, 5, `${this.deaths}`, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '5px', color: '#ffffff'
        }).setScrollFactor(0).setDepth(100);

        this.berryIcon = this.add.image(28, 8, 'icon_berry').setScrollFactor(0).setDepth(100);
        this.berryText = this.add.text(34, 5, `${this.strawberries}`, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '5px', color: '#ffffff'
        }).setScrollFactor(0).setDepth(100);

        const levelName = this.add.text(160, 12, levelData.name, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#ffffff',
            align: 'center', stroke: '#1a0a2e', strokeThickness: 1
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

        this.tweens.add({ targets: levelName, alpha: { from: 1, to: 0 }, delay: 2000, duration: 1000 });

        this.timerText = this.add.text(312, 5, '0:00', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '4px', color: '#aaaacc'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

        this.controlsText = this.add.text(5, 175, 'WASD: Move  W: Jump  K: Dash', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: '#e0e0f0',
            stroke: '#1a0a2e', strokeThickness: 1
        }).setOrigin(0, 1).setScrollFactor(0).setDepth(100);
    }

    updateDeathCount() {
        this.deathText.setText(`${this.deaths}`);
        this.deathText.setColor('#ff4060');
        this.time.delayedCall(300, () => { if (this.deathText) this.deathText.setColor('#ffffff'); });
    }

    updateStrawberryCount() {
        this.berryText.setText(`${this.strawberries}`);
        this.berryText.setColor('#ff80a0');
        this.tweens.add({ targets: this.berryIcon, scaleX: 1.5, scaleY: 1.5, yoyo: true, duration: 150 });
        this.time.delayedCall(300, () => { if (this.berryText) this.berryText.setColor('#ffffff'); });
    }

    nextLevel() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.musicManager.stop();

        const nextLevelIndex = this.currentLevel + 1;
        const elapsed = Math.floor((this.time.now - this.levelStartTime) / 1000);
        const newTotalTime = this.totalTime + elapsed;

        if (nextLevelIndex >= LEVELS.length) {
            this.showVictory(newTotalTime);
            return;
        }

        this.cameras.main.fadeOut(600, 10, 6, 18);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.restart({ level: nextLevelIndex, deaths: this.deaths, totalTime: newTotalTime, strawberries: this.strawberries });
        });
    }

    showVictory(totalTime) {
        const W = 320, H = 180;
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0612, 0.8).setScrollFactor(0).setDepth(200);
        overlay.setAlpha(0);
        this.tweens.add({ targets: overlay, alpha: 1, duration: 500 });

        const victoryText = this.add.text(W / 2, H / 2 - 30, '🏔️ SUMMIT REACHED!', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#ffe060',
            align: 'center', stroke: '#4a1a5e', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

        const mins = Math.floor(totalTime / 60);
        const secs = totalTime % 60;

        const statsText = this.add.text(W / 2, H / 2, `Deaths: ${this.deaths}\nStrawberries: ${this.strawberries}\nTime: ${mins}:${secs.toString().padStart(2, '0')}`, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '5px', color: '#ffffff',
            align: 'center', lineSpacing: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

        const restartText = this.add.text(W / 2, H / 2 + 35, 'PRESS SPACE TO RESTART', {
            fontFamily: '"Press Start 2P", monospace', fontSize: '4px', color: '#aaaacc', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

        this.tweens.add({ targets: victoryText, alpha: 1, duration: 500, delay: 300 });
        this.tweens.add({ targets: statsText, alpha: 1, duration: 500, delay: 600 });
        this.tweens.add({ targets: restartText, alpha: 1, duration: 500, delay: 900 });

        this.time.delayedCall(1000, () => {
            this.tweens.add({ targets: restartText, alpha: { from: 0.3, to: 1 }, duration: 800, yoyo: true, repeat: -1 });
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

        if (this.player) {
            this.player.update(time, delta);

            // Fixed camera per room (128x128 but game size is 320x180, so let's adjust room size to 320x180 since game size was kept 320x180)
            const roomW = 320;
            const roomH = 176; // 22 rows * 8 pixels

            const targetScrollX = Math.floor(this.player.x / roomW) * roomW;
            const targetScrollY = Math.floor(this.player.y / roomH) * roomH;

            // Instant transition for camera
            this.cameras.main.scrollX = targetScrollX;
            this.cameras.main.scrollY = targetScrollY;

            // Fall death (if player falls below current room)
            const roomBottom = targetScrollY + roomH;
            if (this.player.y > roomBottom + 10 && !this.player.isDead) {
                this.player.die();
                this.deaths++;
                this.updateDeathCount();
            }
        }

        const elapsed = Math.floor((time - this.levelStartTime) / 1000) + this.totalTime;
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        if (this.timerText) {
            this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
        }

        // Prevent softlock se o morango ficar para trás em outra tela
        if (this.strawberryGroup) {
            let activeCount = 0;
            const cx = this.cameras.main.scrollX;
            const cy = this.cameras.main.scrollY;

            this.strawberryGroup.children.iterate(berry => {
                if (berry && berry.active) {
                    // Check if it is completely off screen
                    if (berry.x < cx - 16 || berry.x > cx + 336 || berry.y < cy - 16 || berry.y > cy + 192) {
                        berry.destroy();
                    } else {
                        activeCount++;
                    }
                }
            });

            if (activeCount === 0) {
                let spawnAmount = Math.floor(this.strawberries / 5) + 1;
                if (spawnAmount > 4) spawnAmount = 4;
                this.spawnStrawberries(spawnAmount);
            }
        }
    }

    spawnStrawberries(amount) {
        for (let i = 0; i < amount; i++) {
            let valid = false;
            let tx = 0, ty = 0;

            // Try to find a valid empty tile in the current room
            for (let attempts = 0; attempts < 50; attempts++) {
                const roomX = Math.floor(this.player.x / 320) * 40;
                const roomY = Math.floor(this.player.y / 176) * 22;

                tx = roomX + Phaser.Math.Between(2, 37);
                ty = roomY + Phaser.Math.Between(2, 19);

                // Make sure it's inside level data and is an empty space (tile 0)
                if (ty < this.levelData.height && tx < this.levelData.width) {
                    if (this.levelData.tiles[ty][tx] === 0) {
                        valid = true;
                        break;
                    }
                }
            }

            if (valid) {
                const px = tx * TILE + TILE / 2;
                const py = ty * TILE + TILE / 2;
                const berry = this.physics.add.sprite(px, py, 'item_strawberry');
                berry.body.setImmovable(true);
                berry.body.allowGravity = false;
                berry.body.setSize(4, 4);
                berry.body.setOffset(2, 2);
                berry.setDepth(5);
                berry.setData('collected', false);

                this.tweens.add({
                    targets: berry,
                    y: berry.y - 2,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.strawberryGroup.add(berry);
            }
        }
    }
}
