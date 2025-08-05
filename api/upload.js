// api/upload.js
import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';

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

  const form = new formidable.IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZE, // enforce 5 MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'Gagal parsing/form. File mungkin terlalu besar (max 5MB)' });
    }

    const file = files.video?.[0] || files.video;
    if (!file) {
      return res.status(400).json({ error: 'Tidak ada file yang dikirim' });
    }

    try {
      // 1. Upload ke Catbox
      const stream = fs.createReadStream(file.filepath);
      const catForm = new FormData();
      catForm.append('reqtype', 'fileupload');
      catForm.append('fileToUpload', stream, file.originalFilename);

      const catboxRes = await axios.post('https://catbox.moe/user/api.php', catForm, {
        headers: catForm.getHeaders(),
      });

      const catboxLink = catboxRes.data;

      // 2. Upload ke DoodStream
      const doodRes = await axios.post('https://doodapi.com/api/upload/url', null, {
        params: {
          key: DOOD_API_KEY,
          url: catboxLink,
        },
      });

      const filecode = doodRes.data?.result?.filecode;
      if (!filecode) throw new Error('Gagal upload ke DoodStream');

      const doodLink = `https://dood.la/e/${filecode}`;
      res.json({ success: true, link: doodLink });
    } catch (e) {
      res.status(500).json({ error: e.message });
    } finally {
      if (file?.filepath && fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath);
    }
  });
}
