
import GameContainer from '@/components/game/GameContainer';

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
