import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

/**
 * 動画ページURL → m3u8情報返す
 */
app.get("/video-info", async (req, res) => {
    try {
        const targetUrl = req.query.url;

        const html = await fetch(targetUrl).then(r => r.text());

        // preloadのm3u8を抽出
        const match = html.match(/href="([^"]+_TPL_.*?\.mp4\.m3u8)"/);

        if (!match) {
            return res.status(404).json({ error: "m3u8 not found" });
        }

        const template = match[1];
        const sampleUrl = template.replace("_TPL_", "720p");
        const id = safeId(extractId(sampleUrl));

        // 解像度抽出
        const multiMatch = template.match(/multi=([^/]+)/);

        const resolutions = multiMatch
            ? multiMatch[1]
                .split(",")
                .map(v => {
                    const parts = v.split(":");
                    return parts[1] || parts[0].split("x")[1];
                })
                .filter(Boolean)
            : [];

        res.json({
            template,
            resolutions,
            id
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function extractId(url) {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0].split(",")[0];
}

function safeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Proxy（必要時のみ）
 */
app.get("/proxy", async (req, res) => {
    const url = req.query.url;

    const r = await fetch(url, {
        headers: {
            referer: "https://xhcdn.com"
        }
    });

    res.setHeader("Content-Type", r.headers.get("content-type"));
    r.body.pipe(res);
});

app.listen(3000, () => console.log("Server running"));