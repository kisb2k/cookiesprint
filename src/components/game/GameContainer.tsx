'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Phaser from 'phaser';
import { BootScene } from './BootScene';
import { SweetSprintScene } from './SweetSprintScene';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, Play, RotateCcw, Heart, Pause, Home, Volume2, VolumeX } from 'lucide-react';
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
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [cookies, setCookies] = useState(0);
  const [lives, setLives] = useState(2);
  const [muted, setMutedState] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [hudPulse, setHudPulse] = useState(false);
  const [cookiePop, setCookiePop] = useState<number | null>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    setMutedState(loadMutePreference());
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

  // HUD pulse when score or cookies change
  useEffect(() => {
    setHudPulse(true);
    const t = setTimeout(() => setHudPulse(false), 400);
    return () => clearTimeout(t);
  }, [score, cookies]);

  // Cookie +1 pop when cookies increase
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
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-sky-50 overflow-hidden p-4">
      <div 
        ref={gameRef} 
        tabIndex={0}
        className={`w-full max-w-[800px] aspect-[4/3] shadow-2xl rounded-[2rem] overflow-hidden bg-white border-8 border-white transition-all ${gameState !== 'playing' ? 'blur-md scale-[0.98]' : 'scale-100'}`}
      />

      {gameState === 'start' && (
        <div className={`absolute inset-0 flex items-center justify-center z-10 bg-sky-900/40 backdrop-blur-xl transition-opacity duration-300 ${modalClosing ? 'animate-modal-out' : 'animate-in fade-in duration-300'}`}>
          <Card className={`w-[28rem] border-white border-4 shadow-2xl rounded-[3rem] overflow-hidden transition-all duration-300 ${modalClosing ? 'animate-modal-zoom-out' : 'animate-in zoom-in-95'}`}>
            <div className="bg-primary/5 p-8 text-center flex flex-col items-center gap-6">
              <div className="bg-primary p-6 rounded-[2rem] shadow-xl shadow-primary/20">
                <BridgeIcon className="h-16 w-16 text-white" />
              </div>
              <div>
                <CardTitle className="text-5xl font-headline text-primary mb-2">SweetSprint</CardTitle>
                <p className="text-muted-foreground font-medium">A Bridge Run Adventure</p>
              </div>
            </div>
            <CardContent className="flex flex-col gap-8 text-center p-10 bg-white">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                  <p className="text-xs font-bold text-sky-600 uppercase mb-1">Switch Level</p>
                  <p className="text-sm font-medium">Arrow Up / Down</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <p className="text-xs font-bold text-orange-600 uppercase mb-1">Slide</p>
                  <p className="text-sm font-medium">Left / Right</p>
                </div>
              </div>
              <Button size="lg" onClick={startGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-10 text-3xl rounded-[2rem] shadow-2xl transform active:scale-95 transition-all">
                <Play className="mr-3 h-10 w-10 fill-white" /> START RUN
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-md">
          <Card className="w-80 border-white border-4 shadow-2xl animate-in zoom-in-95 rounded-[2.5rem]">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-headline text-primary">Paused</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-8 px-8">
              <Button size="lg" onClick={resumeGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl py-6">
                <Play className="mr-2 h-6 w-6 fill-white" /> RESUME
              </Button>
              <Button size="lg" variant="outline" onClick={restartGame} className="w-full border-primary text-primary hover:bg-primary/5 font-bold rounded-2xl py-6">
                <RotateCcw className="mr-2 h-6 w-6" /> RESTART
              </Button>
              <Button size="lg" variant="ghost" onClick={goHome} className="w-full text-muted-foreground rounded-2xl">
                <Home className="mr-2 h-5 w-5" /> MAIN MENU
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-sky-950/60 backdrop-blur-xl">
          <Card className="w-[30rem] border-secondary border-4 shadow-2xl animate-in zoom-in-95 rounded-[3rem]">
            <CardHeader className="text-center pt-10">
              <CardTitle className="text-5xl font-headline text-secondary mb-2">Game Over!</CardTitle>
              <p className="text-muted-foreground font-medium">You almost reached the city skyline!</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-8 text-center p-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-sky-50/50 p-6 rounded-3xl border-2 border-sky-100">
                  <p className="text-[10px] uppercase font-bold text-sky-500 tracking-widest mb-1">Distance</p>
                  <p className="text-4xl font-headline text-sky-900">{score}m</p>
                </div>
                <div className="bg-orange-50/50 p-6 rounded-3xl border-2 border-orange-100">
                  <p className="text-[10px] uppercase font-bold text-orange-500 tracking-widest mb-1">Cookies</p>
                  <p className="text-4xl font-headline text-orange-600 flex items-center justify-center">
                    <Cookie className="mr-2 h-8 w-8 fill-orange-500 text-orange-600" /> {cookies}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <Button size="lg" onClick={restartGame} className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-10 text-2xl rounded-[2rem] shadow-xl transform active:scale-95 transition-all">
                  <RotateCcw className="mr-3 h-8 w-8" /> TRY AGAIN
                </Button>
                <Button variant="ghost" onClick={goHome} className="w-full text-muted-foreground hover:bg-secondary/5 rounded-2xl">
                  <Home className="mr-2 h-5 w-5" /> MAIN MENU
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cookie +1 pop */}
      {cookiePop !== null && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-cookie-pop">
          <span className="text-2xl font-headline text-amber-500 drop-shadow-lg">+{cookiePop}</span>
        </div>
      )}

      {/* Modern HUD */}
      <div className="absolute top-10 left-0 right-0 flex justify-between px-16 z-0 pointer-events-none">
        <div className="flex gap-4">
          <div className={`bg-white/90 backdrop-blur-xl px-8 py-3 rounded-2xl shadow-xl border-2 border-white/50 flex flex-col items-center transition-transform duration-200 ${hudPulse ? 'animate-hud-pulse' : ''}`}>
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-0.5">Metres</span>
            <span className="text-3xl font-headline text-sky-900 tabular-nums">{score}</span>
          </div>
          <div className={`bg-white/90 backdrop-blur-xl px-8 py-3 rounded-2xl shadow-xl border-2 border-white/50 flex flex-col items-center transition-transform duration-200 ${hudPulse ? 'animate-hud-pulse' : ''}`}>
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Cookies</span>
            <span className="text-3xl font-headline text-orange-600 tabular-nums flex items-center">
              <Cookie className="mr-2 h-6 w-6 fill-orange-500 text-orange-600" /> {cookies}
            </span>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="bg-white/90 backdrop-blur-xl px-8 py-3 rounded-2xl shadow-xl border-2 border-white/50 flex flex-col items-center">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1.5">Health</span>
            <div className="flex gap-2">
              {[...Array(2)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`h-6 w-6 transition-all duration-300 ${i < lives ? 'fill-red-500 text-red-500 scale-100' : 'text-slate-200 scale-75'}`} 
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            size="icon"
            onClick={toggleMute}
            className="rounded-2xl h-12 w-12 pointer-events-auto border-2 border-white/80 bg-white/90 hover:bg-white text-sky-800 shadow-lg"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          
          {gameState === 'playing' && (
            <Button 
              size="icon" 
              onClick={pauseGame} 
              className="rounded-2xl h-16 w-16 shadow-2xl pointer-events-auto border-4 border-white bg-primary hover:bg-primary/90 text-white transform hover:scale-105 active:scale-90 transition-all"
            >
              <Pause className="h-8 w-8 fill-white" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
