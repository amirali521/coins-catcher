import { Coins } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-bold text-xl font-headline text-primary ${className}`}>
      <Coins className="h-7 w-7" />
      <span>{APP_NAME}</span>
    </div>
  );
}
