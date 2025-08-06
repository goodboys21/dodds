const formidable = require('formidable');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ status: false, message: 'Upload gagal', error: err });

    try {
      const file = files.file;
      const data = new FormData();
      data.append('reqtype', 'fileupload');
      data.append('fileToUpload', fs.createReadStream(file.filepath));

      // Upload ke catbox
      const catbox = await axios.post('https://catbox.moe/user/api.php', data, {
        headers: data.getHeaders()
      });

      if (!catbox.data.includes('https://files.catbox.moe')) {
        return res.status(400).json({ status: false, message: 'Gagal upload ke catbox', raw: catbox.data });
      }

      // Upload ke doodstream
      const dood = await axios.post(
        'https://doodapi.com/api/upload/url',
        new URLSearchParams({
          key: '531994j55do8njldivzmbj',
          url: catbox.data.trim()
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const result = dood.data?.result?.filecode;
      if (!result) {
        return res.status(500).json({ status: false, message: 'Gagal upload ke Doodstream', dood: dood.data });
      }

      res.json({
        status: true,
        result: 'https://dood.watch/' + result
      });
    } catch (e) {
      res.status(500).json({ status: false, message: 'Internal Error', error: e.message });
    }
  });
};

export const config = {
  api: {
    bodyParser: false,
  },
};
