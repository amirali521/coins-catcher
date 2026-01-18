import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const authBg = PlaceHolderImages.find(p => p.id === 'auth-background');

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center p-4">
      {authBg && (
        <Image
          src={authBg.imageUrl}
          alt={authBg.description}
          data-ai-hint={authBg.imageHint}
          fill
          className="object-cover -z-10 opacity-30"
        />
      )}
      <div className="absolute inset-0 bg-background/50 -z-10" />
      {children}
    </main>
  );
}
