
'use client';

import dynamic from 'next/dynamic';

const GameContainer = dynamic(
  () => import('@/components/game/GameContainer'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-primary font-headline animate-pulse">Loading SweetSprint...</p>
      </div>
    )
  }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F1EF] relative overflow-hidden flex items-center justify-center">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <GameContainer />
      
      <footer className="absolute bottom-4 text-xs text-muted-foreground font-body">
        SweetSprint &copy; 2024 • A Delicious Running Adventure
      </footer>
    </main>
  );
}
