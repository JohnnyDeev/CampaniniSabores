import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Validar tipo
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato não suportado. Use JPG, PNG ou WebP.'
    };
  }

  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Máximo 5MB.'
    };
  }

  return { valid: true };
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadProductImage(
  file: File,
  productId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ url: string; path: string }> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Criar nome único para o arquivo
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop();
  const fileName = `products/${productId || 'new'}/${timestamp}_${randomId}.${extension}`;

  // Criar referência no Storage
  const storageRef = ref(storage, fileName);

  // Iniciar upload
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      // Progress
      (snapshot) => {
        const progress: UploadProgress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        };
        onProgress?.(progress);
      },
      // Error
      (error) => {
        console.error('Erro no upload:', error);
        reject(new Error('Erro ao fazer upload da imagem. Tente novamente.'));
      },
      // Success
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: fileName
          });
        } catch (error) {
          reject(new Error('Erro ao obter URL da imagem.'));
        }
      }
    );
  });
}

export async function deleteProductImage(imagePath: string): Promise<void> {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    // Não lança erro se a imagem não existir
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
