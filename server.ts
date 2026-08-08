import express from 'express';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import { Readable } from 'stream';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { pipeline } from 'stream/promises';

const upload = multer({ dest: os.tmpdir() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Wait for file processing on Gemini
  async function waitForFileActive(ai: any, fileName: string) {
    console.log(`Waiting for file ${fileName} to be processed...`);
    let file = await ai.files.get({ name: fileName });
    while (file.state === 'PROCESSING') {
      console.log('File is processing, waiting...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      file = await ai.files.get({ name: fileName });
    }
    if (file.state === 'FAILED') {
      throw new Error('Video processing failed on Gemini side.');
    }
    return file;
  }

  app.post('/api/analyze', upload.single('video'), async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const { videoUrl, prompt } = req.body;
      let filePath = '';
      let mimeType = 'video/mp4'; // default
      let cleanup = () => {};

      if (videoUrl) {
        console.log(`Downloading video from URL: ${videoUrl}`);
        // Handle URL
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        mimeType = response.headers.get('content-type') || 'video/mp4';
        filePath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
        const fileStream = fs.createWriteStream(filePath);
        if (response.body) {
           const nodeStream = Readable.fromWeb(response.body as any);
           await pipeline(nodeStream, fileStream);
        } else {
           throw new Error('No response body from fetch.');
        }
        cleanup = () => fs.unlink(filePath, () => {});
      } else if (req.file) {
        console.log(`Using uploaded file: ${req.file.path}`);
        // Handle file upload
        filePath = req.file.path;
        mimeType = req.file.mimetype;
        cleanup = () => fs.unlink(filePath, () => {});
      } else {
        return res.status(400).json({ error: 'Please provide either a video file or a videoUrl' });
      }

      const promptText = prompt || 'Analyze this video and provide a summary of the key information, events, and subjects shown.';

      console.log(`Uploading file ${filePath} with mimeType ${mimeType} to Gemini...`);
      // Upload to Gemini
      let uploadedFile = await ai.files.upload({
        file: filePath,
        config: { mimeType }
      });

      // Cleanup local file immediately after upload
      cleanup();

      console.log(`Uploaded file as ${uploadedFile.name}. Waiting for it to become ACTIVE.`);

      // Wait for it to become ACTIVE
      uploadedFile = await waitForFileActive(ai, uploadedFile.name!);
      console.log(`File is ACTIVE. Generating content...`);

      // Analyze with Gemini 3.1 Pro Preview as requested
      const result = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          { fileData: { fileUri: uploadedFile.uri!, mimeType: uploadedFile.mimeType! } },
          { text: promptText },
        ],
      });

      console.log('Analysis complete.');
      // Return response
      res.json({ result: result.text });

    } catch (error: any) {
      console.error('Error in /api/analyze:', error);
      res.status(500).json({ error: error.message || 'An error occurred during analysis.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
