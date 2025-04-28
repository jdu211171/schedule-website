import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { boothSchema } from "@/schemas/booth.schema";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "STUDENT") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const booths = await prisma.booth.findMany();
  return Response.json(booths);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "STUDENT") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const data = boothSchema.parse(body);
  const booth = await prisma.booth.create({ data });
  return Response.json(booth, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { boothId, ...data } = boothSchema.parse(body);
  const booth = await prisma.booth.update({
    where: { boothId },
    data,
  });
  return Response.json(booth);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { boothId } = await request.json();
  await prisma.booth.delete({ where: { boothId } });
  return Response.json({ message: "Booth deleted" });
}
