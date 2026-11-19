import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { isAdmin } = await auth();
  const pinToken = req.headers.get("x-admin-pin");
  const adminPin = process.env.ADMIN_PIN ?? "";
  const pinOk = adminPin && pinToken === adminPin;
  if (!isAdmin && !pinOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalProfiles,
    totalProjects,
    totalComments,
    acknowledgedComments,
    recentComments,
    commentsByProject,
    projectsByStatus,
    viewsByProject,
    recentViews,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.project.count(),
    prisma.comment.count(),
    prisma.comment.count({ where: { acknowledged: true } }),
    prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, authorName: true, body: true, createdAt: true, acknowledged: true, projectId: true },
    }),
    prisma.comment.groupBy({
      by: ["projectId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.project.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.projectView.groupBy({
      by: ["projectId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.projectView.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { viewerName: true, viewerId: true, projectId: true, createdAt: true },
    }),
  ]);

  // Enrich top commented projects with titles
  const topProjectIds = commentsByProject.map((c) => c.projectId);
  const topProjects = await prisma.project.findMany({
    where: { id: { in: topProjectIds } },
    select: { id: true, title: true, userId: true },
  });
  const projectMap = new Map(topProjects.map((p) => [p.id, p]));

  const topCommentedProjects = commentsByProject
    .filter((c) => projectMap.has(c.projectId))
    .map((c) => ({
      projectId: c.projectId,
      title: projectMap.get(c.projectId)?.title ?? "Unknown",
      count: c._count.id,
    }));

  // Enrich recent comments with project titles
  const recentProjectIds = [...new Set(recentComments.map((c) => c.projectId))];
  const recentProjects = await prisma.project.findMany({
    where: { id: { in: recentProjectIds } },
    select: { id: true, title: true },
  });
  const recentProjectMap = new Map(recentProjects.map((p) => [p.id, p.title]));
  const recentCommentsEnriched = recentComments.map((c) => ({
    ...c,
    projectTitle: recentProjectMap.get(c.projectId) ?? "Unknown",
  }));

  // Enrich top viewed projects with titles + owner username
  const viewedProjectIds = viewsByProject.map((v) => v.projectId);
  const viewedProjects = await prisma.project.findMany({
    where: { id: { in: viewedProjectIds } },
    select: { id: true, title: true, userId: true },
  });
  const ownerIds = [...new Set(viewedProjects.map((p) => p.userId))];
  const owners = await prisma.profile.findMany({
    where: { userId: { in: ownerIds } },
    select: { userId: true, username: true },
  });
  const ownerMap = new Map(owners.map((o) => [o.userId, o.username]));
  const viewedProjectMap = new Map(viewedProjects.map((p) => [p.id, p]));

  const topViewedProjects = viewsByProject.map((v) => {
    const proj = viewedProjectMap.get(v.projectId);
    return {
      projectId: v.projectId,
      title: proj?.title ?? "Unknown",
      ownerUsername: ownerMap.get(proj?.userId ?? "") ?? "unknown",
      totalViews: v._count.id,
    };
  });

  // Enrich recent views with project title + owner
  const recentViewProjectIds = [...new Set(recentViews.map((v) => v.projectId))];
  const recentViewProjects = await prisma.project.findMany({
    where: { id: { in: recentViewProjectIds } },
    select: { id: true, title: true, userId: true },
  });
  const recentViewProjectMap = new Map(recentViewProjects.map((p) => [p.id, p]));
  const recentViewOwnerIds = [...new Set(recentViewProjects.map((p) => p.userId))];
  const recentViewOwners = await prisma.profile.findMany({
    where: { userId: { in: recentViewOwnerIds } },
    select: { userId: true, username: true },
  });
  const recentViewOwnerMap = new Map(recentViewOwners.map((o) => [o.userId, o.username]));
  const recentViewsEnriched = recentViews.map((v) => {
    const proj = recentViewProjectMap.get(v.projectId);
    return {
      viewerName: v.viewerName,
      isGuest: !v.viewerId,
      projectTitle: proj?.title ?? "Unknown",
      ownerUsername: recentViewOwnerMap.get(proj?.userId ?? "") ?? "unknown",
      createdAt: v.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    totalProfiles,
    totalProjects,
    totalComments,
    acknowledgedComments,
    acknowledgedRate: totalComments > 0 ? Math.round((acknowledgedComments / totalComments) * 100) : 0,
    recentComments: recentCommentsEnriched,
    topCommentedProjects,
    projectsByStatus,
    topViewedProjects,
    recentViews: recentViewsEnriched,
  });
}
