
'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Phaser from 'phaser';

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(
      typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    );
  }, []);
  return isTouch;
}

function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return orientation;
}

import { BootScene } from './BootScene';
import { SweetSprintScene } from './SweetSprintScene';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Cookie, Play, RotateCcw, Heart, Pause, Home, 
  Volume2, VolumeX, Maximize, Minimize, 
  Keyboard, Smartphone, MousePointer2, MoveHorizontal,
  RotateCw
} from 'lucide-react';
import { playSound, setMuted, loadMutePreference, type SoundEvent } from '@/lib/gameSound';

const BridgeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 11c4 0 4 6 9 6s5-6 9-6" />
    <path d="M3 15h18" />
    <path d="M6 15v3" />
    <path d="M18 15v3" />
  </svg>
);

export default function GameContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [cookies, setCookies] = useState(0);
  const [lives, setLives] = useState(2);
  const [muted, setMutedState] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [hudPulse, setHudPulse] = useState(false);
  const [cookiePop, setCookiePop] = useState<number | null>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const isTouch = useIsTouch();
  const orientation = useOrientation();

  useEffect(() => {
    setMutedState(loadMutePreference());
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSoundEvent = (event: SoundEvent) => {
    playSound(event);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current!,
      width: 800,
      height: 600,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      backgroundColor: '#E0F2FE',
      scene: [
        new BootScene(),
        new SweetSprintScene(
          (finalScore, finalCookies) => {
            setScore(finalScore);
            setCookies(finalCookies);
            setGameState('gameover');
          },
          (currentLives) => setLives(currentLives),
          (currentScore) => setScore(currentScore),
          (currentCookies) => setCookies(currentCookies),
          handleSoundEvent
        ),
      ],
    };

    phaserGame.current = new Phaser.Game(config);

    return () => {
      phaserGame.current?.destroy(true);
    };
  }, []);

  useEffect(() => {
    setHudPulse(true);
    const t = setTimeout(() => setHudPulse(false), 400);
    return () => clearTimeout(t);
  }, [score, cookies]);

  const prevCookies = useRef(0);
  useEffect(() => {
    if (cookies > prevCookies.current && gameState === 'playing') {
      setCookiePop(cookies - prevCookies.current);
      const t = setTimeout(() => {
        setCookiePop(null);
        prevCookies.current = cookies;
      }, 700);
      return () => clearTimeout(t);
    }
    prevCookies.current = cookies;
  }, [cookies, gameState]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const startGame = () => {
    setModalClosing(true);
    setTimeout(() => {
      setGameState('playing');
      setLives(2);
      setScore(0);
      setCookies(0);
      prevCookies.current = 0;
      setModalClosing(false);
      const canvas = gameRef.current?.querySelector('canvas');
      canvas?.focus();
      const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
      scene?.resumeGame();
    }, 280);
  };

  const pauseGame = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
      scene?.pauseGame();
    }
  };

  const resumeGame = () => {
    if (gameState === 'paused') {
      setGameState('playing');
      const canvas = gameRef.current?.querySelector('canvas');
      canvas?.focus();
      const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
      scene?.resumeGame();
    }
  };

  const restartGame = () => {
    setGameState('playing');
    setLives(2);
    setScore(0);
    setCookies(0);
    prevCookies.current = 0;
    const canvas = gameRef.current?.querySelector('canvas');
    canvas?.focus();
    const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
    scene?.restart();
    setTimeout(() => {
      const restartedScene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
      restartedScene?.resumeGame();
    }, 100);
  };

  const goHome = () => {
    const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
    scene?.restart();
    setGameState('start');
    setScore(0);
    setCookies(0);
    setLives(2);
    prevCookies.current = 0;
  };

  const toggleMute = () => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full min-h-dvh flex flex-col items-center justify-center bg-sky-50 overflow-hidden transition-all duration-300 ${isFullscreen ? 'p-0' : 'p-2 sm:p-4'}`}
    >
      <div 
        ref={gameRef} 
        tabIndex={0}
        className={`w-full h-full transition-all duration-300 touch-none ${
          isFullscreen || isTouch
            ? 'max-w-none rounded-none border-0' 
            : 'max-w-[800px] aspect-[4/3] max-h-[calc(100dvh-2rem)] shadow-2xl rounded-xl sm:rounded-[2rem] border-4 sm:border-8 border-white'
        } bg-white overflow-hidden ${gameState !== 'playing' ? 'blur-md scale-[0.98]' : 'scale-100'}`}
        style={{ touchAction: 'none' }}
      />

      {/* Portrait rotation hint */}
      {isTouch && orientation === 'portrait' && gameState === 'playing' && (
        <div className="absolute inset-0 z-50 bg-sky-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center animate-in fade-in">
          <RotateCw className="h-16 w-16 mb-4 animate-bounce" />
          <h2 className="text-2xl font-headline mb-2">Rotate your device</h2>
          <p className="text-sky-200">Landscape mode is recommended for the best experience!</p>
          <Button onClick={pauseGame} variant="outline" className="mt-6 border-white text-white hover:bg-white/10">
            Pause Game
          </Button>
        </div>
      )}

      {gameState === 'start' && (
        <div className={`absolute inset-0 flex items-center justify-center z-40 bg-sky-900/40 backdrop-blur-xl transition-opacity duration-300 p-4 safe-area-inset ${modalClosing ? 'animate-modal-out' : 'animate-in fade-in duration-300'}`}>
          <Card className={`w-full max-w-[28rem] max-h-[90dvh] overflow-y-auto border-white border-4 shadow-2xl rounded-2xl sm:rounded-[3rem] transition-all duration-300 ${modalClosing ? 'animate-modal-zoom-out' : 'animate-in zoom-in-95'}`}>
            <div className="bg-primary/5 p-4 sm:p-8 text-center flex flex-col items-center gap-4 sm:gap-6 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 rounded-full h-10 w-10 text-primary hover:bg-primary/10"
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
              <div className="bg-primary p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-primary/20">
                <BridgeIcon className="h-10 w-10 sm:h-16 sm:w-16 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl sm:text-5xl font-headline text-primary mb-1">SweetSprint</CardTitle>
                <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium text-sm">
                  {isTouch ? <Smartphone className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
                  <p>{isTouch ? 'Mobile Controls Active' : 'Desktop Controls Active'}</p>
                </div>
              </div>
            </div>
            <CardContent className="flex flex-col gap-4 sm:gap-8 text-center p-4 sm:p-10 bg-white">
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-left">
                <div className="bg-sky-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-sky-100 flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Switch / Jump</p>
                  <div className="flex items-center gap-2">
                    <div className="bg-sky-200/50 p-1.5 rounded-lg">
                      {isTouch ? <MoveHorizontal className="h-4 w-4 text-sky-700 rotate-90" /> : <Keyboard className="h-4 w-4 text-sky-700" />}
                    </div>
                    <p className="text-[10px] sm:text-sm font-semibold text-sky-900 leading-tight">
                      {isTouch ? 'Swipe UP / DOWN' : 'UP / DOWN Arrows'}
                    </p>
                  </div>
                </div>
                <div className="bg-orange-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-orange-100 flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Slide / Dodge</p>
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-200/50 p-1.5 rounded-lg">
                      {isTouch ? <Smartphone className="h-4 w-4 text-orange-700" /> : <MousePointer2 className="h-4 w-4 text-orange-700" />}
                    </div>
                    <p className="text-[10px] sm:text-sm font-semibold text-orange-900 leading-tight">
                      {isTouch ? 'Swipe LEFT / RIGHT' : 'LEFT / RIGHT Arrows'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:gap-3">
                <Button size="lg" onClick={startGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 sm:py-10 text-xl sm:text-3xl rounded-2xl sm:rounded-[2rem] shadow-2xl transform active:scale-95 transition-all min-h-[48px] touch-manipulation">
                  <Play className="mr-2 sm:mr-3 h-6 w-6 sm:h-10 sm:w-10 fill-white" /> START RUN
                </Button>
                <Button variant="outline" size="lg" onClick={toggleFullscreen} className="w-full border-primary text-primary hover:bg-primary/5 font-bold rounded-xl sm:rounded-2xl py-4 sm:hidden min-h-[48px] touch-manipulation">
                  {isFullscreen ? <Minimize className="mr-2 h-5 w-5" /> : <Maximize className="mr-2 h-5 w-5" />}
                  {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN MODE'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40 backdrop-blur-md p-4 safe-area-inset">
          <Card className="w-full max-w-[20rem] border-white border-4 shadow-2xl animate-in zoom-in-95 rounded-2xl sm:rounded-[2.5rem]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Paused</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-6 sm:pb-8 px-6 sm:px-8">
              <Button size="lg" onClick={resumeGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl sm:rounded-2xl py-5 sm:py-6 min-h-[48px] touch-manipulation">
                <Play className="mr-2 h-5 w-5 sm:h-6 sm:w-6 fill-white" /> RESUME
              </Button>
              <Button size="lg" variant="outline" onClick={restartGame} className="w-full border-primary text-primary hover:bg-primary/5 font-bold rounded-xl sm:rounded-2xl py-5 sm:py-6 min-h-[48px] touch-manipulation">
                <RotateCcw className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /> RESTART
              </Button>
              <Button size="lg" variant="ghost" onClick={goHome} className="w-full text-muted-foreground rounded-xl sm:rounded-2xl py-5 min-h-[48px] touch-manipulation">
                <Home className="mr-2 h-5 w-5" /> MAIN MENU
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-sky-950/60 backdrop-blur-xl p-4 safe-area-inset">
          <Card className="w-full max-w-[30rem] border-secondary border-4 shadow-2xl animate-in zoom-in-95 rounded-2xl sm:rounded-[3rem]">
            <CardHeader className="text-center pt-6 sm:pt-10">
              <CardTitle className="text-4xl sm:text-5xl font-headline text-secondary mb-2">Game Over!</CardTitle>
              <p className="text-muted-foreground font-medium text-sm sm:text-base">You almost reached the city skyline!</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 sm:gap-8 text-center p-6 sm:p-10">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-sky-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-sky-100">
                  <p className="text-[10px] uppercase font-bold text-sky-500 tracking-widest mb-1">Distance</p>
                  <p className="text-3xl sm:text-4xl font-headline text-sky-900">{score}m</p>
                </div>
                <div className="bg-orange-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-orange-100">
                  <p className="text-[10px] uppercase font-bold text-orange-500 tracking-widest mb-1">Cookies</p>
                  <p className="text-3xl sm:text-4xl font-headline text-orange-600 flex items-center justify-center">
                    <Cookie className="mr-2 h-6 w-6 sm:h-8 sm:w-8 fill-orange-500 text-orange-600" /> {cookies}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:gap-4">
                <Button size="lg" onClick={restartGame} className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-6 sm:py-10 text-xl sm:text-2xl rounded-2xl shadow-xl transform active:scale-95 transition-all min-h-[48px] touch-manipulation">
                  <RotateCcw className="mr-3 h-6 w-6 sm:h-8 sm:w-8" /> TRY AGAIN
                </Button>
                <Button variant="ghost" onClick={goHome} className="w-full text-muted-foreground hover:bg-secondary/5 rounded-2xl min-h-[48px] touch-manipulation">
                  <Home className="mr-2 h-5 w-5" /> MAIN MENU
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {cookiePop !== null && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-cookie-pop">
          <span className="text-2xl font-headline text-amber-500 drop-shadow-lg">+{cookiePop}</span>
        </div>
      )}

      {/* HUD and Controls Layer */}
      <div className={`absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-4 safe-area-inset`}>
        {/* Top HUD */}
        <div className="flex justify-between items-start w-full">
          <div className="flex gap-2 sm:gap-3">
            <div className={`bg-white/70 backdrop-blur-lg px-2 sm:px-6 py-1 sm:py-2 rounded-lg sm:rounded-xl shadow-lg border border-white/40 flex flex-col items-center min-w-[45px] sm:min-w-0 transition-transform duration-200 ${hudPulse ? 'animate-hud-pulse' : ''}`}>
              <span className="text-[7px] sm:text-[9px] font-black text-sky-500/80 uppercase tracking-widest mb-0.5">Metres</span>
              <span className="text-sm sm:text-2xl font-headline text-sky-900 tabular-nums leading-tight">{score}</span>
            </div>
            <div className={`bg-white/70 backdrop-blur-lg px-2 sm:px-6 py-1 sm:py-2 rounded-lg sm:rounded-xl shadow-lg border border-white/40 flex flex-col items-center min-w-[45px] sm:min-w-0 transition-transform duration-200 ${hudPulse ? 'animate-hud-pulse' : ''}`}>
              <span className="text-[7px] sm:text-[9px] font-black text-orange-500/80 uppercase tracking-widest mb-0.5">Cookies</span>
              <span className="text-sm sm:text-2xl font-headline text-orange-600 tabular-nums flex items-center leading-tight">
                <Cookie className="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5 fill-orange-500 text-orange-600" /> {cookies}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center sm:items-start">
            <div className="bg-white/70 backdrop-blur-lg px-2 sm:px-6 py-1 sm:py-2 rounded-lg sm:rounded-xl shadow-lg border border-white/40 flex flex-col items-center">
              <span className="text-[7px] sm:text-[9px] font-black text-red-500/80 uppercase tracking-widest mb-0.5 sm:mb-1">Health</span>
              <div className="flex gap-1 sm:gap-1.5">
                {[...Array(2)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`h-3 w-3 sm:h-5 sm:w-5 transition-all duration-300 ${i < lives ? 'fill-red-500 text-red-500 scale-100' : 'text-slate-300 scale-75'}`} 
                  />
                ))}
              </div>
            </div>
            
            <div className="flex flex-row sm:flex-col gap-1.5">
              <Button
                type="button"
                size="icon"
                onClick={toggleMute}
                className="rounded-lg h-8 w-8 sm:h-10 sm:w-10 pointer-events-auto border border-white/60 bg-white/70 hover:bg-white/90 text-sky-800 shadow-md touch-manipulation"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                onClick={toggleFullscreen}
                className="rounded-lg h-8 w-8 sm:h-10 sm:w-10 pointer-events-auto border border-white/60 bg-white/70 hover:bg-white/90 text-sky-800 shadow-md touch-manipulation"
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom controls/Pause button */}
        <div className="flex justify-end w-full">
          {gameState === 'playing' && (
            <Button 
              size="icon" 
              onClick={pauseGame} 
              className="rounded-xl h-10 w-10 sm:h-14 sm:w-14 shadow-xl pointer-events-auto border-2 border-white/80 bg-primary/90 hover:bg-primary text-white transform hover:scale-105 active:scale-90 transition-all touch-manipulation mb-2 mr-2"
            >
              <Pause className="h-5 w-5 sm:h-7 sm:w-7 fill-white" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
