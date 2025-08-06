import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const app = express();
const upload = multer();

const DOODSTREAM_API_KEY = "f1zrxk2a43jy"; // GANTI DENGAN PUNYAMU

app.post("/upload/doodstream", upload.single("file"), async (req, res) => {
  const apikey = req.query.apikey;
  if (apikey !== "bagus") {
    return res.status(403).json({ success: false, message: "API key salah!" });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "File tidak ditemukan!" });
  }

  try {
    const form = new FormData();
    form.append("api_key", DOODSTREAM_API_KEY);
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const response = await axios.post("https://doodapi.com/api/upload", form, {
      headers: form.getHeaders()
    });

    return res.json(response.data);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal upload ke DoodStream.",
      error: err.message
    });
  }
});

app.get("/", (_, res) => {
  res.send("✅ Endpoint aktif: POST /upload/doodstream");
});

app.listen(3000, () => {
  console.log("Server aktif di port 3000");
});
