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
      backgroundColor: '#87CEEB',
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
    const canvas = gameRef.current?.querySelector('canvas');
    canvas?.focus();
    
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
      const canvas = gameRef.current?.querySelector('canvas');
      canvas?.focus();
      const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
      scene?.resumeGame();
    }
  };

  const restartGame = () => {
    setGameState('playing');
    setLives(2);
    const canvas = gameRef.current?.querySelector('canvas');
    canvas?.focus();
    const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
    scene?.restart();
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
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-[#E0F2FE] overflow-hidden p-4">
      <div 
        ref={gameRef} 
        tabIndex={0}
        className={`w-full max-w-[800px] aspect-[4/3] shadow-2xl rounded-3xl overflow-hidden bg-sky-100 border-8 border-white transition-all ${gameState !== 'playing' ? 'blur-sm scale-[0.98]' : ''}`}
      />

      {gameState === 'start' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-sky-900/20 backdrop-blur-md">
          <Card className="w-96 border-white border-4 shadow-2xl animate-in zoom-in-95 rounded-3xl">
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-5xl font-headline text-primary flex flex-col items-center gap-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <BridgeIcon className="h-12 w-12 text-primary" />
                </div>
                SweetSprint
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 text-center pb-8">
              <p className="text-muted-foreground font-medium px-4">
                Run across 3 bridge levels! <br/>
                <b>UP/DOWN</b> to change levels. <br/>
                <b>LEFT/RIGHT</b> to slide and dodge low obstacles.
              </p>
              <Button size="lg" onClick={startGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-8 text-2xl rounded-2xl shadow-lg transform active:scale-95 transition-all">
                <Play className="mr-2 h-8 w-8" /> START RUN
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
          <Card className="w-80 border-white border-4 shadow-2xl animate-in zoom-in-95 rounded-3xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-headline text-primary">Game Paused</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-8">
              <Button size="lg" onClick={resumeGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl">
                <Play className="mr-2 h-5 w-5" /> RESUME
              </Button>
              <Button size="lg" variant="outline" onClick={restartGame} className="w-full border-primary text-primary hover:bg-primary/10 font-bold rounded-xl">
                <RotateCcw className="mr-2 h-5 w-5" /> RESTART
              </Button>
              <Button size="lg" variant="ghost" onClick={goHome} className="w-full text-muted-foreground rounded-xl">
                <Home className="mr-2 h-5 w-5" /> MAIN MENU
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-sky-950/40 backdrop-blur-md">
          <Card className="w-96 border-secondary border-4 shadow-2xl animate-in zoom-in-95 rounded-3xl">
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-4xl font-headline text-secondary">Aww, you hit something!</CardTitle>
              <p className="text-muted-foreground font-medium">The bridge levels can be tricky.</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 text-center pb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sky-50 p-4 rounded-2xl border-2 border-sky-100">
                  <p className="text-[10px] uppercase font-bold text-sky-400 tracking-widest">Distance</p>
                  <p className="text-3xl font-headline text-sky-900">{score}m</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-100">
                  <p className="text-[10px] uppercase font-bold text-orange-400 tracking-widest">Cookies</p>
                  <p className="text-3xl font-headline text-orange-600 flex items-center justify-center">
                    <Cookie className="mr-2 h-6 w-6" /> {cookies}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={restartGame} className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-6 text-xl rounded-2xl shadow-lg transform active:scale-95 transition-all">
                  <RotateCcw className="mr-2 h-6 w-6" /> TRY AGAIN
                </Button>
                <Button variant="ghost" onClick={goHome} className="w-full text-muted-foreground rounded-xl">
                  <Home className="mr-2 h-5 w-5" /> MAIN MENU
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="absolute top-12 left-0 right-0 flex justify-between px-12 z-0 pointer-events-none">
        <div className="flex gap-4">
          <div className="flex flex-col items-center bg-white/95 backdrop-blur px-6 py-2 rounded-2xl shadow-lg border-2 border-sky-100">
            <span className="text-[10px] font-bold text-sky-500 uppercase tracking-tighter">Metres</span>
            <span className="text-2xl font-headline text-sky-900 tabular-nums">{score}</span>
          </div>
          <div className="flex flex-col items-center bg-white/95 backdrop-blur px-6 py-2 rounded-2xl shadow-lg border-2 border-orange-100">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter">Cookies</span>
            <span className="text-2xl font-headline text-orange-600 tabular-nums flex items-center">
              <Cookie className="mr-1 h-5 w-5 fill-orange-500" /> {cookies}
            </span>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="flex flex-col items-center bg-white/95 backdrop-blur px-6 py-2 rounded-2xl shadow-lg border-2 border-red-100">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Health</span>
            <div className="flex gap-1.5 mt-1">
              {[...Array(2)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`h-5 w-5 ${i < lives ? 'fill-red-500 text-red-500' : 'text-slate-200'}`} 
                />
              ))}
            </div>
          </div>
          
          {gameState === 'playing' && (
            <Button 
              size="icon" 
              variant="secondary" 
              onClick={pauseGame} 
              className="rounded-2xl h-14 w-14 shadow-xl pointer-events-auto border-4 border-white bg-primary hover:bg-primary/90 text-white"
            >
              <Pause className="h-7 w-7 fill-white" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}