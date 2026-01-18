import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

export function AdBlockerOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl">Ad Blocker Detected</CardTitle>
          <CardDescription className="mt-2">
            It looks like you're using an ad blocker. This app relies on ad revenue to keep the service free.
            <br /><br />
            <strong>Please disable your ad blocker for this site to continue.</strong>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
