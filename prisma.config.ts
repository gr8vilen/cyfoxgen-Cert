import "dotenv/config";

// Notice we aren't heavily typing the export here to avoid missing module errors
// from @prisma/config if it isn't installed.
export default {
  datasource: {
    url: process.env.DB_URL || process.env.DATABASE_URL,
  },
};
