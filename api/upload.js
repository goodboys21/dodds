const formidable = require('formidable');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const DOOD_API_KEY = '531994j55do8njldivzmbj';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const form = new formidable.IncomingForm({
    maxFileSize: MAX_FILE_SIZE,
    keepExtensions: true,
    uploadDir: '/tmp',
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'File error (mungkin terlalu besar)' });
    }

    const file = files.video;
    if (!file) {
      return res.status(400).json({ error: 'File tidak ditemukan' });
    }

    try {
      // Upload ke Catbox
      const formCat = new FormData();
      formCat.append('reqtype', 'fileupload');
      formCat.append('fileToUpload', fs.createReadStream(file.filepath), file.originalFilename);

      const catbox = await axios.post('https://catbox.moe/user/api.php', formCat, {
        headers: formCat.getHeaders(),
      });

      const catboxLink = catbox.data;
      if (!catboxLink.includes('https://')) throw new Error('Gagal upload ke Catbox');

      // Upload ke Doodstream
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
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      try {
        fs.unlinkSync(file.filepath);
      } catch (e) {}
    }
  });
};
