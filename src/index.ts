import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";
import { BeachController } from "./controllers/BeachController";
import { fromEnv } from "@aws-sdk/credential-providers";
import { Upload } from "@aws-sdk/lib-storage";
import * as S3 from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const prisma = new PrismaClient();

const s3 = new S3.S3Client({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

const putObject = async ({ key, file }: { key: string; file: File | Blob }) => {
  const arrayBufferTest = await file.arrayBuffer();
  const content = Buffer.from(arrayBufferTest);

  const command = new S3.PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: content,
  });

  // const parallelUploads3 = new Upload({
  //   client: s3,
  //   params: { Bucket: process.env.AWS_BUCKET, Key: key, Body: content },

  //   // tags: [
  //   //   /*...*/
  //   // ], // optional tags
  //   queueSize: 4, // optional concurrency configuration
  //   partSize: 1024 * 1024 * 20, // optional size of each part, in bytes, at least 5MB
  //   leavePartsOnError: true, // optional manually handle dropped parts
  // })

  try {
    const response = await s3.send(command);

    // const response = await parallelUploads3.done()

    return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const app = new Elysia()
  .use(cors())
  .use(staticPlugin())
  .use(
    swagger({
      documentation: {
        tags: [
          { name: "Beach", description: "Beach relate endpoints" },
          {
            name: "beachMarker",
            description: "beachMarkers relate endpoints",
          },
          {
            name: "beachMakerImage",
            description: "beachMakerImages relate endpoints",
          },
        ],
      },
    })
  )
  .use(
    jwt({
      name: "jwt",
      secret: "secret",
    })
  )

  .group("api/beach", (app) =>
    app
      .get("/", BeachController.list, { tags: ["Beach"] })
      .get("/:id", BeachController.getBeachById, {
        tags: ["Beach"],
      })
      .get(
        "/filter/:markerId/:date",
        BeachController.getBeachByMarkerIdAndImageDate,
        {
          tags: ["Beach"],
        }
      )
      .post(
        "/upload-image",
        async (
          req: {
            body: {
              markerId: string;
              dateTaken: string;
              timeTaken: string;
            };
          },
          res: any
        ) => {
          try {
            const { markerId, dateTaken, timeTaken } = req.body;

            // ตรวจสอบว่า markerId มีอยู่จริง
            const marker = await prisma.marker.findUnique({
              where: { id: Number(markerId) },
            });

            if (!marker) {
              return res
                .status(400)
                .send({ error: `Marker with ID ${markerId} does not exist.` });
            }

            const imageUrl: string = "test";

            const newImage = await prisma.image.create({
              data: {
                imageUrl,
                dateTaken: dateTaken ? new Date(dateTaken) : undefined,
                timeTaken,
                marker: {
                  connect: { id: Number(markerId) },
                },
              },
            });

            res.status(201).send(newImage);
          } catch (error) {
            res.status(500).send({ error: error });
          }
        }
      )
      .post(
        "/upload-file",
        async ({
          body,
        }: {
          body: {
            file: any;
            markerId: string;
            dateTaken?: string;
            timeTaken?: string;
          };
        }) => {
          try {
            // async function uploadFileToCloud(file: any): Promise<string> {
            //   // จำลอง URL ของไฟล์ที่อัปโหลด
            //   return `https://example-cloud-storage.com/${file.name}`;
            // }

            // ตรวจสอบว่ามี file และ markerId
            if (!body.file || !body.markerId) {
              return { error: "File or markerId is missing" };
            }

            const { file, markerId, dateTaken, timeTaken } = body;

            // ตรวจสอบว่า markerId มีอยู่ในระบบ
            const marker = await prisma.marker.findUnique({
              where: { id: Number(markerId) },
            });

            if (!marker) {
              return { error: `Marker with ID ${markerId} does not exist.` };
            }

            // อัปโหลดไฟล์ (ใช้ฟังก์ชันจำลองแทน AWS S3)
            const imageUrl: any = await putObject({
              key: `${Date.now().toString()}-markerId-${markerId}.jpg`,
              file: file,
            });

            console.log(imageUrl);

            // บันทึกข้อมูลลงฐานข้อมูล
            const newImage = await prisma.image.create({
              data: {
                imageUrl,
                dateTaken: dateTaken ? new Date(dateTaken) : undefined,
                timeTaken,
                marker: {
                  connect: { id: parseInt(markerId) },
                },
              },
            });

            return { message: "File Uploaded", newImage };
          } catch (error) {
            return { error: error };
          }
        }
      )
  )

  .listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
