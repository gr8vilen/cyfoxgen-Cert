import prisma from "./src/lib/prisma";

async function main() {
  try {
    const time = await prisma.$queryRaw`SELECT 1`;
    console.log("SUCCESS", time);
  } catch (e) {
    console.error("ERROR", e);
  } finally {
    process.exit(0);
  }
}

main();
