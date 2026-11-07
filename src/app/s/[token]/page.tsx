"use client";

import { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import PortfolioView, { toPortfolio, type PortfolioState } from "@/components/PortfolioView";

/** Visitor view of a portfolio, reached through a share link / QR code the owner controls. */
export default function SharedPortfolioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user } = useUser();
  const [state, setState] = useState<PortfolioState>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/share/${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.status === 403) return setState({ kind: "message", title: "px.closed", sub: "px.closedSub" });
        if (!res.ok) return setState({ kind: "message", title: "px.linkGone", sub: "px.linkGoneSub" });
        const body = await res.json();
        const data = toPortfolio({ ...body.profile, displayName: body.displayName }, body.projects, { ownerId: body.ownerId });
        setState({ kind: "ready", data });
      } catch {
        setState({ kind: "message", title: "px.linkGone", sub: "px.linkGoneSub" });
      }
    })();
  }, [token]);

  return (
    <PortfolioView
      state={state}
      path="/ shared"
      banner="shared"
      viewerId={user?.id}
      onView={(projectId) => { fetch(`/api/public/projects/${projectId}/view`, { method: "POST", credentials: "include" }).catch(() => {}); }}
    />
  );
}
