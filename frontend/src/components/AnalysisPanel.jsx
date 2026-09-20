function AnalysisPanel({ detections, isLightMode, isSidebarOpen }) {
  const currentStyles = {
    ...styles,
    panel: {
      ...styles.panel,
      width: isSidebarOpen ? "350px" : "450px",
      transition: "width 0.3s ease",
      flexShrink: 0,
      backgroundColor: isLightMode ? "#ffffff" : "#111827",
      border: isLightMode ? "1px solid #e2e8f0" : "1px solid #1f2937",
      color: isLightMode ? "#1e293b" : "#e2e8f0",
      boxShadow: isLightMode ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" : "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)",
    },
    card: {
      ...styles.card,
      backgroundColor: isLightMode ? "#f8fafc" : "rgba(31, 41, 55, 0.5)",
      boxShadow: isLightMode ? "0 1px 3px 0 rgba(0,0,0,0.1)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
    idBadge: {
      ...styles.idBadge,
      backgroundColor: isLightMode ? "#e2e8f0" : "#374151",
      color: isLightMode ? "#475569" : "#d1d5db",
    },
    text: {
      ...styles.text,
      color: isLightMode ? "#334155" : "#f3f4f6",
    },
    strongText: {
      ...styles.strongText,
      color: isLightMode ? "#64748b" : "#9ca3af",
    }
  };

  return (
    <div className="analysis-panel" style={currentStyles.panel}>
      <h2 style={currentStyles.heading}>Live Analysis</h2>
      {detections.length === 0 ? (
        <p style={{ color: isLightMode ? "#64748b" : "#9ca3af", fontStyle: "italic", marginTop: "20px" }}>No crops detected in frame.</p>
      ) : (
        <div className="metrics-list" style={{ marginTop: "15px" }}>
          {detections.map((det, index) => (
            <div key={det.object_id || index} style={currentStyles.card}>
              <h3 style={currentStyles.cardTitle}>
                {det.crop.toUpperCase()} 
                <span style={currentStyles.idBadge}>ID: {det.object_id}</span>
              </h3>
              <p style={currentStyles.text}><strong style={currentStyles.strongText}>Confidence:</strong> {Math.round(det.confidence * 100)}%</p>
              
              <p style={currentStyles.text}>
                <strong style={currentStyles.strongText}>Maturity:</strong> {det.maturity?.stage || "Unknown"} ({det.maturity?.score || 0}%)
              </p>
              <p style={currentStyles.text}>
                <strong style={currentStyles.strongText}>Harvest Readiness:</strong> {det.harvest?.readiness || "Unknown"} 
                <br/>
                <span style={{ color: isLightMode ? "#64748b" : "#9ca3af", fontSize: "0.85em", marginTop: "2px", display: "inline-block" }}>Est: {det.harvest?.estimated_time || "N/A"}</span>
              </p>

              <p style={currentStyles.text}>
                <strong style={currentStyles.strongText}>Optimal Temp:</strong> {det.temperature || "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: {
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    padding: "1.5rem",
    borderRadius: "12px",
    color: "#e2e8f0",
    maxHeight: "480px",
    overflowY: "auto",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)",
  },
  heading: {
    margin: "0 0 10px 0",
    fontSize: "1.3rem",
    fontWeight: "700",
    background: "linear-gradient(135deg, #a78bfa, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  card: {
    backgroundColor: "rgba(31, 41, 55, 0.5)",
    padding: "16px",
    marginBottom: "16px",
    borderLeft: "4px solid #10b981",
    borderRadius: "6px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
  },
  cardTitle: {
    margin: "0 0 12px 0", 
    color: "#10b981",
    fontSize: "15px",
    letterSpacing: "0.5px"
  },
  idBadge: {
    fontSize: "0.75em",
    backgroundColor: "#374151",
    padding: "3px 8px",
    borderRadius: "4px",
    marginLeft: "10px",
    color: "#d1d5db",
    fontWeight: "600",
  },
  text: {
    margin: "6px 0",
    fontSize: "0.95em",
    color: "#f3f4f6",
  },
  strongText: {
    color: "#9ca3af",
    fontWeight: "500",
  }
};

export default AnalysisPanel;