/**
 * Player - Precision platformer character with Celeste-inspired mechanics
 * Features: Coyote time, jump buffering, variable jump, double jump, dash with ghost trail
 */
import Phaser from 'phaser';

// Physics constants
const RUN_MAX_SPEED = 100;
const RUN_ACCEL = 1800;         // Very high accel → instant response
const AIR_ACCEL = 1400;         // Tight air control
const GROUND_FRICTION = 0.12;   // Multiplier kept per frame when no input (ground) — stops in ~2 frames
const AIR_FRICTION = 0.30;      // Slightly more slide in air for natural feel
const TURN_MULTIPLIER = 2.5;    // Extra accel when reversing direction
const STOP_THRESHOLD = 8;       // Below this speed, snap to 0
const JUMP_VELOCITY = -265;
const DOUBLE_JUMP_VELOCITY = -240;
const MAX_FALL_SPEED = 250;
const COYOTE_TIME = 80;       // ms
const JUMP_BUFFER_TIME = 100; // ms
const JUMP_CUT_MULT = 0.45;   // velocity multiplier on early jump release
const DASH_SPEED = 200;
const DASH_DURATION = 130;     // ms
const DASH_COOLDOWN = 0;       // resets on ground
const GHOST_INTERVAL = 25;     // ms between ghost sprites

