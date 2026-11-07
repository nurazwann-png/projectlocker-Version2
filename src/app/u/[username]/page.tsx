"use client";

import { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import PortfolioView, { toPortfolio, type PortfolioState } from "@/components/PortfolioView";

/** Owner preview of their portfolio. Everyone else is told to use a share link. */
export default function OwnerPortfolioPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user, isLoaded } = useUser();
  const [state, setState] = useState<PortfolioState>({ kind: "loading" });

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        const [pRes, prRes] = await Promise.all([
          fetch(`/api/public/${username}/profile`),
          fetch(`/api/public/${username}/projects`),
        ]);
        if (pRes.status === 404) return setState({ kind: "message", title: "px.notFound", sub: "px.privateSub" });
        if (!pRes.ok || !prRes.ok) return setState({ kind: "message", title: "px.private", sub: "px.privateSub" });
        const p = await pRes.json();
        setState({ kind: "ready", data: toPortfolio(p, await prRes.json(), { ownerId: p.ownerId, viewerIsAdmin: p.viewerIsAdmin }) });
      } catch {
        setState({ kind: "message", title: "px.private", sub: "px.privateSub" });
      }
    })();
  }, [username, isLoaded]);

  return <PortfolioView state={state} path={`/ u / ${username}`} banner="owner" viewerId={user?.id} />;
}
