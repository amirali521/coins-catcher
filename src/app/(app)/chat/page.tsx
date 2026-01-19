"use client";

import { Suspense } from 'react';
import { ChatLayout } from '@/components/chat/chat-layout';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function ChatPageContent() {
    return <ChatLayout />;
}

export default function ChatPage() {
    return (
        <div className="h-[calc(100vh-8rem)]">
             <div className="pb-4">
                <h1 className="text-3xl font-bold">Chat</h1>
                <p className="text-muted-foreground">Talk with your friends in real-time.</p>
             </div>
             <Suspense fallback={
                <Card className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </Card>
            }>
                <ChatPageContent />
            </Suspense>
        </div>
    );
}
