"use server";

import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function uploadType1Cert(formData: FormData) {
  const file = formData.get("image") as File | null;
  const rawSlug = (formData.get("slug") as string | null)?.trim() ?? "";

  if (!file || file.size === 0) {
    return { error: "Please select an image file." };
  }
  if (!rawSlug) {
    return { error: "Please provide a URL slug." };
  }

  // Normalize slug — strip leading slashes and /s/ prefix for storage
  const slug = rawSlug.replace(/^\/+/, "").replace(/^s\//, "");

  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return { error: "Slug may only contain letters, numbers, hyphens and underscores." };
  }

  // Convert image to base64
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const imageMime = file.type || "image/png";

  try {
    await prisma.type1Cert.upsert({
      where: { slug },
      update: { imageData: base64, imageMime },
      create: { slug, imageData: base64, imageMime },
    });
  } catch (e: any) {
    return { error: "DB error: " + e.message };
  }

  revalidatePath("/admin/dashboard/type1");
  return { success: true, slug };
}

export async function deleteType1Cert(id: string) {
  await prisma.type1Cert.delete({ where: { id } });
  revalidatePath("/admin/dashboard/type1");
}
