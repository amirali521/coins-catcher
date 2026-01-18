import { Card, CardContent } from "@/components/ui/card";

export function BannerAd() {
  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="p-4 flex items-center justify-center h-24">
        <p className="text-muted-foreground text-sm">Banner Ad Placeholder</p>
      </CardContent>
    </Card>
  );
}
