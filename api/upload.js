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
      return res.status(400).json({ error: 'File error / terlalu besar' });
    }

    const file = files.video?.[0] || files.video;
    if (!file) {
      return res.status(400).json({ error: 'File kosong' });
    }

    try {
      // 1. Upload ke CloudGood
      const stream = fs.createReadStream(file.filepath);
      const cloudForm = new FormData();
      cloudForm.append('file', stream, file.originalFilename);

      const cloudRes = await axios.post('https://cloudgood.web.id/upload.php', cloudForm, {
        headers: cloudForm.getHeaders(),
      });

      const cloudLink = cloudRes.data?.url || cloudRes.data?.result || cloudRes.data;

      if (!cloudLink || !cloudLink.includes('http')) {
        throw new Error('Gagal upload ke CloudGood');
      }

      // 2. Upload ke DoodStream
      const doodRes = await axios.post('https://doodapi.com/api/upload/url', null, {
        params: {
          key: DOOD_API_KEY,
          url: cloudLink,
        },
      });

      const filecode = doodRes.data?.result?.filecode;
      const msg = doodRes.data?.msg;

      if (!filecode) {
        throw new Error(`DoodStream gagal: ${msg || 'tanpa pesan'}`);
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