export class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_sheet', 0);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Physics body setup
        this.body.setSize(8, 14);
        this.body.setOffset(2, 2);
        this.body.setMaxVelocityY(MAX_FALL_SPEED);
        this.body.setDragX(0); // We handle drag manually for tighter control

        // State
        this.state = 'idle'; // idle, run, jump, fall, dash, dead
        this.facingRight = true;
        this.isDead = false;

        // Jump system
        this.isGrounded = false;
        this.wasGrounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpCount = 0;
        this.isJumping = false;
        this.jumpHeld = false;

        // Dash system
        this.isDashing = false;
        this.dashTimer = 0;
        this.canDash = true;
        this.dashDirection = { x: 0, y: 0 };
        this.ghostTimer = 0;
        this.ghosts = [];

        // Checkpoint
        this.spawnX = x;
        this.spawnY = y;
        this.checkpointX = x;
        this.checkpointY = y;

        // Input
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keyW = scene.input.keyboard.addKey('W');
        this.keyA = scene.input.keyboard.addKey('A');
        this.keyS = scene.input.keyboard.addKey('S');
        this.keyD = scene.input.keyboard.addKey('D');
        this.keySpace = scene.input.keyboard.addKey('SPACE');
        this.keyShift = scene.input.keyboard.addKey('SHIFT');
        this.keyX = scene.input.keyboard.addKey('X');
        this.keyZ = scene.input.keyboard.addKey('Z');

        // Sound generation
        this.setupSounds();

        this.setDepth(10);
    }

    setupSounds() {
        // We'll generate sounds via Web Audio API
        this.audioCtx = null;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            // Audio not supported
        }
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
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'doublejump':
                osc.type = 'square';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.1);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
                break;
            case 'dash':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.12);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'land':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.linearRampToValueAtTime(60, now + 0.06);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
                break;
            case 'death':
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
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
            Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.keyW) ||
            Phaser.Input.Keyboard.JustDown(this.keyZ);
    }

    isJumpHeld() {
        return this.keySpace.isDown || this.cursors.up.isDown || this.keyW.isDown || this.keyZ.isDown;
    }

    isDashPressed() {
        return Phaser.Input.Keyboard.JustDown(this.keyShift) ||
            Phaser.Input.Keyboard.JustDown(this.keyX);
    }

    update(time, delta) {
        if (this.isDead) return;

        const dt = delta / 1000;
        const dtMs = delta;

        // Ground detection
        this.wasGrounded = this.isGrounded;
        this.isGrounded = this.body.blocked.down || this.body.touching.down;

        // Just landed
        if (this.isGrounded && !this.wasGrounded) {
            this.onLand();
        }

        // Reset abilities on ground
        if (this.isGrounded) {
            this.coyoteTimer = COYOTE_TIME;
            this.jumpCount = 0;
            this.canDash = true;
            this.isJumping = false;
        } else {
            this.coyoteTimer -= dtMs;
            // If we fall off a ledge without jumping, we've "used" the first jump
            if (this.coyoteTimer <= 0 && this.jumpCount === 0) {
                this.jumpCount = 1;
            }
        }

        // Jump buffer
        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= dtMs;
        }

        // Handle dash state
        if (this.isDashing) {
            this.updateDash(dtMs);
            return;
        }

        // Input
        const inputX = this.getInputX();

        // ── Horizontal movement: high accel, near-instant stop ──
        if (inputX !== 0) {
            const accel = this.isGrounded ? RUN_ACCEL : AIR_ACCEL;
            const targetVelX = inputX * RUN_MAX_SPEED;
            const currentVelX = this.body.velocity.x;

            // Turning around gets an extra boost so direction changes feel instant
            const isTurning = (Math.sign(targetVelX) !== Math.sign(currentVelX) && currentVelX !== 0);
            const effectiveAccel = isTurning ? accel * TURN_MULTIPLIER : accel;

            // Move toward target speed
            const diff = targetVelX - currentVelX;
            const step = effectiveAccel * dt;

            if (Math.abs(diff) <= step) {
                this.body.velocity.x = targetVelX;
            } else {
                this.body.velocity.x += Math.sign(diff) * step;
            }

            this.facingRight = inputX > 0;
            this.setFlipX(!this.facingRight);
        } else {
            // No input → apply strong friction to kill velocity fast
            const friction = this.isGrounded ? GROUND_FRICTION : AIR_FRICTION;
            this.body.velocity.x *= friction;

            // Snap to zero when below threshold to avoid micro-drift
            if (Math.abs(this.body.velocity.x) < STOP_THRESHOLD) {
                this.body.velocity.x = 0;
            }
        }

        // Jump input
        if (this.isJumpPressed()) {
            this.jumpBufferTimer = JUMP_BUFFER_TIME;
        }

        // Execute jump (with buffer and coyote time)
        if (this.jumpBufferTimer > 0) {
            if (this.coyoteTimer > 0) {
                this.jump();
            } else if (this.jumpCount < 2) {
                this.doubleJump();
            }
        }

        // Variable jump height - cut velocity on early release
        if (this.isJumping && !this.isJumpHeld() && this.body.velocity.y < 0) {
            this.body.velocity.y *= JUMP_CUT_MULT;
            this.isJumping = false;
        }

        // Dash input
        if (this.isDashPressed() && this.canDash) {
            this.startDash();
        }

        // Animation
        this.updateAnimation();

        // Clean up old ghosts
        this.cleanGhosts(dtMs);
    }

    jump() {
        this.body.velocity.y = JUMP_VELOCITY;
        this.isJumping = true;
        this.jumpCount = 1;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;
        this.playSound('jump');
        this.emitDust();
    }

    doubleJump() {
        this.body.velocity.y = DOUBLE_JUMP_VELOCITY;
        this.jumpCount = 2;
        this.isJumping = true;
        this.jumpBufferTimer = 0;
        this.playSound('doublejump');
        this.emitDust();
    }

    startDash() {
        const inputX = this.getInputX();
        const inputY = this.getInputY();

        // Default to facing direction if no input
        let dx = inputX || (this.facingRight ? 1 : -1);
        let dy = inputY;

        // Normalize
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        this.dashDirection = { x: dx, y: dy };
        this.isDashing = true;
        this.dashTimer = DASH_DURATION;
        this.canDash = false;
        this.ghostTimer = 0;

        // Set velocity
        this.body.velocity.x = dx * DASH_SPEED;
        this.body.velocity.y = dy * DASH_SPEED;
        this.body.allowGravity = false;

        this.playSound('dash');
        this.emitDashTrail();
    }

    updateDash(dtMs) {
        this.dashTimer -= dtMs;
        this.ghostTimer -= dtMs;

        // Spawn ghost sprites
        if (this.ghostTimer <= 0) {
            this.spawnGhost();
            this.ghostTimer = GHOST_INTERVAL;
        }

        // Dash particles
        this.emitDashTrail();

        if (this.dashTimer <= 0) {
            this.endDash();
        }

        // Update animation
        this.play('player_dash', true);
    }

    endDash() {
        this.isDashing = false;
        this.body.allowGravity = true;

        // Preserve some momentum
        this.body.velocity.x *= 0.5;
        this.body.velocity.y *= 0.3;

        // If going up after dash, allow jump cut behavior
        if (this.body.velocity.y < 0) {
            this.isJumping = true;
        }
    }

    spawnGhost() {
        const ghost = this.scene.add.sprite(this.x, this.y, 'player_sheet', this.frame.name);
        ghost.setAlpha(0.4);
        ghost.setTint(0x80c0ff);
        ghost.setFlipX(this.flipX);
        ghost.setDepth(9);
        ghost.life = 200; // ms
        this.ghosts.push(ghost);
    }

    cleanGhosts(dtMs) {
        for (let i = this.ghosts.length - 1; i >= 0; i--) {
            this.ghosts[i].life -= dtMs;
            this.ghosts[i].setAlpha(Math.max(0, this.ghosts[i].life / 200) * 0.4);
            if (this.ghosts[i].life <= 0) {
                this.ghosts[i].destroy();
                this.ghosts.splice(i, 1);
            }
        }
    }

    onLand() {
        this.playSound('land');
        this.emitDust();
    }

    emitDust() {
        if (!this.scene || !this.scene.dustEmitter) return;
        this.scene.dustEmitter.emitParticleAt(this.x, this.y + 7, 5);
    }

    emitDashTrail() {
        if (!this.scene || !this.scene.trailEmitter) return;
        this.scene.trailEmitter.emitParticleAt(this.x, this.y, 2);
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
        } else if (Math.abs(this.body.velocity.x) > 10) {
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

        // Death particles
        if (this.scene && this.scene.deathEmitter) {
            this.scene.deathEmitter.emitParticleAt(this.x, this.y, 15);
        }

        // Screen shake
        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(200, 0.01);
        }

        this.setVisible(false);
        this.body.velocity.set(0, 0);
        this.body.allowGravity = false;

        // Respawn after delay
        this.scene.time.delayedCall(500, () => {
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

        // Flash effect
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.3, to: 1 },
            duration: 300,
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
        // Clean up ghosts
        this.ghosts.forEach(g => g.destroy());
        this.ghosts = [];
        super.destroy();
    }
}
