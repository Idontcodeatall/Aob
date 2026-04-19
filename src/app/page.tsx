import { CurrentlyReading } from "@/components/CurrentlyReading";
import { StoriesLine } from "@/components/StoriesLine";
import { Feed } from "@/components/Feed";

export default function Home() {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto border-x border-neutral-800 min-h-screen relative flex flex-col">
      {/* Demo Mode Banner */}
      <div className="hidden md:block sticky top-0 z-50 bg-brand-accent text-white py-1.5 px-4 text-center text-[10px] md:text-xs font-medium tracking-wide shadow-md">
        Frontend Demo: Data persistence coming in Backend Phase. Enjoy the UI!
      </div>
      
      <CurrentlyReading />
      <StoriesLine />
      <Feed />
    </div>
  );
}
