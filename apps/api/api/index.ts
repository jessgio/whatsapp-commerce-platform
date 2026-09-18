/**
 * Vercel serverless entry (Express adapter). Local `npm run dev:api` uses Fastify.
 * Deploy this folder as a second Vercel project: Root Directory = apps/api.
 */
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { type Express, type Request, type Response } from "express";
import { AppModule } from "../dist/app.module";
import { corsOrigins } from "../dist/env";

const server: Express = express();
let ready: Promise<void> | null = null;

function bootstrap(): Promise<void> {
  if (!ready) {
    ready = NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ["error", "warn"],
    }).then(async (app) => {
      app.enableCors({ origin: corsOrigins(), credentials: true });
      await app.init();
    });
  }
  return ready;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  server(req, res);
}
