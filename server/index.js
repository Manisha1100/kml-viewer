const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const { parseStringPromise } = require("xml2js");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const parseCoordinates = (coordString) => {
    return coordString
        .trim()
        .split(/\s+/)
        .map(coord => {
            const [lon, lat] = coord.split(",").map(Number);
            return [lat, lon]; // Swap order for Leaflet.js
        });
};

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const fileContent = fs.readFileSync(req.file.path, "utf8");
        const parsedData = await parseStringPromise(fileContent);
        const elements = parsedData.kml.Document[0].Placemark || [];

        const summary = {};
        const detailed = [];

        elements.forEach(item => {
            let type = "Unknown";
            let length = 0;

            if (item.Point) type = "Point";
            if (item.Polygon) type = "Polygon";
            if (item.LineString || item.MultiLineString) {
                type = item.LineString ? "LineString" : "MultiLineString";
                const coordinates = parseCoordinates(
                    item.LineString ? item.LineString[0].coordinates[0] : item.MultiLineString[0].LineString[0].coordinates[0]
                );
                length = coordinates.length;
                detailed.push({ type, length, coordinates });
            }

            summary[type] = (summary[type] || 0) + 1;
        });

        res.json({ success: true, summary, detailed });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: "Error processing KML file" });
    }
});

app.listen(5000, () => console.log("Backend running on port 5000"));
