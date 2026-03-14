
'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { SweetSprintScene } from './SweetSprintScene';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Cookie, Play, RotateCcw } from 'lucide-react';

export default function GameContainer() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [cookies, setCookies] = useState(0);
  const phaserGame = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current!,
      width: 600,
      height: 800,
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      transparent: true,
      scene: new SweetSprintScene((finalScore, finalCookies) => {
        setScore(finalScore);
        setCookies(finalCookies);
        setGameState('gameover');
      }),
    };

    phaserGame.current = new Phaser.Game(config);

    return () => {
      phaserGame.current?.destroy(true);
    };
  }, []);

  const startGame = () => {
    setGameState('playing');
    // Start game logic if paused or not started
  };

  const restartGame = () => {
    const scene = phaserGame.current?.scene.getScene('SweetSprintScene') as SweetSprintScene;
    scene?.restart();
    setGameState('playing');
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Game Canvas Container */}
      <div 
        ref={gameRef} 
        className={`w-full max-w-[600px] aspect-[3/4] shadow-2xl rounded-2xl overflow-hidden bg-white border-8 border-primary/20 transition-all ${gameState !== 'playing' ? 'blur-sm' : ''}`}
      />

      {/* Overlays */}
      {gameState === 'start' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
          <Card className="w-80 border-primary border-2 shadow-2xl animate-in zoom-in-95">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-headline text-primary">SweetSprint</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-center">
              <p className="text-muted-foreground text-sm">
                Move between lanes with <b>Arrows</b> or <b>A/D</b>. Jump with <b>Up</b>, Slide with <b>Down</b>.
              </p>
              <Button size="lg" onClick={startGame} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 text-xl">
                <Play className="mr-2 h-6 w-6" /> START RUN
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 backdrop-blur-md">
          <Card className="w-80 border-secondary border-2 shadow-2xl animate-in zoom-in-95">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-headline text-secondary">Oops!</CardTitle>
              <p className="text-muted-foreground">The run ended here.</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 text-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg border border-border">
                  <p className="text-xs uppercase font-bold text-muted-foreground">Score</p>
                  <p className="text-2xl font-headline text-primary">{score}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg border border-border">
                  <p className="text-xs uppercase font-bold text-muted-foreground">Cookies</p>
                  <p className="text-2xl font-headline text-accent flex items-center justify-center">
                    <Cookie className="mr-1 h-5 w-5" /> {cookies}
                  </p>
                </div>
              </div>
              <Button size="lg" onClick={restartGame} className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-6 text-xl">
                <RotateCcw className="mr-2 h-6 w-6" /> TRY AGAIN
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hud */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-8 z-0 pointer-events-none">
        <div className="flex flex-col items-center bg-white/80 backdrop-blur px-6 py-2 rounded-full shadow-lg border-2 border-primary/20">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Distance</span>
          <span className="text-2xl font-headline tabular-nums">{score}</span>
        </div>
        <div className="flex flex-col items-center bg-white/80 backdrop-blur px-6 py-2 rounded-full shadow-lg border-2 border-accent/20">
          <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Cookies</span>
          <span className="text-2xl font-headline text-accent tabular-nums flex items-center">
            <Cookie className="mr-1 h-5 w-5 fill-accent" /> {cookies}
          </span>
        </div>
      </div>
    </div>
  );
}
