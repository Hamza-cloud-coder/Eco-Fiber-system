'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Hexagon } from 'lucide-react';
import { cn } from '../utils/cn';

// --- Global Styles & Keyframes tailored for White theme layout with Dark Lumina cards ---
export function GlobalStyles() {
  return (
    <style jsx global>{`
      @keyframes border-beam {
        100% { offset-distance: 100%; }
      }

      .border-beam {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        pointer-events: none;
        border-radius: inherit;
        border: 1px solid transparent;
        mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
      }

      .border-beam::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        aspect-ratio: 1;
        width: 100px;
        background: linear-gradient(to left, #6366f1, #a855f7, #ec4899);
        offset-path: rect(0 auto auto 0 round 1.5rem);
        animation: border-beam 4s linear infinite;
      }

      .noise-bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 50;
        opacity: 0.02;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
      }

      /* Base layout theme resets: Force body to white background and hide old blobs */
      body {
        background-color: #ffffff !important;
        color: #1e293b !important;
      }
      
      .mesh-bg {
        background-color: #ffffff !important;
      }

      .blob {
        display: none !important;
      }

      /* Card overrides: Force dark glass aesthetic for FrostCards inside the white content frame */
      .frost-card, .lumina-card {
        background: linear-gradient(135deg, #181b40 0%, #0d0e28 100%) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.25) !important;
      }

      .frost-card h1, .frost-card h2, .frost-card h3, .frost-card h4, .frost-card h5, .frost-card h6,
      .lumina-card h1, .lumina-card h2, .lumina-card h3, .lumina-card h4, .lumina-card h5, .lumina-card h6 {
        color: #ffffff !important;
      }

      /* Text color resets inside dark cards */
      .frost-card .text-slate-800, .frost-card .text-gray-800, .frost-card .text-slate-900, .frost-card .text-slate-700,
      .lumina-card .text-slate-800, .lumina-card .text-gray-800, .lumina-card .text-slate-900, .lumina-card .text-slate-700 {
        color: #f1f5f9 !important;
      }

      /* Force dark slate text for white buttons inside dark glass cards to prevent white-on-white text visibility bug */
      .frost-card button.bg-white, .lumina-card button.bg-white,
      .frost-card button.bg-slate-50, .lumina-card button.bg-slate-50,
      .frost-card button.bg-slate-100, .lumina-card button.bg-slate-100,
      .frost-card button.bg-slate-200, .lumina-card button.bg-slate-200,
      .frost-card a.bg-white, .lumina-card a.bg-white {
        color: #0f172a !important;
      }

      .frost-card .text-slate-500, .frost-card .text-slate-400, .frost-card .text-gray-500, .frost-card .text-slate-450,
      .lumina-card .text-slate-500, .lumina-card .text-slate-400, .lumina-card .text-gray-500, .lumina-card .text-slate-450 {
        color: #94a3b8 !important;
      }

      .frost-card .text-slate-600, .frost-card .text-slate-350,
      .lumina-card .text-slate-600, .lumina-card .text-slate-350 {
        color: #cbd5e1 !important;
      }

      /* Force form elements inside dark cards to look beautifully premium */
      .frost-card input, .frost-card select, .frost-card textarea,
      .lumina-card input, .lumina-card select, .lumina-card textarea {
        background-color: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
      }

      .frost-card input:focus, .frost-card select:focus, .frost-card textarea:focus,
      .lumina-card input:focus, .lumina-card select:focus, .lumina-card textarea:focus {
        border-color: rgba(99, 102, 241, 0.5) !important;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
        background-color: rgba(255, 255, 255, 0.06) !important;
      }

      .frost-card select option, .lumina-card select option {
        background-color: #0d0e28 !important;
        color: #ffffff !important;
      }

      /* Force table cells and borders to look excellent in dark layout */
      .frost-card table tr, .lumina-card table tr {
        border-bottom-color: rgba(255, 255, 255, 0.06) !important;
      }
      
      .frost-card table tr:hover, .lumina-card table tr:hover {
        background-color: rgba(255, 255, 255, 0.02) !important;
      }

      .frost-card table th, .lumina-card table th {
        color: #94a3b8 !important;
        border-bottom-color: rgba(255, 255, 255, 0.1) !important;
      }

      .frost-card table td, .lumina-card table td {
        color: #cbd5e1 !important;
      }

      .frost-card .border-slate-200, .frost-card .border-slate-100, .frost-card .border-slate-300,
      .lumina-card .border-slate-200, .lumina-card .border-slate-100, .lumina-card .border-slate-300 {
        border-color: rgba(255, 255, 255, 0.06) !important;
      }

      /* Pills and mini stats */
      .frost-card .bg-indigo-50, .frost-card .bg-purple-50, .frost-card .bg-amber-50, .frost-card .bg-emerald-50, .frost-card .bg-rose-50,
      .lumina-card .bg-indigo-50, .lumina-card .bg-purple-50, .lumina-card .bg-amber-50, .lumina-card .bg-emerald-50, .lumina-card .bg-rose-50 {
        background-color: rgba(99, 102, 241, 0.12) !important;
        color: #cbd5e1 !important;
      }

      .frost-card .text-indigo-650, .frost-card .text-indigo-600, .frost-card .text-purple-600, .frost-card .text-amber-600, .frost-card .text-emerald-650, .frost-card .text-rose-600,
      .lumina-card .text-indigo-650, .lumina-card .text-indigo-600, .lumina-card .text-purple-600, .lumina-card .text-amber-600, .lumina-card .text-emerald-650, .lumina-card .text-rose-600 {
        color: #ffffff !important;
      }

      .frost-card .bg-white\/60, .frost-card .bg-white\/50, .frost-card .bg-white\/40,
      .lumina-card .bg-white\/60, .lumina-card .bg-white\/50, .lumina-card .bg-white\/40 {
        background-color: rgba(255, 255, 255, 0.03) !important;
        color: #ffffff !important;
      }

      /* Recharts charts visual overrides */
      .recharts-cartesian-grid-horizontal line,
      .recharts-cartesian-grid-vertical line {
        stroke: rgba(255, 255, 255, 0.05) !important;
      }

      .recharts-text {
        fill: #64748b !important;
      }

      .recharts-tooltip-cursor {
        fill: rgba(255, 255, 255, 0.02) !important;
      }

      /* Scrollbar */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 9999px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    `}</style>
  );
}

