import type { ReactNode } from 'react'

const Drawings: Readonly<Record<string, ReactNode>> = {
  SolarArray: (
    <>
      <rect x="52" y="28" width="16" height="16" />
      <path d="M52 36H44M68 36h8" />
      <rect x="8" y="22" width="36" height="28" />
      <rect x="76" y="22" width="36" height="28" />
      <path d="M20 22v28M32 22v28M8 36h36M88 22v28M100 22v28M76 36h36" />
    </>
  ),
  Battery: (
    <>
      <rect x="22" y="20" width="72" height="34" />
      <rect x="94" y="30" width="6" height="14" />
      <path d="M36 20v34M50 20v34M64 20v34M78 20v34" />
      <path d="M27 14h10M32 9v10M79 14h10" />
    </>
  ),
  Camera: (
    <>
      <rect x="18" y="20" width="46" height="34" />
      <path d="M64 26l26-6v34l-26-6" />
      <ellipse cx="90" cy="37" rx="5" ry="17" />
      <circle cx="41" cy="37" r="9" />
      <path d="M26 20v-6h14v6" />
    </>
  ),
  Spectrometer: (
    <>
      <path d="M48 56L62 16l14 40z" />
      <path d="M10 42l44-4" />
      <path d="M70 34l40-14M71 38l39-4M72 43l38 8M73 48l37 18" />
    </>
  ),
  Radar: (
    <>
      <path d="M30 12c26 4 34 44 0 48" />
      <path d="M30 12v48" />
      <path d="M30 36h30M60 36l-6-5M60 36l-6 5" />
      <path d="M78 22c8 8 8 20 0 28M90 14c14 14 14 30 0 44" />
    </>
  ),
  ParticleDetector: (
    <>
      <rect x="40" y="16" width="40" height="42" />
      <path d="M40 30h40M40 44h40" />
      <path d="M8 10l32 14M10 34l30 3M12 62l28-10" />
      <circle cx="56" cy="23" r="2" />
      <circle cx="66" cy="37" r="2" />
      <circle cx="52" cy="51" r="2" />
    </>
  ),
  HighEnergyDetector: (
    <>
      <rect x="34" y="34" width="52" height="26" />
      <path d="M34 22h52M34 22v12M86 22v12" />
      <path d="M42 22v-6h8v6M58 22v-6h6v6M72 22v-6h8v6" />
      <path d="M96 6l-8 8 6 2-10 10" />
      <path d="M46 46h28M46 52h28" />
    </>
  ),
  RadiationShielding: (
    <>
      <rect x="44" y="26" width="32" height="22" />
      <path d="M34 16h52v42H34z" />
      <path d="M24 8h72v58H24z" />
      <path d="M6 24l18 6M6 48l18-6" />
    </>
  ),
  MagneticShield: (
    <>
      <rect x="50" y="28" width="20" height="18" />
      <path d="M50 37C30 37 22 16 60 10c38 6 30 27 10 27" />
      <path d="M50 37C30 37 22 58 60 64c38-6 30-27 10-27" />
      <path d="M60 10V4M60 64v6" />
    </>
  ),
  FlightComputer: (
    <>
      <rect x="36" y="16" width="48" height="42" />
      <rect x="48" y="27" width="24" height="20" />
      <path d="M44 16v-8M56 16v-8M68 16v-8M80 16v-8M44 58v8M56 58v8M68 58v8M80 58v8M36 28h-9M36 46h-9M84 28h9M84 46h9" />
    </>
  ),
  Thrusters: (
    <>
      <rect x="18" y="26" width="30" height="22" />
      <path d="M48 31h10l18-13v38l-18-13H48" />
      <path d="M84 26l20-6M84 37h24M84 48l20 6" />
    </>
  ),
  Antenna: (
    <>
      <path d="M28 14c30 2 44 20 46 50" />
      <path d="M28 14l46 50" />
      <path d="M51 39l16-18" />
      <circle cx="69" cy="19" r="3" />
      <path d="M84 12c8 4 12 10 12 18M92 4c12 6 18 16 18 28" />
      <path d="M40 64h40" />
    </>
  ),
  RepairDrone: (
    <>
      <rect x="20" y="28" width="34" height="22" />
      <path d="M54 39h16l14-16 12 8" />
      <path d="M96 31l8-8M96 31l10 2" />
      <circle cx="70" cy="39" r="3" />
      <circle cx="84" cy="23" r="3" />
      <path d="M28 28v-8h18v8" />
    </>
  ),
  CrewCapsule: (
    <>
      <path d="M36 58L50 18h20l14 40z" />
      <path d="M30 58h60" />
      <circle cx="60" cy="38" r="6" />
      <path d="M50 18l4-8h12l4 8" />
    </>
  ),
}

export function ModuleDrawing({ moduleId }: { moduleId: string }) {
  return (
    <svg className="ModuleDrawing" viewBox="0 0 120 72" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
      {Drawings[moduleId]}
    </svg>
  )
}
