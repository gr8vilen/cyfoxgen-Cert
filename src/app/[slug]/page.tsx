import { redirect, notFound } from "next/navigation";
import prisma from "../../lib/prisma";

type Props = { params: Promise<{ slug: string }> };

// This catch-all lets /something work the same as /s/something
export default async function SlugPage({ params }: Props) {
  const { slug } = await params;

  // Skip reserved paths
  const reserved = ["admin", "s", "_next", "api", "favicon.ico"];
  if (reserved.includes(slug)) notFound();

  const cert = await prisma.type1Cert.findUnique({ where: { slug } });
  if (!cert) notFound();

  // Redirect to canonical /s/[slug] page
  redirect(`/s/${slug}`);
}
