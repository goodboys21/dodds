const formidable = require('formidable');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const DOOD_API_KEY = '531994j55do8njldivzmbj';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const form = new formidable.IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZE,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'File error (Max 5MB?)' });
    }

    const file = files.video?.[0] || files.video;
    if (!file) {
      return res.status(400).json({ error: 'File kosong' });
    }

    try {
      const stream = fs.createReadStream(file.filepath);
      const catForm = new FormData();
      catForm.append('reqtype', 'fileupload');
      catForm.append('fileToUpload', stream, file.originalFilename);

      const catboxRes = await axios.post('https://catbox.moe/user/api.php', catForm, {
        headers: catForm.getHeaders(),
      });

      const catboxLink = catboxRes.data;

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
};
