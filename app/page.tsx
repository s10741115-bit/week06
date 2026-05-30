'use client';

import React, { useState, useEffect, useRef } from 'react';

// Interfaces for our game engine
interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  isInvincible: boolean;
  invincibilityTimer: number;
}

interface Laser {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  originX: number; // for grid offset
  originY: number; // for grid offset
  width: number;
  height: number;
  type: 'RED' | 'CYAN' | 'GOLD';
  scoreValue: number;
  color: string;
  isDiving: boolean;
  diveAngle: number;
  diveSpeed: number;
  health: number;
  wingPhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

// Retro Sound Effects Synth using Web Audio API
class AudioSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLaser() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playEnemyLaser() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.2);
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playExplosion() {
    try {
      this.init();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.3; // 0.3 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.start();
      noise.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playPlayerHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playStartMelody() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const playTone = (freq: number, start: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.linearRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, now, 0.1);       // C5
      playTone(659.25, now + 0.1, 0.1); // E5
      playTone(783.99, now + 0.2, 0.1); // G5
      playTone(1046.50, now + 0.3, 0.25); // C6
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playGameOverMelody() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const playTone = (freq: number, start: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.linearRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(392.00, now, 0.15);       // G4
      playTone(349.23, now + 0.15, 0.15); // F4
      playTone(311.13, now + 0.3, 0.15);  // Eb4
      playTone(261.63, now + 0.45, 0.4);  // C4
    } catch (e) {
      console.log('Audio error:', e);
    }
  }
}

const audio = typeof window !== 'undefined' ? new AudioSynth() : null;

