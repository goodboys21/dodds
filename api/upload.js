const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/tools/upload/doodstream', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ status: false, message: 'No file uploaded' });

  try {
    // 1. Upload ke Catbox
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'fileupload');
    catboxForm.append('fileToUpload', fs.createReadStream(req.file.path));

    const catboxRes = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
      headers: catboxForm.getHeaders()
    });

    const catboxUrl = catboxRes.data;
    if (!catboxUrl.includes('https://files.catbox.moe')) {
      return res.status(500).json({ status: false, message: 'Catbox upload failed', response: catboxRes.data });
    }

    // 2. Upload ke Doodstream
    const doodApiKey = '531994j55do8njldivzmbj';
    const doodParams = new URLSearchParams();
    doodParams.append('key', doodApiKey);
    doodParams.append('url', catboxUrl);

    const doodRes = await axios.post('https://doodapi.com/api/upload/url', doodParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    fs.unlinkSync(req.file.path); // Hapus file lokal setelah upload

    if (doodRes.data.status !== 200 || !doodRes.data.result?.filecode) {
      return res.status(500).json({ status: false, message: 'Doodstream upload failed', response: doodRes.data });
    }

    const doodUrl = `https://dood.la/d/${doodRes.data.result.filecode}`;
    res.json({ status: true, catbox: catboxUrl, doodstream: doodUrl });

  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path); // Cleanup
    res.status(500).json({ status: false, message: 'Server error', error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
