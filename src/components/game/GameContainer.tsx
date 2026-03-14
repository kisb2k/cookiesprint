'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Phaser from 'phaser';
import { SweetSprintScene } from './SweetSprintScene';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, Play, RotateCcw, Heart, Pause, Home } from 'lucide-react';

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
  const phaserGame = useRef<Phaser.Game | null>(null);

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
      transparent: true,
      scene: new SweetSprintScene(
        (finalScore, finalCookies) => {
          setScore(finalScore);
          setCookies(finalCookies);
          setGameState('gameover');
        },
        (currentLives) => {
          setLives(currentLives);
        }
      ),
    };

    phaserGame.current = new Phaser.Game(config);

    return () => {
      phaserGame.current?.destroy(true);
    };
  }, []);

  const startGame = () => {
    setGameState('playing');
    setLives(2);
    const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
    scene?.resumeGame();
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
      const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
      scene?.resumeGame();
    }
  };

  const restartGame = () => {
    const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
    scene?.restart();
    setGameState('playing');
    setLives(2);
  };

  const goHome = () => {
    const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
    scene?.restart();
    setGameState('start');
    setScore(0);
    setCookies(0);
    setLives(2);
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-background overflow-hidden p-4">
      {/* Game Canvas Container */}
      <div 
        ref={gameRef} 
        className={`w-full max-w-[800px] aspect-[4/3] shadow-2xl rounded-2xl overflow-hidden bg-sky-50 border-8 border-primary/20 transition-all ${gameState !== 'playing' ? 'blur-sm' : ''}`}
      />

      {/* Overlays */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
          <Card className="w-96 border-primary border-2 shadow-2xl animate-in zoom-in-95">
            <CardHeader className="text-center">
              <CardTitle className="text-5xl font-headline text-primary flex items-center justify-center gap-2">
                <BridgeIcon className="h-10 w-10" /> SweetSprint
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-center">
              <p className="text-muted-foreground">
                Run across the 3 bridge levels! Use <b>W/S</b> or <b>Arrows</b> to switch levels. <b>Space</b> to Jump, <b>Shift</b> to Slide.
              </p>
              <Button size="lg" onClick={startGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-8 text-2xl">
                <Play className="mr-2 h-8 w-8" /> START BRIDGE RUN
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
          <Card className="w-80 border-primary border-2 shadow-2xl animate-in zoom-in-95">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-headline text-primary">Paused</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button size="lg" onClick={resumeGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold">
                <Play className="mr-2 h-5 w-5" /> RESUME
              </Button>
              <Button size="lg" variant="outline" onClick={restartGame} className="w-full border-primary text-primary hover:bg-primary/10 font-bold">
                <RotateCcw className="mr-2 h-5 w-5" /> RESTART
              </Button>
              <Button size="lg" variant="ghost" onClick={goHome} className="w-full text-muted-foreground">
                <Home className="mr-2 h-5 w-5" /> MAIN MENU
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-md">
          <Card className="w-96 border-secondary border-2 shadow-2xl animate-in zoom-in-95">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-headline text-secondary">Oops! You fell!</CardTitle>
              <p className="text-muted-foreground text-lg">The bridge was too tricky this time.</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 text-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-xl border border-border shadow-inner">
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Bridge Distance</p>
                  <p className="text-3xl font-headline text-primary">{score}m</p>
                </div>
                <div className="bg-muted p-4 rounded-xl border border-border shadow-inner">
                  <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Cookies Found</p>
                  <p className="text-3xl font-headline text-accent flex items-center justify-center">
                    <Cookie className="mr-2 h-6 w-6" /> {cookies}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={restartGame} className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-6 text-xl">
                  <RotateCcw className="mr-2 h-6 w-6" /> RETRY RUN
                </Button>
                <Button variant="ghost" onClick={goHome} className="w-full text-muted-foreground">
                  <Home className="mr-2 h-5 w-5" /> MAIN MENU
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-12 left-0 right-0 flex justify-between px-12 z-0 pointer-events-none">
        <div className="flex gap-6">
          <div className="flex flex-col items-center bg-white/90 backdrop-blur px-8 py-3 rounded-2xl shadow-xl border-2 border-primary/20">
            <span className="text-[12px] font-bold text-primary uppercase tracking-tighter">Distance</span>
            <span className="text-3xl font-headline tabular-nums">{score}m</span>
          </div>
          <div className="flex flex-col items-center bg-white/90 backdrop-blur px-8 py-3 rounded-2xl shadow-xl border-2 border-accent/20">
            <span className="text-[12px] font-bold text-accent uppercase tracking-tighter">Cookies</span>
            <span className="text-3xl font-headline text-accent tabular-nums flex items-center">
              <Cookie className="mr-2 h-6 w-6 fill-accent animate-pulse" /> {cookies}
            </span>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          <div className="flex flex-col items-center bg-white/90 backdrop-blur px-8 py-3 rounded-2xl shadow-xl border-2 border-red-200">
            <span className="text-[12px] font-bold text-red-500 uppercase tracking-tighter">Health</span>
            <div className="flex gap-2 mt-2">
              {[...Array(2)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`h-6 w-6 ${i < lives ? 'fill-red-500 text-red-500 drop-shadow-md' : 'text-slate-300'}`} 
                />
              ))}
            </div>
          </div>
          
          {gameState === 'playing' && (
            <Button 
              size="icon" 
              variant="secondary" 
              onClick={pauseGame} 
              className="rounded-full h-14 w-14 shadow-2xl pointer-events-auto border-4 border-white bg-secondary hover:bg-secondary/90"
            >
              <Pause className="h-8 w-8 text-white fill-white" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