interface LuminaCardProps {
  children: React.ReactNode;
  className?: string;
  beam?: boolean;
  delay?: number;
}

/**
 * LuminaCard (aliased also as FrostCard to preserve import compatibility across all views)
 * A dark glass card with optional "Border Beam" animation.
 */
export function LuminaCard({ children, className, beam = false, delay = 0 }: LuminaCardProps) {
  // Check if caller passed explicit padding via className
  const hasCustomPadding = className && /\bp-\d/.test(className);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#181b40] to-[#0d0e28] text-white backdrop-blur-2xl transition-all hover:from-[#1d214d] hover:to-[#0f1130]",
        !hasCustomPadding && "p-6",
        className,
        "frost-card lumina-card"
      )}
    >
      {beam && <div className="border-beam rounded-3xl" />}

      {/* Subtle top light reflection */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30" />

      <div className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
}

// Map FrostCard to the premium LuminaCard implementation
export const FrostCard = LuminaCard;

interface NavItemProps {
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number | string;
}

/**
 * NavItem compatible with standard Lumina w-64 desktop sidebar layouts
 */
export function NavItem({ icon: Icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 relative",
        active
          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-inner border border-white/5"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-105", active ? "text-indigo-400" : "text-slate-500 group-hover:text-white")} />
      <span className="truncate text-left text-xs font-semibold">{label}</span>
      
      {badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-lg">
          {badge}
        </span>
      )}

      {active && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_currentColor]" />
      )}
    </button>
  );
}

interface StatPillProps {
  val: string;
  positive?: boolean;
}

export function StatPill({ val, positive = true }: StatPillProps) {
  return (
    <span className={cn(
      "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border shadow-sm",
      positive 
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.05)]" 
        : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.05)]"
    )}>
      <ArrowUpRight className={cn("h-3 w-3", !positive && "rotate-180")} />
      {val}
    </span>
  );
}

export const timeRanges = ["Daily", "Monthly", "Yearly"];

