import express, { Router, raw, static as staticMiddleware } from "express";
import { keygenAsync, verifyAsync } from "@noble/ed25519";
import { randomBytes } from "node:crypto";
import { PrismaClientKnownRequestError } from "./generated/prisma/runtime/library.js";
import multer, { memoryStorage } from "multer";
import { PrismaClient } from "./generated/prisma/index.js";

const port = parseInt(process.env.PORT || "") || 3000;

const prisma = new PrismaClient();

const app = express();

const storage = memoryStorage();
const upload = multer({ storage });

app.use(staticMiddleware("dist/client"));

const router = Router();

app.use("/api", router);

router.get("/register", async (_req, res) => {
  const { secretKey, publicKey } = await keygenAsync();
  await prisma.user.create({ data: { publicKey }, select: { seq: true } });
  res
    .header("Content-Type", "application/octet-stream")
    .send(secretKey)
    .status(200);
});

router.post(
  "/authenticate/nonce",
  raw({ type: "application/octet-stream" }),
  async (req, res) => {
    const nonce = randomBytes(32);
    try {
      await prisma.user.update({
        where: { publicKey: req.body },
        data: { latestNonce: nonce },
        select: { seq: true },
      });
      res
        .header("Content-Type", "application/octet-stream")
        .send(nonce)
        .status(200);
      return;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          res.sendStatus(400);
          return;
        }
      }
      console.error(error);
      res.sendStatus(500);
      return;
    }
  }
);

router.post(
  "/authenticate/signature",
  upload.fields([
    { name: "signature", maxCount: 1 },
    { name: "publicKey", maxCount: 1 },
  ]),
  async (req, res) => {
    const signature = (
      req.files as { [field: string]: Express.Multer.File[] } | undefined
    )?.signature?.[0];
    const publicKey = (
      req.files as { [field: string]: Express.Multer.File[] } | undefined
    )?.publicKey?.[0];
    if (!signature || !publicKey) {
      res.sendStatus(400);
      return;
    }
    try {
      const { seq, latestNonce } = await prisma.user.findUniqueOrThrow({
        where: { publicKey: publicKey.buffer },
        select: { seq: true, latestNonce: true },
      });
      await prisma.user.update({
        where: { seq },
        data: { latestNonce: null },
      });
      if (!latestNonce) {
        res.sendStatus(400);
        return;
      }
      const isValid = await verifyAsync(
        signature.buffer,
        latestNonce,
        publicKey.buffer
      );
      if (!isValid) {
        res.sendStatus(400);
        return;
      }
      res.send({ seq: seq.toString() }).status(200);
      return;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          res.sendStatus(400);
          return;
        }
      }
      console.error(error);
      res.sendStatus(500);
      return;
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
