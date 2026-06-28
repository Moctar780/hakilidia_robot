import sharp from 'sharp';

const MIN_IMAGE_SIZE = 32;
const MAX_IMAGE_SIZE = 4096;
const MAX_PAYLOAD_BYTES = 3_500_000;

/**
 * Valide une URL de données d'image (data URL) côté serveur avant envoi à Python.
 * Vérifie le format, la taille et les dimensions minimales.
 *
 * @returns `true` si l'image est valide
 * @throws Error avec un message explicite si invalide
 */
export async function validateImage(
  imageDataUrl: string | undefined,
): Promise<boolean> {
  if (!imageDataUrl) {
    throw new Error('Aucune image fournie.');
  }

  const commaIndex = imageDataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Format data URL invalide (virgule manquante).');
  }

  const header = imageDataUrl.slice(0, commaIndex);
  if (!header.startsWith('data:image/')) {
    throw new Error(
      `Format d'image non supporté: "${header.slice(0, 40)}..." — attendu "data:image/..."`,
    );
  }

  const rawPayload = imageDataUrl.slice(commaIndex + 1);
  if (rawPayload.length > MAX_PAYLOAD_BYTES) {
    throw new Error(
      `Image trop volumineuse: ${rawPayload.length} octets, maximum ${MAX_PAYLOAD_BYTES}.`,
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(rawPayload, 'base64');
  } catch {
    throw new Error('Payload Base64 invalide.');
  }

  if (buffer.length < 100) {
    throw new Error('Image vide ou trop petite (< 100 octets après décodage).');
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new Error('Impossible de décoder l\'image — format corrompu ou non supporté.');
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) {
    throw new Error(
      `Image trop petite: ${width}×${height} px — minimum ${MIN_IMAGE_SIZE}×${MIN_IMAGE_SIZE} px.`,
    );
  }

  if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image trop grande: ${width}×${height} px — maximum ${MAX_IMAGE_SIZE}×${MAX_IMAGE_SIZE} px.`,
    );
  }

  return true;
}
