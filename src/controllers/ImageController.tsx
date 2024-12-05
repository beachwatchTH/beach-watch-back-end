import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const ImageController = {
  create: async (
    markerId: number,
    imageUrl: string,
    dateTaken?: Date,
    timeTaken?: string
  ) => {
    const markerExists = await prisma.marker.findUnique({
      where: { id: markerId },
    });

    if (!markerExists) {
      throw new Error(`Marker with ID ${markerId} does not exist.`);
    }

    return await prisma.image.create({
      data: {
        imageUrl,
        dateTaken,
        timeTaken,
        marker: {
          connect: { id: markerId },
        },
      },
    });
  },
};
