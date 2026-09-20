import { useEffect, useRef, useState } from "react";
import VideoCanvas from "./components/VideoCanvas";
import AnalysisPanel from "./components/AnalysisPanel";
import "./App.css";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/detect`;
  
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 480;
const JPEG_QUALITY = 0.6;
const RESPONSE_TIMEOUT_MS = 8000;

function App() {
  const [detections, setDetections] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [connectionState, setConnectionState] = useState("Connecting");
  const [streamActive, setStreamActive] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [inputMode, setInputMode] = useState("Live Camera Feed");
  const [confidence, setConfidence] = useState(0.40);
  const [frameSkip, setFrameSkip] = useState(0);
  const [resolution, setResolution] = useState(640);
  const [clahe, setClahe] = useState(false);
  
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);

  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const waitingForResponseRef = useRef(false);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(false);

  const settingsRef = useRef({ confidence, frameSkip, resolution, clahe });
  const inputModeRef = useRef(inputMode);
  const streamActiveRef = useRef(streamActive);
  const needResetTrackerRef = useRef(false);

  useEffect(() => {
    settingsRef.current = { confidence, frameSkip, resolution, clahe };
    inputModeRef.current = inputMode;
    streamActiveRef.current = streamActive;
  }, [confidence, frameSkip, resolution, clahe, inputMode, streamActive]);


  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [isLightMode]);

  // When settings change in Image mode, trigger a re-render
  useEffect(() => {
    if (inputMode === "Image" && uploadedFileUrl && wsRef.current?.readyState === WebSocket.OPEN && !waitingForResponseRef.current) {
        needResetTrackerRef.current = true;
        captureAndSendOnce();
    }
  }, [confidence, resolution, clahe, uploadedFileUrl]); // Wait, if uploadedFileUrl changes it should re-run too.

  const clearWait = () => {
    waitingForResponseRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const getSourceElement = () => {
      if (inputModeRef.current === "Image") return imageRef.current;
      return videoRef.current;
  };

  const sendPayload = (sourceElement) => {
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!canvas || !ws || ws.readyState !== WebSocket.OPEN) return false;

    const context = canvas.getContext("2d");
    context.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    const payload = {
      image,
      settings: settingsRef.current
    };

    if (needResetTrackerRef.current) {
      payload.reset_tracker = true;
      needResetTrackerRef.current = false;
    }

    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error("Failed to send frame:", error);
      return false;
    }
  };

  const captureAndSendOnce = () => {
    if (!mountedRef.current) return;
    const sourceElement = getSourceElement();
    if (!sourceElement) return;

    if (inputModeRef.current === "Video" && sourceElement.readyState < 2) return;
    if (inputModeRef.current === "Live Camera Feed" && sourceElement.readyState < 2) return;

    waitingForResponseRef.current = true;
    timeoutRef.current = setTimeout(() => {
      waitingForResponseRef.current = false;
      timeoutRef.current = null;
    }, RESPONSE_TIMEOUT_MS);

    if (!sendPayload(sourceElement)) {
        clearWait();
    }
  };

  const captureAndSendLoop = () => {
    if (!mountedRef.current) return;

    if (!streamActiveRef.current || inputModeRef.current === "Image") {
      requestAnimationFrame(captureAndSendLoop);
      return;
    }

    const sourceElement = getSourceElement();
    if (!sourceElement || waitingForResponseRef.current) {
      requestAnimationFrame(captureAndSendLoop);
      return;
    }

    if (sourceElement.readyState < 2) {
      requestAnimationFrame(captureAndSendLoop);
      return;
    }

    waitingForResponseRef.current = true;
    timeoutRef.current = setTimeout(() => {
      waitingForResponseRef.current = false;
      timeoutRef.current = null;
      requestAnimationFrame(captureAndSendLoop);
    }, RESPONSE_TIMEOUT_MS);

    if (!sendPayload(sourceElement)) {
        clearWait();
        requestAnimationFrame(captureAndSendLoop);
    }
  };

  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          if (uploadedFileUrl) {
              URL.revokeObjectURL(uploadedFileUrl);
          }
          const url = URL.createObjectURL(file);
          setUploadedFileUrl(url);
          setDetections([]);
          needResetTrackerRef.current = true;
      }
  };

  useEffect(() => {
    mountedRef.current = true;

    const initWebSocket = () => {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (inputModeRef.current !== "Image") {
              captureAndSendLoop();
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setDetections(data.detections || []);
            if (data.error) {
              console.error("Backend error:", data.error);
            }
          } catch (error) {
            console.error("Invalid WebSocket response:", error);
          } finally {
            clearWait();
            
            if (inputModeRef.current === "Image") return;

            const delay = settingsRef.current.frameSkip * 100;
            if (delay > 0) {
              setTimeout(() => {
                requestAnimationFrame(captureAndSendLoop);
              }, delay);
            } else {
              requestAnimationFrame(captureAndSendLoop);
            }
          }
        };

        ws.onclose = () => {
          if (wsRef.current === ws) {
            setConnectionState("Disconnected");
          }
          clearWait();
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          if (wsRef.current === ws) {
            setConnectionState("Error");
          }
          clearWait();
        };
    };

    const startCamera = async () => {
      try {
        setConnectionState("Requesting camera");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: FRAME_WIDTH },
            height: { ideal: FRAME_HEIGHT },
          },
          audio: false,
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          setCameraError("Video element is not available.");
          return;
        }

        video.srcObject = stream;
        await video.play();
        setConnectionState("Connected");

      } catch (error) {
        console.error("Camera error:", error);
        setCameraError(
          "Unable to access camera. Please allow camera permission."
        );
        setConnectionState("Camera Error");
      }
    };

    initWebSocket();
    setConnectionState("Connected"); // For websocket

    if (streamActive && inputMode === "Live Camera Feed") {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }

    return () => {
      mountedRef.current = false;
      clearWait();

      if (wsRef.current) {
        wsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (uploadedFileUrl) {
          URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [streamActive, inputMode]);

  return (
    <div className="app">
      <div className="dashboard">
        {isSidebarOpen && (
        <aside className="sidebar">
          <h2>Navigation</h2>
          
          <div className="settings-section">
            <span className="settings-label">Select Input Mode</span>
            <label className="radio-label">
              <input 
                type="radio" 
                name="inputMode" 
                value="Image" 
                checked={inputMode === "Image"} 
                onChange={(e) => {
                    setInputMode(e.target.value);
                    setDetections([]);
                    setUploadedFileUrl(null);
                }} 
              />
              <span className="custom-radio"></span>
              Image
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                name="inputMode" 
                value="Video" 
                checked={inputMode === "Video"} 
                onChange={(e) => {
                    setInputMode(e.target.value);
                    setDetections([]);
                    setUploadedFileUrl(null);
                }} 
              />
              <span className="custom-radio"></span>
              Video
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                name="inputMode" 
                value="Live Camera Feed" 
                checked={inputMode === "Live Camera Feed"} 
                onChange={(e) => {
                    setInputMode(e.target.value);
                    setDetections([]);
                    setUploadedFileUrl(null);
                    needResetTrackerRef.current = true;
                }} 
              />
              <span className="custom-radio"></span>
              Live Camera Feed
            </label>
          </div>

          <div className="settings-divider" />

          <h2>Inference Settings</h2>
          
          <div className="settings-section">
            <span className="settings-label">Confidence Threshold</span>
            <div className="slider-value">{confidence.toFixed(2)}</div>
            <input 
              type="range" 
              className="accent-slider"
              min="0.1" 
              max="0.9" 
              step="0.05" 
              value={confidence} 
              onChange={(e) => setConfidence(parseFloat(e.target.value))} 
            />
          </div>

          <div className="settings-section" style={{ marginTop: '10px' }}>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={clahe} 
                onChange={(e) => setClahe(e.target.checked)} 
              />
              <span className="custom-checkbox"></span>
              Apply CLAHE Preprocessing
            </label>
          </div>

          <div className="settings-divider" />

          <h2>Performance Settings</h2>
          
          <div className="settings-section">
            <span className="settings-label">Frame Skip (Higher = Slower)</span>
            <div className="slider-value">{frameSkip}</div>
            <input 
              type="range" 
              className="accent-slider"
              min="0" 
              max="10" 
              step="1" 
              value={frameSkip} 
              onChange={(e) => setFrameSkip(parseInt(e.target.value, 10))} 
            />
          </div>

          <div className="settings-section" style={{ marginTop: '10px' }}>
            <span className="settings-label">Inference Resolution</span>
            <div className="slider-value">{resolution}</div>
            <input 
              type="range" 
              className="accent-slider"
              min="320" 
              max="1280" 
              step="320" 
              value={resolution} 
              onChange={(e) => setResolution(parseInt(e.target.value, 10))} 
            />
          </div>
        </aside>
        )}

        <main className="main-content">
          <div className="main-header" style={{ position: 'relative', display: 'flex' }}>
            <button 
              className="sidebar-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Toggle Sidebar"
              style={{
                background: 'transparent', border: 'none', 
                color: isLightMode ? '#1e293b' : '#fafafa', 
                fontSize: '1.8rem', cursor: 'pointer', 
                marginRight: '20px', padding: 0,
                display: 'flex', alignItems: 'flex-start',
                marginTop: '4px'
              }}
            >
              ☰
            </button>
            <div style={{ flex: 1, position: 'relative' }}>
            <button 
              className="theme-toggle-btn"
              onClick={() => setIsLightMode(!isLightMode)}
              title="Toggle Theme"
            >
              {isLightMode ? '🌙 Dark' : '☀️ Light'}
            </button>
            <h1 className="title">
              🌱 <span className="gradient-text">AI Crop Maturity Detection System</span>
            </h1>
            
            <div className="subtitle-container">
              <span className="subtitle-icon">📹</span>
              <h2 className="subtitle">
                {inputMode === "Live Camera Feed" ? "Real-Time Continuous Camera Stream" : `${inputMode} Processing`}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '380px', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                {inputMode === "Live Camera Feed" && (
                  <label className="checkbox-label" style={{ marginBottom: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={streamActive}
                      onChange={(e) => setStreamActive(e.target.checked)} 
                    />
                    <span className="custom-checkbox"></span>
                    Start Camera Stream
                  </label>
                )}

                {(inputMode === "Image" || inputMode === "Video") && (
                  <input 
                    type="file" 
                    accept={inputMode === "Image" ? "image/*" : "video/*"} 
                    onChange={handleFileUpload} 
                    style={{ color: '#fafafa' }}
                  />
                )}
              </div>
              
              <div className="status-indicator">
                <span className={`status-dot ${connectionState === 'Connected' ? 'connected' : ''}`}></span>
                <span className="status-text">{connectionState}</span>
              </div>
            </div>

            {cameraError && (
              <div className="camera-error">
                {cameraError}
              </div>
            )}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={FRAME_WIDTH}
            height={FRAME_HEIGHT}
            className="capture-canvas"
          />

          <div className="content-workspace">
            {((inputMode === "Live Camera Feed") || uploadedFileUrl) ? (
              <VideoCanvas
                detections={detections}
                videoRef={videoRef}
                imageRef={imageRef}
                src={uploadedFileUrl}
                mode={inputMode}
                onImageLoad={inputMode === "Image" ? captureAndSendOnce : undefined}
              />
            ) : (
                <div className="video-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#555' }}>Please select a file to process.</span>
                </div>
            )}
            <AnalysisPanel detections={detections} isLightMode={isLightMode} isSidebarOpen={isSidebarOpen} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

