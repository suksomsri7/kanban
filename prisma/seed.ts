import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...\n");

  // ── Users ──
  const hash = await bcrypt.hash("password123", 12);
  const adminHash = await bcrypt.hash("admin123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminHash,
      displayName: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });

  const somchai = await prisma.user.upsert({
    where: { username: "somchai" },
    update: {},
    create: {
      username: "somchai",
      passwordHash: hash,
      displayName: "Somchai Prasert",
      role: "ADMIN",
    },
  });

  const siriporn = await prisma.user.upsert({
    where: { username: "siriporn" },
    update: {},
    create: {
      username: "siriporn",
      passwordHash: hash,
      displayName: "Siriporn Kaew",
      role: "USER",
    },
  });

  const wichai = await prisma.user.upsert({
    where: { username: "wichai" },
    update: {},
    create: {
      username: "wichai",
      passwordHash: hash,
      displayName: "Wichai Sombat",
      role: "USER",
    },
  });

  const nattaya = await prisma.user.upsert({
    where: { username: "nattaya" },
    update: {},
    create: {
      username: "nattaya",
      passwordHash: hash,
      displayName: "Nattaya Rin",
      role: "USER",
    },
  });

  const guest = await prisma.user.upsert({
    where: { username: "guest" },
    update: {},
    create: {
      username: "guest",
      passwordHash: hash,
      displayName: "Guest Viewer",
      role: "GUEST",
    },
  });

  console.log("✓ Users created (6)");

  // ── Board Templates ──
  await prisma.boardTemplate.deleteMany();
  await prisma.boardTemplate.createMany({
    data: [
      {
        name: "Basic Kanban",
        columns: [
          { title: "To Do", order: "a0", color: null },
          { title: "In Progress", order: "a1", color: null },
          { title: "Done", order: "a2", color: null },
        ],
        labels: [
          { name: "Bug", color: "#ef4444" },
          { name: "Feature", color: "#3b82f6" },
          { name: "Improvement", color: "#8b5cf6" },
        ],
      },
      {
        name: "Software Development",
        columns: [
          { title: "Backlog", order: "a0", color: null },
          { title: "To Do", order: "a1", color: null },
          { title: "In Progress", order: "a2", color: null },
          { title: "Review", order: "a3", color: null },
          { title: "Testing", order: "a4", color: null },
          { title: "Done", order: "a5", color: null },
        ],
        labels: [
          { name: "Bug", color: "#ef4444" },
          { name: "Feature", color: "#3b82f6" },
          { name: "Hotfix", color: "#f97316" },
          { name: "Refactor", color: "#8b5cf6" },
          { name: "Docs", color: "#6b7280" },
        ],
      },
      {
        name: "Marketing",
        columns: [
          { title: "Ideas", order: "a0", color: null },
          { title: "Planning", order: "a1", color: null },
          { title: "In Progress", order: "a2", color: null },
          { title: "Review", order: "a3", color: null },
          { title: "Published", order: "a4", color: null },
        ],
        labels: [
          { name: "Social Media", color: "#3b82f6" },
          { name: "Blog", color: "#10b981" },
          { name: "Campaign", color: "#f59e0b" },
          { name: "Urgent", color: "#ef4444" },
        ],
      },
      {
        name: "Bug Tracking",
        columns: [
          { title: "Reported", order: "a0", color: null },
          { title: "Confirmed", order: "a1", color: null },
          { title: "Fixing", order: "a2", color: null },
          { title: "Testing", order: "a3", color: null },
          { title: "Resolved", order: "a4", color: null },
        ],
        labels: [
          { name: "Critical", color: "#ef4444" },
          { name: "Major", color: "#f97316" },
          { name: "Minor", color: "#f59e0b" },
          { name: "Low", color: "#6b7280" },
        ],
      },
    ],
  });
  console.log("✓ Board templates created (4)");

  // ── Projects ──
  const projectDev = await prisma.project.create({
    data: {
      name: "Company Website",
      description: "Full company website redesign and development project",
      color: "#111827",
      ownerId: somchai.id,
      members: {
        create: [
          { userId: somchai.id, role: "OWNER" },
          { userId: siriporn.id, role: "EDITOR" },
          { userId: wichai.id, role: "EDITOR" },
          { userId: nattaya.id, role: "EDITOR" },
          { userId: superAdmin.id, role: "EDITOR" },
          { userId: guest.id, role: "VIEWER" },
        ],
      },
    },
  });

  const projectMobile = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "Mobile application development for iOS and Android",
      color: "#1e40af",
      ownerId: superAdmin.id,
      members: {
        create: [
          { userId: superAdmin.id, role: "OWNER" },
          { userId: somchai.id, role: "EDITOR" },
          { userId: wichai.id, role: "EDITOR" },
        ],
      },
    },
  });

  const projectMarketing = await prisma.project.create({
    data: {
      name: "Marketing 2026",
      description: "All marketing campaigns and content for 2026",
      color: "#059669",
      ownerId: somchai.id,
      members: {
        create: [
          { userId: somchai.id, role: "OWNER" },
          { userId: nattaya.id, role: "EDITOR" },
          { userId: siriporn.id, role: "VIEWER" },
        ],
      },
    },
  });

  console.log("✓ Projects created (3)");

  // ── Board 1: Website Redesign ──
  const board1 = await prisma.board.create({
    data: {
      title: "Website Redesign",
      description: "Redesign company website with modern UI/UX",
      color: "#111827",
      ownerId: somchai.id,
      projectId: projectDev.id,
      members: {
        create: [
          { userId: somchai.id, role: "OWNER" },
          { userId: siriporn.id, role: "EDITOR" },
          { userId: wichai.id, role: "EDITOR" },
          { userId: nattaya.id, role: "EDITOR" },
          { userId: superAdmin.id, role: "EDITOR" },
          { userId: guest.id, role: "VIEWER" },
        ],
      },
      labels: {
        create: [
          { name: "Bug", color: "#ef4444" },
          { name: "Feature", color: "#3b82f6" },
          { name: "Design", color: "#8b5cf6" },
          { name: "Urgent", color: "#f97316" },
          { name: "Backend", color: "#10b981" },
          { name: "Frontend", color: "#06b6d4" },
        ],
      },
    },
    include: { labels: true },
  });

  const b1Labels = Object.fromEntries(board1.labels.map((l) => [l.name, l.id]));

  const b1ColBacklog = await prisma.column.create({
    data: { title: "Backlog", order: "a0", boardId: board1.id },
  });
  const b1ColTodo = await prisma.column.create({
    data: { title: "To Do", order: "a1", boardId: board1.id },
  });
  const b1ColInProgress = await prisma.column.create({
    data: { title: "In Progress", order: "a2", boardId: board1.id },
  });
  const b1ColReview = await prisma.column.create({
    data: { title: "Review", order: "a3", boardId: board1.id },
  });
  const b1ColDone = await prisma.column.create({
    data: { title: "Done", order: "a4", boardId: board1.id },
  });

  // Backlog cards
  const c1 = await prisma.card.create({
    data: {
      title: "Research competitor websites",
      description: "Analyze top 5 competitor websites for design inspiration and feature comparison.",
      order: "a0",
      priority: "LOW",
      columnId: b1ColBacklog.id,
    },
  });
  const c2 = await prisma.card.create({
    data: {
      title: "Create brand style guide",
      description: "Define colors, typography, spacing, and component patterns.",
      order: "a1",
      priority: "MEDIUM",
      columnId: b1ColBacklog.id,
    },
  });
  await prisma.card.create({
    data: {
      title: "Plan SEO strategy",
      order: "a2",
      priority: "LOW",
      columnId: b1ColBacklog.id,
    },
  });

  // To Do cards
  const c4 = await prisma.card.create({
    data: {
      title: "Design homepage wireframe",
      description: "Create wireframe mockup for the new homepage layout with hero section, features, and CTA.",
      order: "a0",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      columnId: b1ColTodo.id,
    },
  });
  await prisma.cardLabel.create({ data: { cardId: c4.id, labelId: b1Labels["Design"] } });
  await prisma.cardAssignee.create({ data: { cardId: c4.id, userId: siriporn.id } });

  const c5 = await prisma.card.create({
    data: {
      title: "Set up API endpoints for blog",
      description: "Create REST API for blog posts: CRUD operations, pagination, and search.",
      order: "a1",
      priority: "MEDIUM",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      columnId: b1ColTodo.id,
    },
  });
  await prisma.cardLabel.create({ data: { cardId: c5.id, labelId: b1Labels["Backend"] } });
  await prisma.cardAssignee.create({ data: { cardId: c5.id, userId: wichai.id } });

  await prisma.card.create({
    data: {
      title: "Design contact page",
      order: "a2",
      priority: "LOW",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      columnId: b1ColTodo.id,
    },
  });

  // In Progress cards
  const c7 = await prisma.card.create({
    data: {
      title: "Implement responsive navigation",
      description: "Build responsive navbar with mobile hamburger menu using Tailwind CSS. Include logo, nav links, and user menu.",
      order: "a0",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      columnId: b1ColInProgress.id,
    },
  });
  await prisma.cardLabel.createMany({
    data: [
      { cardId: c7.id, labelId: b1Labels["Frontend"] },
      { cardId: c7.id, labelId: b1Labels["Feature"] },
    ],
  });
  await prisma.cardAssignee.createMany({
    data: [
      { cardId: c7.id, userId: siriporn.id },
      { cardId: c7.id, userId: nattaya.id },
    ],
  });
  await prisma.comment.create({
    data: {
      content: "I've finished the desktop version. Working on mobile now.",
      cardId: c7.id,
      authorId: siriporn.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "Looks good! Don't forget to add the dark mode toggle.",
      cardId: c7.id,
      authorId: somchai.id,
    },
  });
  await prisma.subtask.createMany({
    data: [
      { title: "Desktop layout", isCompleted: true, order: "a0", cardId: c7.id },
      { title: "Mobile hamburger menu", isCompleted: false, order: "a1", cardId: c7.id },
      { title: "Dark mode toggle", isCompleted: false, order: "a2", cardId: c7.id },
    ],
  });

  const c8 = await prisma.card.create({
    data: {
      title: "Database schema migration",
      description: "Migrate existing database to new schema. Handle data transformation and backward compatibility.",
      order: "a1",
      priority: "URGENT",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue!
      columnId: b1ColInProgress.id,
    },
  });
  await prisma.cardLabel.createMany({
    data: [
      { cardId: c8.id, labelId: b1Labels["Backend"] },
      { cardId: c8.id, labelId: b1Labels["Urgent"] },
    ],
  });
  await prisma.cardAssignee.create({ data: { cardId: c8.id, userId: wichai.id } });

  // Review cards
  const c9 = await prisma.card.create({
    data: {
      title: "Footer component design",
      description: "Footer with sitemap links, social media icons, newsletter signup, and copyright.",
      order: "a0",
      priority: "MEDIUM",
      columnId: b1ColReview.id,
    },
  });
  await prisma.cardLabel.create({ data: { cardId: c9.id, labelId: b1Labels["Design"] } });
  await prisma.cardAssignee.create({ data: { cardId: c9.id, userId: nattaya.id } });
  await prisma.comment.create({
    data: {
      content: "Ready for review. Please check the responsive behavior on tablet.",
      cardId: c9.id,
      authorId: nattaya.id,
    },
  });

  // Done cards
  await prisma.card.create({
    data: {
      title: "Set up Next.js project",
      description: "Initialize project with Next.js, TypeScript, Tailwind CSS, and ESLint.",
      order: "a0",
      priority: "HIGH",
      columnId: b1ColDone.id,
    },
  });
  await prisma.card.create({
    data: {
      title: "Configure CI/CD pipeline",
      description: "Set up GitHub Actions for automatic testing and deployment to Vercel.",
      order: "a1",
      priority: "MEDIUM",
      columnId: b1ColDone.id,
    },
  });
  await prisma.card.create({
    data: {
      title: "Design system tokens",
      description: "Define design tokens: colors, spacing, typography, border radius.",
      order: "a2",
      priority: "MEDIUM",
      columnId: b1ColDone.id,
    },
  });

  console.log("✓ Board 1: Website Redesign (5 columns, 12 cards)");

  // ── Board 2: Mobile App Development ──
  const board2 = await prisma.board.create({
    data: {
      title: "Mobile App v2.0",
      description: "Major update for the mobile application",
      color: "#1e40af",
      ownerId: superAdmin.id,
      projectId: projectMobile.id,
      members: {
        create: [
          { userId: superAdmin.id, role: "OWNER" },
          { userId: somchai.id, role: "EDITOR" },
          { userId: wichai.id, role: "EDITOR" },
        ],
      },
      labels: {
        create: [
          { name: "iOS", color: "#3b82f6" },
          { name: "Android", color: "#22c55e" },
          { name: "API", color: "#f59e0b" },
          { name: "Bug", color: "#ef4444" },
          { name: "Performance", color: "#8b5cf6" },
        ],
      },
    },
    include: { labels: true },
  });

  const b2Labels = Object.fromEntries(board2.labels.map((l) => [l.name, l.id]));

  const b2ColTodo = await prisma.column.create({
    data: { title: "To Do", order: "a0", boardId: board2.id },
  });
  const b2ColInProgress = await prisma.column.create({
    data: { title: "In Progress", order: "a1", boardId: board2.id },
  });
  const b2ColTesting = await prisma.column.create({
    data: { title: "Testing", order: "a2", boardId: board2.id },
  });
  const b2ColDone = await prisma.column.create({
    data: { title: "Done", order: "a3", boardId: board2.id },
  });

  const mc1 = await prisma.card.create({
    data: {
      title: "Push notification system",
      description: "Implement push notifications for iOS and Android.",
      order: "a0",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      columnId: b2ColTodo.id,
    },
  });
  await prisma.cardLabel.createMany({
    data: [
      { cardId: mc1.id, labelId: b2Labels["iOS"] },
      { cardId: mc1.id, labelId: b2Labels["Android"] },
    ],
  });

  await prisma.card.create({
    data: {
      title: "Offline mode support",
      order: "a1",
      priority: "MEDIUM",
      columnId: b2ColTodo.id,
    },
  });

  const mc3 = await prisma.card.create({
    data: {
      title: "User profile redesign",
      order: "a0",
      priority: "MEDIUM",
      columnId: b2ColInProgress.id,
    },
  });
  await prisma.cardAssignee.create({ data: { cardId: mc3.id, userId: somchai.id } });

  const mc4 = await prisma.card.create({
    data: {
      title: "Fix login crash on Android 13",
      order: "a0",
      priority: "URGENT",
      columnId: b2ColTesting.id,
    },
  });
  await prisma.cardLabel.createMany({
    data: [
      { cardId: mc4.id, labelId: b2Labels["Bug"] },
      { cardId: mc4.id, labelId: b2Labels["Android"] },
    ],
  });

  await prisma.card.create({
    data: {
      title: "Splash screen animation",
      order: "a0",
      priority: "LOW",
      columnId: b2ColDone.id,
    },
  });
  await prisma.card.create({
    data: {
      title: "App icon redesign",
      order: "a1",
      priority: "LOW",
      columnId: b2ColDone.id,
    },
  });

  console.log("✓ Board 2: Mobile App v2.0 (4 columns, 6 cards)");

  // ── Board 3: Marketing Q2 ──
  const board3 = await prisma.board.create({
    data: {
      title: "Marketing Q2 2026",
      description: "Q2 marketing campaigns and content planning",
      color: "#059669",
      ownerId: somchai.id,
      projectId: projectMarketing.id,
      members: {
        create: [
          { userId: somchai.id, role: "OWNER" },
          { userId: nattaya.id, role: "EDITOR" },
          { userId: siriporn.id, role: "VIEWER" },
        ],
      },
      labels: {
        create: [
          { name: "Social Media", color: "#3b82f6" },
          { name: "Blog", color: "#10b981" },
          { name: "Email", color: "#f59e0b" },
          { name: "Campaign", color: "#ec4899" },
          { name: "Urgent", color: "#ef4444" },
        ],
      },
    },
    include: { labels: true },
  });

  const b3Labels = Object.fromEntries(board3.labels.map((l) => [l.name, l.id]));

  const b3ColIdeas = await prisma.column.create({
    data: { title: "Ideas", order: "a0", boardId: board3.id },
  });
  const b3ColPlanning = await prisma.column.create({
    data: { title: "Planning", order: "a1", boardId: board3.id },
  });
  const b3ColCreating = await prisma.column.create({
    data: { title: "Creating", order: "a2", boardId: board3.id },
  });
  const b3ColPublished = await prisma.column.create({
    data: { title: "Published", order: "a3", boardId: board3.id },
  });

  const mk1 = await prisma.card.create({
    data: {
      title: "Product launch video",
      description: "Create a 60-second product launch video for social media.",
      order: "a0",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      columnId: b3ColPlanning.id,
    },
  });
  await prisma.cardLabel.create({ data: { cardId: mk1.id, labelId: b3Labels["Social Media"] } });
  await prisma.cardAssignee.create({ data: { cardId: mk1.id, userId: nattaya.id } });

  const mk2 = await prisma.card.create({
    data: {
      title: "Write blog post: Top 10 productivity tips",
      order: "a0",
      priority: "MEDIUM",
      columnId: b3ColCreating.id,
    },
  });
  await prisma.cardLabel.create({ data: { cardId: mk2.id, labelId: b3Labels["Blog"] } });
  await prisma.cardAssignee.create({ data: { cardId: mk2.id, userId: nattaya.id } });

  await prisma.card.create({
    data: {
      title: "Newsletter template design",
      order: "a0",
      priority: "LOW",
      columnId: b3ColIdeas.id,
    },
  });
  await prisma.card.create({
    data: {
      title: "Influencer collaboration plan",
      order: "a1",
      priority: "MEDIUM",
      columnId: b3ColIdeas.id,
    },
  });

  const mk5 = await prisma.card.create({
    data: {
      title: "Email campaign: Spring Sale",
      order: "a0",
      priority: "HIGH",
      columnId: b3ColPublished.id,
    },
  });
  await prisma.cardLabel.createMany({
    data: [
      { cardId: mk5.id, labelId: b3Labels["Email"] },
      { cardId: mk5.id, labelId: b3Labels["Campaign"] },
    ],
  });

  console.log("✓ Board 3: Marketing Q2 2026 (4 columns, 5 cards)");

  console.log("\n✅ Seed complete!");
  console.log("\nTest accounts:");
  console.log("  admin / admin123     (Super Admin)");
  console.log("  somchai / password123 (Admin)");
  console.log("  siriporn / password123 (User)");
  console.log("  wichai / password123   (User)");
  console.log("  nattaya / password123  (User)");
  console.log("  guest / password123    (Guest - view only)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
