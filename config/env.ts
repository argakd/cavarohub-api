import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  clientUrl: process.env.CLIENT_URL ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "Event Platform <no-reply@eventplatform.local>",
  },
};
