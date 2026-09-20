// frontend/src/components/DetectionOverlay.jsx

function DetectionOverlay({ detection }) {
  const { bbox, crop, object_id, confidence, maturity, harvest } = detection;
  const [x1, y1, x2, y2] = bbox;

  // Render the bounding box at the exact YOLO coordinates
  const boxStyle = {
    position: "absolute",
    left: `${x1}px`,
    top: `${y1}px`,
    width: `${x2 - x1}px`,
    height: `${y2 - y1}px`,
    border: "2px solid #00ff00",
    pointerEvents: "none", // Ensures it doesn't block interactions
  };

  const labelStyle = {
    position: "absolute",
    top: "-45px", // Pulled down closer to the bounding box
    left: "-2px",
    backgroundColor: "rgba(0, 0, 0, 0.85)", // Slight opacity
    border: "1.5px solid #00ff00",
    color: "#fff",
    padding: "4px 8px", // Compact padding
    borderRadius: "3px",
    fontSize: "12px", // Smaller, readable font
    whiteSpace: "nowrap", // Keeps content tight in a rectangular shape
    textAlign: "left", // Clean left-aligned layout
  };

  return (
    <div style={boxStyle}>
      <div style={labelStyle}>
        <div>
          <strong style={{ color: "#00ff00", marginRight: "6px" }}>{crop.toUpperCase()}</strong> 
          ({object_id}) · {Math.round(confidence * 100)}%
        </div>
        <div style={{ color: "#ddd", marginTop: "3px" }}>
          Mat: {maturity?.score !== undefined ? `${maturity.score}%` : "N/A"} | Harv: {harvest?.estimated_time || "N/A"}
        </div>
      </div>
    </div>
  );
}

export default DetectionOverlay;