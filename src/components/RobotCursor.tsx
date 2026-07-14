import React, { useEffect, useState, useRef } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  color: string;
}

export default function RobotCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    // Detect touch device
    const onTouchStart = () => {
      isTouchDevice.current = true;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    let animationFrameId: number;
    let targetX = -100; // start off-screen
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;

    const moveCursor = (e: MouseEvent | TouchEvent) => {
      if (isTouchDevice.current && e.type === 'mousemove') return; // Ignore mouse if touch
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      // Position slightly above right of the cursor
      targetX = clientX + 15;
      targetY = clientY - 35;
      
      // If it's the very first move, snap immediately
      if (currentX === -100 && currentY === -100) {
        currentX = targetX;
        currentY = targetY;
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
          cursorRef.current.style.opacity = '1';
        }
      }
    };
    
    // Smooth follow loop for the robot cursor
    const loop = () => {
      if (cursorRef.current && currentX !== -100) {
        // Easing interpolation for smooth following
        currentX += (targetX - currentX) * 0.15;
        currentY += (targetY - currentY) * 0.15;
        cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    const addParticles = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const colors = ['#0ea5e9', '#06b6d4', '#eab308']; // brand-blue, brand-cyan, yellow

      const newParticles = Array.from({ length: 6 }).map((_, i) => ({
        id: Date.now() + i,
        x: clientX,
        y: clientY,
        angle: (i * (360 / 6)) * (Math.PI / 180) + (Math.random() * 0.5), // spread in a circle with slight randomness
        distance: 25 + Math.random() * 25,
        color: colors[Math.floor(Math.random() * colors.length)]
      }));

      setParticles((prev) => [...prev, ...newParticles]);

      setTimeout(() => {
        setParticles((prev) => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 700);
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('touchmove', moveCursor, { passive: true });
    window.addEventListener('mousedown', addParticles);
    window.addEventListener('touchstart', addParticles, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('touchmove', moveCursor);
      window.removeEventListener('mousedown', addParticles);
      window.removeEventListener('touchstart', addParticles);
      window.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  return (
    <>
      {/* Robot Cursor (Hidden on small touch devices, mostly for desktop/mouse) */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] opacity-0 hidden sm:block"
        style={{ willChange: 'transform' }}
      >
        <motion.div
          animate={{
            y: [0, -6, 0],
            rotate: [-5, 5, -5]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-brand-blue bg-white/70 rounded-2xl p-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.08)] backdrop-blur-md border border-brand-blue/30 flex items-center justify-center"
        >
          <Bot size={20} strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* Click/Touch Particle Effects */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 1, scale: 0, x: particle.x, y: particle.y }}
            animate={{ 
              opacity: 0, 
              scale: Math.random() * 0.8 + 0.4, 
              x: particle.x + Math.cos(particle.angle) * particle.distance, 
              y: particle.y + Math.sin(particle.angle) * particle.distance 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed pointer-events-none z-[9998]"
            style={{ color: particle.color }}
          >
            <Sparkles size={14} className="opacity-80 drop-shadow-md" />
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
