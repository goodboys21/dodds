import axios from "axios";
import Busboy from "busboy";
import FormData from "form-data";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Only POST allowed");

  const apikey = req.query.apikey;
  if (apikey !== "bagus") {
    return res.status(403).json({ success: false, message: "API key salah!" });
  }

  const busboy = Busboy({ headers: req.headers });
  let fileBuffer = null;
  let fileName = "";

  busboy.on("file", (_, file, info) => {
    fileName = info.filename;
    const chunks = [];
    file.on("data", (chunk) => chunks.push(chunk));
    file.on("end", () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on("finish", async () => {
    if (!fileBuffer) {
      return res.status(400).json({ success: false, message: "File tidak ditemukan!" });
    }

    try {
      // 1. Upload ke Catbox
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fileBuffer, fileName);

      const catbox = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders()
      });

      if (!catbox.data.startsWith("https://files.catbox.moe/")) {
        return res.status(500).json({ success: false, message: "Gagal Eror", raw: catbox.data });
      }

      const catboxUrl = catbox.data;

      // 2. Upload ke DoodStream pakai link Catbox
      const dood = await axios.post(
        "https://doodapi.com/api/upload/url",
        new URLSearchParams({
          key: "531994j55do8njldivzmbj",
          url: catboxUrl
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }
      );

      if (dood.data.status !== 200 || !dood.data.result?.filecode) {
        return res.status(500).json({
          success: false,
          message: "Gagal upload ke DoodStream",
          raw: dood.data
        });
      }

      const filecode = dood.data.result.filecode;
      const downloadUrl = `https://dood.la/d/${filecode}`;
      const viewUrl = `https://dood.la/e/${filecode}`;
      const uploadDate = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

      return res.json({
        success: true,
        creator: "Bagus Bahril",
        filename: fileName,
        uploaded_at: uploadDate,
        download_url: downloadUrl,
        view_url: viewUrl
      });

    } catch (err) {
      return res.status(500).json({ success: false, message: "Gagal saat upload", error: err.message });
    }
  });

  req.pipe(busboy);
}
