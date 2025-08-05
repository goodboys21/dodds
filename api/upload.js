import { IncomingForm } from 'formidable';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DOOD_API_KEY = '531994j55do8njldivzmbj';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const form = new IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZE,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'File error / mungkin terlalu besar' });
    }

    const file = files.video?.[0] || files.video;
    if (!file) {
      return res.status(400).json({ error: 'File kosong' });
    }

    try {
      // 1. Upload ke transfer.sh
      const stream = fs.createReadStream(file.filepath);
      const filename = file.originalFilename || 'video.mp4';
      const transfer = await axios.put(`https://transfer.sh/${filename}`, stream, {
        headers: { 'Content-Type': 'video/mp4' },
      });

      const transferLink = transfer.data;
      if (!transferLink.startsWith('https://')) throw new Error('Gagal upload ke transfer.sh');

      // 2. Upload ke DoodStream
      const doodRes = await axios.post('https://doodapi.com/api/upload/url', null, {
        params: {
          key: DOOD_API_KEY,
          url: transferLink,
        },
      });

      const filecode = doodRes.data?.result?.filecode;
      const message = doodRes.data?.msg;

      if (!filecode) {
        throw new Error(`DoodStream error: ${message || 'tidak diketahui'}`);
      }

      const doodLink = `https://dood.la/e/${filecode}`;
      res.json({ success: true, link: doodLink });
    } catch (e) {
      res.status(500).json({ error: e.message });
    } finally {
      try {
        if (file?.filepath && fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath);
      } catch {}
    }
  });
}
