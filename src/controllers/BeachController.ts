import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function convertToUtcIso(dateString: string): string {
  // แปลงวันที่จาก 'YYYY-MM-DD' ไปเป็น Date object
  const date = new Date(dateString);

  date.setHours(14);
  date.setMinutes(7);
  date.setSeconds(10);
  date.setMilliseconds(569);

  // แปลงเป็นรูปแบบ ISO 8601 (ในรูปแบบ UTC)
  const isoString = date.toISOString();

  return isoString;
}

export const BeachController = {
  list: async () => {
    return await prisma.beach.findMany({
      include: {
        markers: true,
      },
      orderBy: {
        id: "asc",
      },
    });
  },
  getBeachById: async ({ params }: { params: { id: string } }) => {
    return await prisma.beach.findMany({
      where: {
        id: parseInt(params.id),
      },
      include: {
        markers: true,
      },
    });
  },
  getBeachByMarkerIdAndImageDate: async ({
    params,
  }: {
    params: { markerId: string; date: string };
  }) => {
    const { markerId, date } = params;

    const dateConvert = convertToUtcIso(date);
    const startOfDay = new Date(dateConvert);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateConvert);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(dateConvert);

    return await prisma.beach.findMany({
      where: {
        markers: {
          some: {
            id: parseInt(markerId),
            images: {
              some: {
                createdAt: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
            },
          },
        },
      },
      include: {
        markers: {
          include: {
            images: {
              where: {
                createdAt: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });
  },
};
