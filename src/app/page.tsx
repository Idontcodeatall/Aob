import { CurrentlyReading } from "@/components/CurrentlyReading";
import { StoriesLine } from "@/components/StoriesLine";
import { Feed } from "@/components/Feed";

export default function Home() {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto border-x border-neutral-800 min-h-screen relative flex flex-col">
      <CurrentlyReading />
      <StoriesLine />
      <Feed />
    </div>
  );
}
