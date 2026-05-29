/**
 * Player - PICO-8 style precision platformer character
 * Instant movement (no inertia), Space=jump, Shift/X=dash
 * Features: Coyote time, jump buffering, variable jump, double jump, simple dash
 */
import Phaser from 'phaser';

const MAX_FALL_SPEED = 200;
const COYOTE_TIME = 80;
const JUMP_BUFFER_TIME = 100;
const JUMP_CUT_MULT = 0.45;
const DASH_SPEED = 350;
const DASH_DURATION = 120;

export class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_sheet', 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setSize(5, 6);
        this.body.setOffset(1, 2);
        this.body.setMaxVelocityY(MAX_FALL_SPEED);
        this.body.setDragX(0);
        this.body.setCollideWorldBounds(true);

        this.runSpeed = 80;
        this.jumpSpeed = -260;
        this.doubleJumpSpeed = -230;

        this.state = 'idle';
        this.facingRight = true;
        this.isDead = false;

        // Jump
        this.isGrounded = false;
        this.wasGrounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpCount = 0;
        this.isJumping = false;

        // Dash
        this.isDashing = false;
        this.dashTimer = 0;
        this.canDash = true;
        this.dashDirection = { x: 0, y: 0 };

        // Checkpoint
        this.spawnX = x;
        this.spawnY = y;
        this.checkpointX = x;
        this.checkpointY = y;

        // Input — Space/Z = jump, W is NOT jump anymore
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keyW = scene.input.keyboard.addKey('W');
        this.keyA = scene.input.keyboard.addKey('A');
        this.keyS = scene.input.keyboard.addKey('S');
        this.keyD = scene.input.keyboard.addKey('D');
        this.keySpace = scene.input.keyboard.addKey('SPACE');
        this.keyZ = scene.input.keyboard.addKey('Z');
        this.keyK = scene.input.keyboard.addKey('K');

        this.setupSounds();
        this.setDepth(10);
    }

    setupSounds() {
        this.audioCtx = null;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { /* no audio */ }
    }

    updateSpeed(strawberries) {
        this.runSpeed = 80 + (strawberries * 10);
        if (this.runSpeed > 300) this.runSpeed = 300; // Cap speed

        // Aumenta o pulo de forma mais drástica (15 por morango)
        this.jumpSpeed = -260 - (strawberries * 15);
        if (this.jumpSpeed < -550) this.jumpSpeed = -550; // Limite máximo alto

        this.doubleJumpSpeed = -230 - (strawberries * 12);
        if (this.doubleJumpSpeed < -480) this.doubleJumpSpeed = -480;
    }

    playSound(type) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
            case 'jump':
                osc.type = 'square';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(500, now + 0.08);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            case 'doublejump':
                osc.type = 'square';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.1);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
                break;
            case 'dash':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.12);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
                break;
            case 'land':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.linearRampToValueAtTime(60, now + 0.06);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
                break;
            case 'death':
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.35);
                osc.start(now); osc.stop(now + 0.35);
                break;
            case 'collect':
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.linearRampToValueAtTime(900, now + 0.08);
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
                // Second tone
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2); gain2.connect(ctx.destination);
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(800, now + 0.08);
                osc2.frequency.linearRampToValueAtTime(1200, now + 0.2);
                gain2.gain.setValueAtTime(0.05, now + 0.08);
                gain2.gain.linearRampToValueAtTime(0, now + 0.25);
                osc2.start(now + 0.08); osc2.stop(now + 0.25);
                break;
        }
    }

    getInputX() {
        let x = 0;
        if (this.cursors.left.isDown || this.keyA.isDown) x -= 1;
        if (this.cursors.right.isDown || this.keyD.isDown) x += 1;
        return x;
    }

    getInputY() {
        let y = 0;
        if (this.cursors.up.isDown || this.keyW.isDown) y -= 1;
        if (this.cursors.down.isDown || this.keyS.isDown) y += 1;
        return y;
    }

    isJumpPressed() {
        return Phaser.Input.Keyboard.JustDown(this.keySpace) ||
            Phaser.Input.Keyboard.JustDown(this.keyZ) ||
            Phaser.Input.Keyboard.JustDown(this.keyW);
    }

    isJumpHeld() {
        return this.keySpace.isDown || this.keyZ.isDown || this.keyW.isDown;
    }

    isDashPressed() {
        return Phaser.Input.Keyboard.JustDown(this.keyK);
    }

    update(time, delta) {
        if (this.isDead) return;

        const dtMs = delta;

        // Ground detection
        this.wasGrounded = this.isGrounded;
        this.isGrounded = this.body.blocked.down || this.body.touching.down;

        if (this.isGrounded && !this.wasGrounded) {
            this.onLand();
        }

        if (this.isGrounded) {
            this.coyoteTimer = COYOTE_TIME;
            this.jumpCount = 0;
            this.canDash = true;
            this.isJumping = false;
        } else {
            this.coyoteTimer -= dtMs;
            if (this.coyoteTimer <= 0 && this.jumpCount === 0) {
                this.jumpCount = 1;
            }
        }

        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= dtMs;
        }

        // Dash state
        if (this.isDashing) {
            this.updateDash(dtMs);
            return;
        }

        // ── INSTANT horizontal movement (no inertia) ──
        const inputX = this.getInputX();
        if (inputX !== 0) {
            this.body.velocity.x = inputX * this.runSpeed;
            this.facingRight = inputX > 0;
            this.setFlipX(!this.facingRight);
        } else {
            this.body.velocity.x = 0; // instant stop
        }

        // Jump input
        if (this.isJumpPressed()) {
            this.jumpBufferTimer = JUMP_BUFFER_TIME;
        }

        // Execute jump
        if (this.jumpBufferTimer > 0) {
            if (this.coyoteTimer > 0) {
                this.jump();
            } else if (this.jumpCount < 2) {
                this.doubleJump();
            }
        }

        // Variable jump height
        if (this.isJumping && !this.isJumpHeld() && this.body.velocity.y < 0) {
            this.body.velocity.y *= JUMP_CUT_MULT;
            this.isJumping = false;
        }

        // Dash
        if (this.isDashPressed() && this.canDash) {
            this.startDash();
        }

        this.updateAnimation();
    }

    jump() {
        this.body.velocity.y = this.jumpSpeed;
        this.isJumping = true;
        this.jumpCount = 1;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;
        this.playSound('jump');
        this.emitDust();
    }

    doubleJump() {
        this.body.velocity.y = this.doubleJumpSpeed;
        this.jumpCount = 2;
        this.isJumping = true;
        this.jumpBufferTimer = 0;
        this.playSound('doublejump');
        this.emitDust();
    }

    startDash() {
        const inputX = this.getInputX();
        const inputY = this.getInputY();
        
        let dx = inputX;
        let dy = inputY;

        // Se não apertar nenhuma direção, dá dash reto pra onde está olhando
        if (dx === 0 && dy === 0) {
            dx = this.facingRight ? 1 : -1;
        }

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) { dx /= len; dy /= len; }

        this.dashDirection = { x: dx, y: dy };
        this.isDashing = true;
        this.dashTimer = DASH_DURATION;
        this.canDash = false;

        this.body.velocity.x = dx * DASH_SPEED;
        this.body.velocity.y = dy * DASH_SPEED;
        this.body.allowGravity = false;

        this.playSound('dash');
    }

    updateDash(dtMs) {
        this.dashTimer -= dtMs;

        // Emit simple trail particles (no ghost sprites)
        if (this.scene && this.scene.trailEmitter) {
            this.scene.trailEmitter.emitParticleAt(this.x, this.y, 1);
        }

        if (this.dashTimer <= 0) {
            this.endDash();
        }

        this.play('player_sheet_dash', true);
    }

    endDash() {
        this.isDashing = false;
        this.body.allowGravity = true;
        this.body.velocity.x *= 0.4;
        this.body.velocity.y *= 0.3;
        if (this.body.velocity.y < 0) {
            this.isJumping = true;
        }
    }

    onLand() {
        this.playSound('land');
        this.emitDust();
    }

    emitDust() {
        if (!this.scene || !this.scene.dustEmitter) return;
        this.scene.dustEmitter.emitParticleAt(this.x, this.y + 3, 3);
    }

    updateAnimation() {
        const prefix = this.canDash ? 'player_sheet_' : 'player_sheet_nodash_';

        if (this.isDashing) {
            this.play(`${prefix}dash`, true);
        } else if (!this.isGrounded) {
            if (this.body.velocity.y < 0) {
                this.play(`${prefix}jump`, true);
            } else {
                this.play(`${prefix}fall`, true);
            }
        } else if (Math.abs(this.body.velocity.x) > 5) {
            this.play(`${prefix}run`, true);
        } else {
            this.play(`${prefix}idle`, true);
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isDashing = false;
        this.body.allowGravity = true;
        this.playSound('death');

        if (this.scene && this.scene.deathEmitter) {
            this.scene.deathEmitter.emitParticleAt(this.x, this.y, 8);
        }
        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(150, 0.008);
        }

        this.setVisible(false);
        this.body.velocity.set(0, 0);
        this.body.allowGravity = false;

        // Instant respawn
        this.scene.time.delayedCall(50, () => {
            this.respawn();
        });
    }

    respawn() {
        this.setPosition(this.checkpointX, this.checkpointY);
        this.body.velocity.set(0, 0);
        this.body.allowGravity = true;
        this.isDead = false;
        this.setVisible(true);
        this.isDashing = false;
        this.dashTimer = 0;
        this.canDash = true;
        this.jumpCount = 0;
        this.isJumping = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.setAlpha(1);

        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.3, to: 1 },
            duration: 200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 1
        });
    }

    setCheckpoint(x, y) {
        this.checkpointX = x;
        this.checkpointY = y;
    }

    destroy() {
        super.destroy();
    }
}
