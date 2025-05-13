
// Default ICE servers
const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let iceServersList = [...defaultIceServers];

// Parse custom ICE servers if provided
const iceServerConfigString = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;
if (iceServerConfigString) {
  try {
    const parsedIceServers = JSON.parse(iceServerConfigString);
    if (Array.isArray(parsedIceServers) && parsedIceServers.length > 0) {
      iceServersList = parsedIceServers;
      console.log("Using custom ICE servers:", iceServersList);
    } else {
      console.warn("NEXT_PUBLIC_WEBRTC_ICE_SERVERS is not a valid array or is empty. Using default STUN servers.");
    }
  } catch (e) {
    console.error("Failed to parse NEXT_PUBLIC_WEBRTC_ICE_SERVERS. Using default STUN servers. Error:", e);
  }
}

// Parse TURN servers and merge with existing ICE servers
const turnServerConfigString = process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVERS;
if (turnServerConfigString) {
  try {
    const parsedTurnServers = JSON.parse(turnServerConfigString);
    if (Array.isArray(parsedTurnServers) && parsedTurnServers.length > 0) {
      // If we're using custom ICE servers, add TURN servers to them
      // If we're using default STUN servers, add TURN servers to those
      iceServersList = [...iceServersList, ...parsedTurnServers];
      console.log("Added TURN servers to ICE configuration:", parsedTurnServers);
    } else {
      console.warn("NEXT_PUBLIC_WEBRTC_TURN_SERVERS is not a valid array or is empty. No TURN servers added.");
    }
  } catch (e) {
    console.error("Failed to parse NEXT_PUBLIC_WEBRTC_TURN_SERVERS. No TURN servers added. Error:", e);
  }
}

export const webrtcServersConfig = {
  iceServers: iceServersList,
  iceCandidatePoolSize: 10,
};

// Log the final ICE server configuration
console.log("Final WebRTC ICE server configuration:", iceServersList);
