import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (jpg, jpeg, png, webp)' },
        { status: 400 }
      );
    }

    const originalName = file.name.toLowerCase();
    const ext = path.extname(originalName);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Extensión de archivo no permitida' },
        { status: 400 }
      );
    }

    const uniqueName = `uploads/${Date.now()}-${crypto.randomUUID()}${ext}`;

    const blob = await put(uniqueName, file, {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
  }
}
