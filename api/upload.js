const axios = require("axios");
const Busboy = require("busboy");
const FormData = require("form-data");

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const busboy = new Busboy({ headers: req.headers });
  let fileBuffer = Buffer.alloc(0);
  let fileName = "";

  busboy.on("file", (fieldname, file, filename) => {
    fileName = filename;
    file.on("data", (data) => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
  });

  busboy.on("finish", async () => {
    try {
      // Step 1: Upload ke catbox.moe
      const catForm = new FormData();
      catForm.append("reqtype", "fileupload");
      catForm.append("fileToUpload", fileBuffer, fileName);

      const catbox = await axios.post("https://catbox.moe/user/api.php", catForm, {
        headers: catForm.getHeaders(),
      });

      const catboxUrl = catbox.data;

      // Step 2: Upload ke DoodStream pakai link dari catbox
      const dood = await axios.post("https://doodapi.com/api/upload/url", null, {
        params: {
          key: "531994j55do8njldivzmbj", // Ganti dengan API key kamu
          url: catboxUrl,
        },
      });

      res.json({
        status: "success",
        doodstream: dood.data,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  req.pipe(busboy);
};
