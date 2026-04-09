import prisma from "../../../../lib/prisma";
import Type1Client from "./Type1Client";

export default async function Type1Page() {
  const certs = await prisma.type1Cert.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <Type1Client initialCerts={certs} />;
}
