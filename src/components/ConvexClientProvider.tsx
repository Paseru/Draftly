"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
    console.warn(
        "NEXT_PUBLIC_CONVEX_URL is not defined. Convex client will not be initialized."
    );
}

const sharedClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    const client = useMemo(() => sharedClient, []);

    if (!client) {
        return <>{children}</>;
    }

    return (
        <ConvexAuthNextjsProvider client={client}>
            {children}
        </ConvexAuthNextjsProvider>
    );
}
