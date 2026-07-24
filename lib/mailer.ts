import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env.js";

type MailInput = { to: string; subject: string; text: string };

let transporterPromise: Promise<Transporter> | null = null;

function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  if (env.smtp.host) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      }),
    );
  } else {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({ streamTransport: true, newline: "unix", buffer: true }),
    );
  }
  return transporterPromise;
}

export async function sendMail({ to, subject, text }: MailInput): Promise<void> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
  });

  if (!env.smtp.host) {

    console.log(`\n----- [dev mailer] email to ${to} -----\nSubject: ${subject}\n\n${text}\n----------------------------------------\n`);
  } else {
    console.log(`[mailer] sent to ${to}: ${info.messageId}`);
  }
}