export default function Home() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'SUBMITTED'>('START');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Game Over form state
  const [playerName, setPlayerName] = useState<string>('');
  const [editableScore, setEditableScore] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Screen shake effect
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Input state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isMovingLeft = useRef<boolean>(false);
  const isMovingRight = useRef<boolean>(false);
  const isShootingTouch = useRef<boolean>(false);

  // Game Engine objects
  const stars = useRef<Star[]>([]);
  const player = useRef<Player>({
    x: 275,
    y: 620,
    width: 44,
    height: 44,
    speed: 6,
    isInvincible: false,
    invincibilityTimer: 0,
  });
  const lasers = useRef<Laser[]>([]);
  const enemyLasers = useRef<Laser[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const particles = useRef<Particle[]>([]);
  
  const lastShotTime = useRef<number>(0);
  const lastEnemyShotTime = useRef<number>(0);
  const enemyMoveDirection = useRef<number>(1); // 1 = right, -1 = left
  const enemyMoveTimer = useRef<number>(0);
  const enemyDiveTimer = useRef<number>(0);

  // Initialize Leaderboard & stars on mount
  useEffect(() => {
    fetchLeaderboard();
    initStars();
    
    // Attempt to load previously saved player name
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('galaga_player_name');
      if (savedName) setPlayerName(savedName);
    }
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/scores');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
        if (data.length > 0) {
          setHighScore(data[0].score);
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const initStars = () => {
    const tempStars: Star[] = [];
    const colors = ['#ffffff', '#00f0ff', '#ff007f', '#ffff33'];
    for (let i = 0; i < 80; i++) {
      tempStars.push({
        x: Math.random() * 600,
        y: Math.random() * 700,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    stars.current = tempStars;
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      if (e.key === ' ' && gameState === 'PLAYING') {
        e.preventDefault(); // Stop spacebar scrolling browser
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Start the game
  const startGame = () => {
    if (audio) audio.playStartMelody();
    
    setScore(0);
    setLives(3);
    setWave(1);
    setGameState('PLAYING');

    // Reset game entities
    player.current = {
      x: 278,
      y: 620,
      width: 44,
      height: 44,
      speed: 6,
      isInvincible: true,
      invincibilityTimer: 120, // 2 seconds of invincibility
    };
    lasers.current = [];
    enemyLasers.current = [];
    particles.current = [];
    enemyMoveDirection.current = 1;
    enemyMoveTimer.current = 0;
    enemyDiveTimer.current = 0;

    spawnEnemyGrid(1);
  };

  const spawnEnemyGrid = (currentWave: number) => {
    const tempEnemies: Enemy[] = [];
    const rows = 4;
    const cols = 6;
    const startX = 100;
    const startY = 80;
    const spacingX = 64;
    const spacingY = 50;

    let idCounter = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: 'RED' | 'CYAN' | 'GOLD' = 'RED';
        let scoreValue = 100;
        let color = '#ff3333';

        if (r === 0) {
          type = 'GOLD';
          scoreValue = 300;
          color = '#ffff33';
        } else if (r === 1) {
          type = 'CYAN';
          scoreValue = 200;
          color = '#00f0ff';
        }

        tempEnemies.push({
          id: idCounter++,
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          originX: startX + c * spacingX,
          originY: startY + r * spacingY,
          width: 32,
          height: 32,
          type,
          scoreValue,
          color,
          isDiving: false,
          diveAngle: 0,
          diveSpeed: 2 + currentWave * 0.4,
          health: 1,
          wingPhase: Math.random() * Math.PI * 2,
        });
      }
    }
    enemies.current = tempEnemies;
  };

  const createExplosion = (x: number, y: number, color: string) => {
    if (audio) audio.playExplosion();
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = Math.random() * 4 + 2;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        size: Math.random() * 3 + 1.5,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  };

  const triggerScreenShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  // Submit high score
  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    setIsSubmitting(true);
    try {
      // Save name for convenience next time
      localStorage.setItem('galaga_player_name', playerName);

      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playerName,
          score: parseInt(editableScore, 10) || 0,
        }),
      });

      if (response.ok) {
        const updatedLeaderboard = await response.json();
        setLeaderboard(updatedLeaderboard);
        if (updatedLeaderboard.length > 0) {
          setHighScore(updatedLeaderboard[0].score);
        }
        setGameState('SUBMITTED');
      } else {
        console.error('Failed to submit score');
      }
    } catch (error) {
      console.error('Score submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // The Main Loop running on requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrame = 0;

    const gameLoop = () => {
      localFrame++;
      
      // 1. UPDATE LOGIC
      // Stars background scrolling always
      stars.current.forEach(star => {
        star.y += star.speed;
        if (star.y > 700) {
          star.y = 0;
          star.x = Math.random() * 600;
        }
      });

      if (gameState === 'PLAYING') {
        // Update Player position
        let dx = 0;
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A'] || isMovingLeft.current) {
          dx = -player.current.speed;
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D'] || isMovingRight.current) {
          dx = player.current.speed;
        }
        player.current.x = Math.max(0, Math.min(600 - player.current.width, player.current.x + dx));

        // Player shooting
        const now = Date.now();
        if ((keysPressed.current[' '] || isShootingTouch.current) && now - lastShotTime.current > 200) {
          lasers.current.push({
            x: player.current.x + player.current.width / 2 - 2.5,
            y: player.current.y - 12,
            width: 5,
            height: 15,
            speed: 10,
            color: '#00f0ff',
          });
          lastShotTime.current = now;
          if (audio) audio.playLaser();
        }

        // Invincibility frame updates
        if (player.current.isInvincible) {
          player.current.invincibilityTimer--;
          if (player.current.invincibilityTimer <= 0) {
            player.current.isInvincible = false;
          }
        }

        // Update player lasers
        lasers.current.forEach(laser => {
          laser.y -= laser.speed;
        });
        lasers.current = lasers.current.filter(laser => laser.y > -20);

        // Update enemy lasers
        enemyLasers.current.forEach(laser => {
          laser.y += laser.speed;
        });
        enemyLasers.current = enemyLasers.current.filter(laser => laser.y < 720);

        // Update enemy grid offset swaying
        enemyMoveTimer.current += 0.02;
        const formationOffset = Math.sin(enemyMoveTimer.current) * 35; // move sways 35px side to side

        // Random diving selection
        enemyDiveTimer.current++;
        if (enemyDiveTimer.current > Math.max(60, 180 - wave * 20) && enemies.current.length > 0) {
          // Select a non-diving enemy
          const nonDiving = enemies.current.filter(e => !e.isDiving);
          if (nonDiving.length > 0) {
            const randomEnemy = nonDiving[Math.floor(Math.random() * nonDiving.length)];
            randomEnemy.isDiving = true;
            randomEnemy.diveAngle = 0;
          }
          enemyDiveTimer.current = 0;
        }

        // Update enemies position
        enemies.current.forEach(enemy => {
          enemy.wingPhase += 0.15;
          if (enemy.isDiving) {
            // Dive path towards the player, but swaying downwards
            enemy.y += enemy.diveSpeed;
            enemy.diveAngle += 0.05;
            enemy.x += Math.sin(enemy.diveAngle) * 3; // sways as it dives
            
            // Loop back to top if goes below
            if (enemy.y > 700) {
              enemy.y = -40;
              enemy.x = enemy.originX;
              enemy.isDiving = false;
            }
          } else {
            // Swaying pattern relative to their origin position
            enemy.x = enemy.originX + formationOffset;
          }

          // Enemy shooting
          if (Math.random() < 0.002 + wave * 0.001) {
            // Only cyan and gold or diving red enemies shoot
            if (enemy.type !== 'RED' || enemy.isDiving) {
              const nowEnemy = Date.now();
              // limit max shots slightly to avoid bullet hell
              if (nowEnemy - lastEnemyShotTime.current > 300 / wave && enemyLasers.current.length < 5 + wave) {
                enemyLasers.current.push({
                  x: enemy.x + enemy.width / 2 - 2,
                  y: enemy.y + enemy.height,
                  width: 4,
                  height: 12,
                  speed: 4.5 + wave * 0.3,
                  color: '#ff007f',
                });
                lastEnemyShotTime.current = nowEnemy;
                if (audio) audio.playEnemyLaser();
              }
            }
          }
        });

        // 2. COLLISION DETECTION
        // A. Player Lasers hitting Enemies
        lasers.current.forEach((laser, lIndex) => {
          enemies.current.forEach((enemy, eIndex) => {
            if (
              laser.x < enemy.x + enemy.width &&
              laser.x + laser.width > enemy.x &&
              laser.y < enemy.y + enemy.height &&
              laser.y + laser.height > enemy.y
            ) {
              // Hit!
              createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
              
              // Increment score
              setScore(prev => {
                const newScore = prev + enemy.scoreValue;
                // Keep the editable form field synchronized in real-time
                setEditableScore(newScore.toString());
                return newScore;
              });

              // Remove enemy & laser
              enemies.current.splice(eIndex, 1);
              lasers.current.splice(lIndex, 1);

              // Check if wave is clear
              if (enemies.current.length === 0) {
                setWave(prev => {
                  const nextWave = prev + 1;
                  spawnEnemyGrid(nextWave);
                  return nextWave;
                });
              }
            }
          });
        });

        // B. Enemy Lasers hitting Player
        if (!player.current.isInvincible) {
          enemyLasers.current.forEach((laser, lIndex) => {
            if (
              laser.x < player.current.x + player.current.width &&
              laser.x + laser.width > player.current.x &&
              laser.y < player.current.y + player.current.height &&
              laser.y + laser.height > player.current.y
            ) {
              // Player hit!
              enemyLasers.current.splice(lIndex, 1);
              handlePlayerHit();
            }
          });

          // C. Enemy Ships hitting Player
          enemies.current.forEach((enemy, eIndex) => {
            if (
              enemy.x < player.current.x + player.current.width &&
              enemy.x + enemy.width > player.current.x &&
              enemy.y < player.current.y + player.current.height &&
              enemy.y + enemy.height > player.current.y
            ) {
              // Collision!
              enemies.current.splice(eIndex, 1);
              createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
              handlePlayerHit();

              // Check if wave is clear after crash
              if (enemies.current.length === 0) {
                setWave(prev => {
                  const nextWave = prev + 1;
                  spawnEnemyGrid(nextWave);
                  return nextWave;
                });
              }
            }
          });
        }
      }

      // Update explosion particles
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      });
      particles.current = particles.current.filter(p => p.alpha > 0);

      // 3. RENDER GAME SCENE
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, 600, 700);

      // Draw scrolling stars
      stars.current.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.y / 700; // faint near top, bright near bottom
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });
      ctx.globalAlpha = 1.0; // Reset global alpha

      // Draw explosion particles
      particles.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });
      ctx.globalAlpha = 1.0;

      // Draw player lasers
      lasers.current.forEach(laser => {
        ctx.fillStyle = laser.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = laser.color;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        ctx.shadowBlur = 0;
      });

      // Draw enemy lasers
      enemyLasers.current.forEach(laser => {
        ctx.fillStyle = laser.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = laser.color;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        ctx.shadowBlur = 0;
      });

      // Draw player spaceship (neon glow custom vector design)
      if (gameState === 'PLAYING') {
        const p = player.current;
        const isFlicker = p.isInvincible && Math.floor(localFrame / 5) % 2 === 0;
        
        if (!isFlicker) {
          ctx.save();
          ctx.translate(p.x, p.y);
          
          // Draw engine thruster flame
          const flameHeight = 10 + Math.random() * 8;
          const grad = ctx.createLinearGradient(p.width / 2, p.height, p.width / 2, p.height + flameHeight);
          grad.addColorStop(0, '#ff007f');
          grad.addColorStop(0.5, '#ffea00');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(p.width / 2 - 6, p.height - 2);
          ctx.lineTo(p.width / 2 + 6, p.height - 2);
          ctx.lineTo(p.width / 2, p.height + flameHeight);
          ctx.closePath();
          ctx.fill();

          // Fighter jet body (retro wireframe style with filled cyan-green gradient)
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#39ff14';
          ctx.strokeStyle = '#39ff14';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';

          ctx.beginPath();
          ctx.moveTo(p.width / 2, 0); // Nose tip
          ctx.lineTo(p.width - 6, p.height - 10); // Right wing tip back
          ctx.lineTo(p.width - 2, p.height); // Right rear edge
          ctx.lineTo(p.width / 2 + 5, p.height - 5); // Right internal jet exhaust
          ctx.lineTo(p.width / 2 - 5, p.height - 5); // Left internal jet exhaust
          ctx.lineTo(2, p.height); // Left rear edge
          ctx.lineTo(6, p.height - 10); // Left wing tip back
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cockpit (glowing magenta)
          ctx.fillStyle = '#ff007f';
          ctx.shadowColor = '#ff007f';
          ctx.beginPath();
          ctx.arc(p.width / 2, p.height / 2 - 2, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }

      // Draw enemies
      enemies.current.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.shadowBlur = 8;
        ctx.shadowColor = enemy.color;
        
        const w = enemy.width;
        const h = enemy.height;
        
        // Wing movement animation
        const wingOffset = Math.sin(enemy.wingPhase) * 4;

        if (enemy.type === 'GOLD') {
          // Boss Gold Crab shape
          ctx.strokeStyle = '#ffff33';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(255, 255, 51, 0.15)';
          
          ctx.beginPath();
          ctx.moveTo(w / 2, 2);
          ctx.lineTo(w - 2 - wingOffset, h / 2 - 4); // Wings
          ctx.lineTo(w - 6, h - 2);
          ctx.lineTo(w / 2 + 4, h - 8);
          ctx.lineTo(w / 2 - 4, h - 8);
          ctx.lineTo(6, h - 2);
          ctx.lineTo(2 + wingOffset, h / 2 - 4); // Wings
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Blinking eyes
          ctx.fillStyle = '#ff007f';
          ctx.fillRect(w / 2 - 5, h / 2 - 4, 3, 3);
          ctx.fillRect(w / 2 + 2, h / 2 - 4, 3, 3);
        } else if (enemy.type === 'CYAN') {
          // Cyan Beetle shape
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';

          ctx.beginPath();
          ctx.moveTo(w / 2, 0); // sharp head
          ctx.lineTo(w - wingOffset, h / 3);
          ctx.lineTo(w - 4, h - 6);
          ctx.lineTo(w / 2, h);
          ctx.lineTo(4, h - 6);
          ctx.lineTo(wingOffset, h / 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Green glowing antennas
          ctx.strokeStyle = '#39ff14';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w / 2 - 3, 0);
          ctx.lineTo(w / 2 - 7, -6);
          ctx.moveTo(w / 2 + 3, 0);
          ctx.lineTo(w / 2 + 7, -6);
          ctx.stroke();
        } else {
          // Red Fly shape
          ctx.strokeStyle = '#ff3333';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(255, 51, 51, 0.15)';

          ctx.beginPath();
          ctx.moveTo(w / 2 - 4, 0);
          ctx.lineTo(w / 2 + 4, 0);
          ctx.lineTo(w - wingOffset, h / 2);
          ctx.lineTo(w - 6, h);
          ctx.lineTo(w / 2, h - 4);
          ctx.lineTo(6, h);
          ctx.lineTo(wingOffset, h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    const handlePlayerHit = () => {
      if (audio) audio.playPlayerHit();
      triggerScreenShake();
      
      const nextLives = lives - 1;
      setLives(nextLives);
      
      if (nextLives <= 0) {
        // Game Over!
        setGameState('GAMEOVER');
        if (audio) audio.playGameOverMelody();
      } else {
        // Lose 1 life, respawn player in center with invincibility
        player.current.x = 278;
        player.current.y = 620;
        player.current.isInvincible = true;
        player.current.invincibilityTimer = 120; // 2 seconds
        
        // Clear screen of lasers to give a fair respawn
        enemyLasers.current = [];
      }
    };

    // Run the animation loop
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameState, lives, wave]);


  return (
    <div className={`crt-container ${isShaking ? 'shake' : ''}`}>
      
      {/* Screen Layout: Split Grid on Desktop */}
      <div className="arcade-screen-layout">
        
        {/* Left: Arcade Machine Cabinet containing Canvas */}
        <div className="cabinet-container select-none">
          
          {/* Cabinet Border & Canvas Wrapper */}
          <div className="cabinet-monitor">
            
            {/* Top HUD Display - Integrated into Cabinet monitor */}
            <header className="arcade-hud">
              <div className="hud-item">
                <div className="hud-label pixel-text">SCORE</div>
                <div className="hud-val score pixel-text">{score}</div>
              </div>
              <div className="hud-item align-center">
                <div className="hud-label pixel-text">WAVE</div>
                <div className="hud-val wave pixel-text">{wave}</div>
              </div>
              <div className="hud-item align-end">
                <div className="hud-label pixel-text">HIGH SCORE</div>
                <div className="hud-val high pixel-text">{Math.max(highScore, score)}</div>
              </div>
            </header>

            <canvas
              ref={canvasRef}
              width={600}
              height={700}
              className="game-canvas"
            />

            {/* START SCREEN PANEL OVERLAY */}
            {gameState === 'START' && (
              <div className="overlay-panel">
                <div className="overlay-content">
                  <h1 className="overlay-title pixel-text">
                    GALAGA
                  </h1>
                  <p className="overlay-sub pixel-text">
                    RETRO ARCADE SPACE INVADER
                  </p>
                  
                  <div className="instructions-card">
                    <span className="instructions-title pixel-text">CONTROLS:</span>
                    <span className="instructions-text pixel-text">← / → or A / D : Move Spaceship</span>
                    <span className="instructions-text pixel-text">Spacebar : Fire Laser</span>
                  </div>

                  <button
                    onClick={startGame}
                    className="neon-button green"
                  >
                    Insert Coin
                  </button>
                </div>
              </div>
            )}

            {/* GAME OVER PANEL OVERLAY */}
            {(gameState === 'GAMEOVER' || gameState === 'SUBMITTED') && (
              <div className="overlay-panel">
                <div className="overlay-content">
                  <h2 className="overlay-title pixel-text" style={{ color: 'var(--arcade-red)', textShadow: '0 0 8px rgba(255, 51, 51, 0.4)' }}>
                    GAME OVER
                  </h2>
                  
                  <div className="stat-grid">
                    <div className="stat-item">
                      <div className="stat-lbl pixel-text">SCORE</div>
                      <div className="stat-val pixel-text">{score}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-lbl pixel-text">WAVE</div>
                      <div className="stat-val cyan pixel-text">{wave}</div>
                    </div>
                  </div>

                  {gameState === 'GAMEOVER' ? (
                    <form onSubmit={handleScoreSubmit} className="overlay-form">
                      <div className="form-group">
                        <label className="form-label pixel-text">PILOT NAME (3-10 CHARS):</label>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                          placeholder="HERO"
                          className="arcade-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label pink pixel-text">CONFIRM/EDIT SCORE:</label>
                        <input
                          type="number"
                          required
                          value={editableScore}
                          onChange={(e) => setEditableScore(e.target.value)}
                          placeholder="0"
                          className="arcade-input"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !playerName.trim()}
                        className="neon-button pink"
                      >
                        {isSubmitting ? 'UPLOADING...' : 'SUBMIT HIGH SCORE'}
                      </button>
                    </form>
                  ) : (
                    <div className="overlay-form" style={{ textAlign: 'center' }}>
                      <p className="pixel-text" style={{ fontSize: '9px', color: 'var(--neon-green)', lineHeight: 1.5 }}>
                        SCORE SUBMITTED TO STARBASE!
                      </p>
                      <button
                        onClick={startGame}
                        className="neon-button green"
                      >
                        PLAY AGAIN
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setGameState('START');
                      fetchLeaderboard();
                    }}
                    className="neon-button"
                    style={{ fontSize: '9px', padding: '8px 15px' }}
                  >
                    Main Menu
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* On-screen Controls for Mobile/Touch / Mouse play */}
          <div className="control-deck select-none">
            {/* Left/Right movement buttons */}
            <div className="control-deck-left">
              <button
                onTouchStart={() => { isMovingLeft.current = true; }}
                onTouchEnd={() => { isMovingLeft.current = false; }}
                onMouseDown={() => { isMovingLeft.current = true; }}
                onMouseUp={() => { isMovingLeft.current = false; }}
                onMouseLeave={() => { isMovingLeft.current = false; }}
                className="control-btn"
                title="Move Left"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onTouchStart={() => { isMovingRight.current = true; }}
                onTouchEnd={() => { isMovingRight.current = false; }}
                onMouseDown={() => { isMovingRight.current = true; }}
                onMouseUp={() => { isMovingRight.current = false; }}
                onMouseLeave={() => { isMovingRight.current = false; }}
                className="control-btn"
                title="Move Right"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Lives overlay inside active gaming */}
            {gameState === 'PLAYING' && (
              <div className="lives-deck select-none">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <svg
                    key={idx}
                    className={`live-icon ${idx >= lives ? 'lost' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L4 21h4l4-5 4 5h4L12 2z" />
                  </svg>
                ))}
              </div>
            )}

            {/* Shoot Action Button */}
            <button
              onTouchStart={() => { isShootingTouch.current = true; }}
              onTouchEnd={() => { isShootingTouch.current = false; }}
              onMouseDown={() => { isShootingTouch.current = true; }}
              onMouseUp={() => { isShootingTouch.current = false; }}
              className="fire-btn"
              title="Fire Laser"
            >
              <span className="fire-btn-text pixel-text">FIRE</span>
            </button>
          </div>
        </div>

        {/* Right: Leaderboard High Score Panel */}
        <div className="arcade-panel max-height-limit">
          <div className="flex flex-col items-center text-center pb-1.5 border-b border-zinc-800" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #222233' }}>
            <h3 className="pixel-text" style={{ fontSize: '14px', color: 'var(--neon-yellow)', textShadow: '0 0 4px rgba(255,255,51,0.4)', margin: 0 }}>
              LEADERBOARD
            </h3>
            <span className="pixel-text" style={{ fontSize: '7px', color: '#555566', marginTop: '4px' }}>STARBASE COMMAND HIGH SCORES</span>
          </div>

          <div style={{ flexGrow: 1, overflowY: 'auto', margin: '8px 0', minHeight: '150px' }}>
            {leaderboard.length === 0 ? (
              <div className="pixel-text blink-text" style={{ textAlign: 'center', padding: '30px 0', color: '#555566', fontSize: '8px' }}>
                LOADING LEADERS...
              </div>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>PILOT</th>
                    <th>SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const rankClass = index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : '';
                    return (
                      <tr key={index} className={rankClass}>
                        <td className="font-bold">{(index + 1).toString().padStart(2, '0')}</td>
                        <td>{entry.name}</td>
                        <td className="tracking-wider">{entry.score.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="pixel-text" style={{ paddingTop: '8px', borderTop: '1px solid #222233', display: 'flex', justifyContent: 'space-between', color: '#444455', fontSize: '7px' }}>
            <span>GALAGA v1.0.0</span>
            <span>SYSTEM READY</span>
          </div>
        </div>

      </div>
    </div>
  );
}
