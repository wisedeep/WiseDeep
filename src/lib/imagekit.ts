import ImageKit from 'imagekit-javascript';

export const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IK_PUBLIC_KEY || '',
  urlEndpoint: process.env.NEXT_PUBLIC_IK_URL_ENDPOINT || '',
  authEndpoint: '/api/imagekit/auth'
});

export const uploadToImageKit = async (file: File, folder: string = 'courses'): Promise<{ url: string; fileId: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('folder', folder);

    const response = await fetch('/api/imagekit/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return { url: data.url, fileId: data.fileId };
  } catch (error) {
    console.error('Error uploading to ImageKit:', error);
    throw error;
  }
};