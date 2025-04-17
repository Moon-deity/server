"use client";

import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useRef, useEffect, useState } from "react";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic2xheWVycGl5dXNoIiwiYSI6ImNtOWJuY2pmZzBsMGYybHM3bnJxY2lmcmMifQ.enmR_89C12BX9F2FWe3guA"; // replace with your token

export default function MapUploader() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const [uploadedData, setUploadedData] = useState(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [77.1025, 28.7041],
      zoom: 5,
    });

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
        combine_features: false,
        uncombine_features: false,
      },
    });

    map.current.addControl(draw.current);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target.result);
        setUploadedData(geojson);

        // Clear existing
        draw.current.deleteAll();

        // Load features
        draw.current.add(geojson);
      } catch (err) {
        alert("Invalid GeoJSON file!");
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const updated = draw.current.getAll();
    const blob = new Blob([JSON.stringify(updated)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "updated-data.geojson";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <input
        type="file"
        accept=".geojson,application/geo+json"
        onChange={handleFileUpload}
        className="my-4"
      />
      <button
        onClick={handleDownload}
        className="mb-4 p-2 bg-blue-600 text-white rounded"
      >
        Download Edited GeoJSON
      </button>
      <div ref={mapContainer} style={{ height: "600px", width: "100%" }} />
    </div>
  );
}
