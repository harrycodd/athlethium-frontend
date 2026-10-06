import { File, UploadTask, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { authHeaders, functionUrl } from './api';

const UPLOAD_FIT_URL = functionUrl('upload_workout_fit');

export interface UploadFitResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Robust .fit file uploader for iOS, Android, and Web in Expo.
 * Uses native FileSystem UploadTask on iOS/Android to prevent FormDataPart issues.
 */
export async function uploadFitFile(
  userId: string,
  file: { uri: string; name: string; mimeType?: string },
  workoutId?: string
): Promise<UploadFitResult> {
  try {
    if (Platform.OS !== 'web') {
      const parameters: Record<string, string> = {
        userId,
      };
      if (workoutId) {
        parameters.workoutId = workoutId;
      }

      const fileObj = new File(file.uri);
      const uploadTask = new UploadTask(fileObj, UPLOAD_FIT_URL, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        parameters,
        headers: await authHeaders({ Accept: 'application/json' }),
      });

      const uploadResult = await uploadTask.uploadAsync();

      if (uploadResult.status >= 200 && uploadResult.status < 300) {
        let parsedData = {};
        try {
          parsedData = JSON.parse(uploadResult.body);
        } catch {
          parsedData = { raw: uploadResult.body };
        }
        return { success: true, data: parsedData };
      } else {
        let errorMsg = `Upload failed (Status ${uploadResult.status})`;
        try {
          const parsed = JSON.parse(uploadResult.body);
          if (parsed.error) errorMsg = parsed.error;
        } catch {
          if (uploadResult.body) errorMsg = uploadResult.body;
        }
        throw new Error(errorMsg);
      }
    } else {
      // Web fallback
      const formData = new FormData();
      formData.append('userId', userId);
      if (workoutId) {
        formData.append('workoutId', workoutId);
      }

      const res = await fetch(file.uri);
      const blob = await res.blob();
      formData.append('file', blob, file.name);

      const response = await fetch(UPLOAD_FIT_URL, {
        method: 'POST',
        body: formData,
        headers: await authHeaders({ Accept: 'application/json' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      const data = await response.json();
      return { success: true, data };
    }
  } catch (error: any) {
    console.error('FIT upload failed:', error);
    return {
      success: false,
      error: error?.message || 'An unknown error occurred during FIT upload.',
    };
  }
}