export function TimeToggle({ active, onChange }: { active: string; onChange: (val: string) => void }) {
  return (
    <div className="flex bg-white/5 border border-white/5 p-1 rounded-lg">
      {timeRanges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
            active === range 
              ? "bg-indigo-500/20 text-indigo-300 shadow-md border border-indigo-500/20" 
              : "text-slate-500 hover:text-white"
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'glass';
  loading?: boolean;
}

/**
 * LuminaButton: A premium action button with native loading spinner support
 */
export function LuminaButton({ children, className, variant = 'primary', loading = false, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none",
        variant === 'primary' && "bg-white text-slate-900 hover:bg-slate-100",
        variant === 'secondary' && "bg-indigo-600 text-white hover:bg-indigo-500",
        variant === 'glass' && "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300",
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      <span className={cn(loading && "opacity-80")}>{children}</span>
    </button>
  );
}

/**
 * RoseTwoLoader: A mathematically derived curve loader that spins and breathes over time.
 * Operates on high-performance direct DOM updates outside of React render cycles.
 */
export function RoseTwoLoader() {
  const containerRef = React.useRef<SVGGElement>(null);
  const pathRef = React.useRef<SVGPathElement>(null);

  React.useEffect(() => {
    const group = containerRef.current;
    const pathNode = pathRef.current;
    if (!group || !pathNode) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const config = {
      particleCount: 54,
      trailSpan: 0.68,
      durationMs: 2800,
      rotationDurationMs: 6000,
      pulseDurationMs: 4300,
      strokeWidth: 2.5,
      roseA: 9.2,
      roseABoost: 0.9,
      roseBreathBase: 0.72,
      roseBreathBoost: 0.17,
      roseScale: 2.45,
      point(progress: number, detailScale: number) {
        const t = progress * Math.PI * 2;
        const a = this.roseA + detailScale * this.roseABoost;
        const r = a * (this.roseBreathBase + detailScale * this.roseBreathBoost) * Math.cos(2 * t);
        return {
          x: 50 + Math.cos(t) * r * this.roseScale,
          y: 50 + Math.sin(t) * r * this.roseScale,
        };
      },
    };

    const particles = Array.from({ length: config.particleCount }, () => {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('fill', 'currentColor');
      group.appendChild(circle);
      return circle;
    });

    function normalizeProgress(progress: number) {
      return ((progress % 1) + 1) % 1;
    }

    function getDetailScale(time: number) {
      const pulseProgress = (time % config.pulseDurationMs) / config.pulseDurationMs;
      const pulseAngle = pulseProgress * Math.PI * 2;
      return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
    }

    function getRotation(time: number) {
      return -((time % config.rotationDurationMs) / config.rotationDurationMs) * 360;
    }

    function buildPath(detailScale: number, steps = 480) {
      return Array.from({ length: steps + 1 }, (_, index) => {
        const point = config.point(index / steps, detailScale);
        return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      }).join(' ');
    }

    function getParticle(index: number, progress: number, detailScale: number) {
      const tailOffset = index / (config.particleCount - 1);
      const point = config.point(normalizeProgress(progress - tailOffset * config.trailSpan), detailScale);
      const fade = Math.pow(1 - tailOffset, 0.56);
      return {
        x: point.x,
        y: point.y,
        radius: 0.9 + fade * 2.7,
        opacity: 0.04 + fade * 0.96,
      };
    }

    let animationFrameId: number;
    const startedAt = performance.now();

    function render(now: number) {
      const time = now - startedAt;
      const progress = (time % config.durationMs) / config.durationMs;
      const detailScale = getDetailScale(time);

      group.setAttribute('transform', `rotate(${getRotation(time)} 50 50)`);
      pathNode.setAttribute('d', buildPath(detailScale));

      particles.forEach((node, index) => {
        const particle = getParticle(index, progress, detailScale);
        node.setAttribute('cx', particle.x.toFixed(2));
        node.setAttribute('cy', particle.y.toFixed(2));
        node.setAttribute('r', particle.radius.toFixed(2));
        node.setAttribute('opacity', particle.opacity.toFixed(3));
      });

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      particles.forEach((node) => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
    };
  }, []);

  return (
    <div className="w-[140px] h-[140px] text-indigo-400 select-none pointer-events-none drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]">
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="w-full h-full overflow-visible">
        <g ref={containerRef}>
          <path
            ref={pathRef}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            opacity="0.08"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * LoadingOverlay: A premium full-screen blurred overlay featuring the mathematically-driven "Rose Two" loading curve,
 * floating in the center without cards or labels for a maximum luxury feel.
 */
export function LoadingOverlay({ show }: { show: boolean; message?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="flex items-center justify-center"
          >
            <RoseTwoLoader />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
