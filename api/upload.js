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
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
      return res.status(400).json({ error: 'File error atau terlalu besar' });
    }

    const file = files.video?.[0] || files.video;
    if (!file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }

    try {
      const catForm = new FormData();
      catForm.append('reqtype', 'fileupload');
      catForm.append('fileToUpload', fs.createReadStream(file.filepath), file.originalFilename);

      const catbox = await axios.post('https://catbox.moe/user/api.php', catForm, {
        headers: catForm.getHeaders(),
      });

      const catboxLink = catbox.data;
      const dood = await axios.post('https://doodapi.com/api/upload/url', null, {
        params: {
          key: DOOD_API_KEY,
          url: catboxLink,
        },
      });

      const filecode = dood.data?.result?.filecode;
      if (!filecode) throw new Error('Gagal upload ke DoodStream');

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
