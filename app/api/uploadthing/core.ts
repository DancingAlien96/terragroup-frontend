import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const f = createUploadthing();

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme';

async function authFromRequest(req: Request) {
  // Try Authorization header first, then cookie
  let token: string | undefined;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get('tg_token')?.value;
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return { userId: String(payload.id ?? payload.sub ?? 'unknown') };
  } catch {
    return null;
  }
}

export const ourFileRouter = {
  comprobantePago: f({
    image: { maxFileSize: '8MB', maxFileCount: 1 },
    pdf:   { maxFileSize: '8MB', maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      const user = await authFromRequest(req);
      if (!user) throw new Error('No autorizado');
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  expedienteDoc: f({
    pdf: { maxFileSize: '16MB', maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      const user = await authFromRequest(req);
      if (!user) throw new Error('No autorizado');
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
