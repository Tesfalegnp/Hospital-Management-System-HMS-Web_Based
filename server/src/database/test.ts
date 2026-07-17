import prisma from "./prisma.js";

async function testDatabase() {
  try {
    await prisma.$connect();

    console.log("======================================");
    console.log("✅ Connected to Supabase PostgreSQL");
    console.log("======================================");
  } catch (error) {
    console.error("======================================");
    console.error("❌ Database Connection Failed");
    console.error(error);
    console.error("======================================");
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();