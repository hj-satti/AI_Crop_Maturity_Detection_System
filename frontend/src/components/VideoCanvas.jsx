import DetectionOverlay from "./DetectionOverlay";

function VideoCanvas({ detections, videoRef, imageRef, src, mode, onImageLoad }) {
  return (
    <div className="video-container">
      {mode === "Image" ? (
        <img
          ref={imageRef}
          src={src}
          className="camera-video"
          alt="Uploaded"
          onLoad={onImageLoad}
        />
      ) : (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          playsInline
          muted
          className="camera-video"
        />
      )}

      {detections.length > 0 && (
        <div className="overlay-layer">
          {detections.map((detection, index) => (
            <DetectionOverlay
              key={`${detection.object_id}-${index}`}
              detection={detection}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoCanvas;
