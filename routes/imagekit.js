import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import ImageKit from 'imagekit';
import { IncomingForm } from 'formidable';
import { createReadStream } from 'fs';
import { promisify } from 'util';

const router = express.Router();

// Initialize ImageKit
let imagekit = null;
if (process.env.NEXT_PUBLIC_IK_PUBLIC_KEY &&
  process.env.IK_PRIVATE_KEY &&
  process.env.NEXT_PUBLIC_IK_URL_ENDPOINT) {
  imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IK_PUBLIC_KEY,
    urlEndpoint: process.env.NEXT_PUBLIC_IK_URL_ENDPOINT,
    privateKey: process.env.IK_PRIVATE_KEY
  });
}

// Auth endpoint
router.get('/auth', (req, res) => {
  if (!imagekit) {
    return res.status(500).json({ error: 'ImageKit not configured' });
  }
  try {
    const signatureObj = imagekit.getAuthenticationParameters(
      process.env.IK_TOKEN_EXPIRE || uuidv4(),
      Math.floor(Date.now() / 1000) + 1800 // 30 minutes expiry
    );
    res.status(200).json(signatureObj);
  } catch (error) {
    console.error('ImageKit auth error:', error);
    res.status(500).json({ error: 'Failed to generate authentication parameters' });
  }
});


// Upload endpoint
router.post('/upload', async (req, res) => {
  if (!imagekit) {
    return res.status(500).json({ error: 'ImageKit not configured' });
  }
  try {
    const form = new IncomingForm();

    // Correct way to parse form with formidable v3
    // We cannot simply use promisify on form.parse because the callback signature
    // is (err, fields, files), and promisify typically only returns the second arg.
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    // Check if file exists
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = Array.isArray(fields.fileName) ? fields.fileName[0] : fields.fileName;
    const folder = Array.isArray(fields.folder) ? fields.folder[0] : fields.folder;

    const fileStream = createReadStream(file.filepath);

    const response = await imagekit.upload({
      file: fileStream,
      fileName: fileName || file.originalFilename || 'file',
      folder: folder || 'uploads',
      useUniqueFileName: true
    });

    res.status(200).json({
      url: response.url,
      fileId: response.fileId
    });
  } catch (error) {
    console.error('ImageKit upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

export default router;