
// Default ICE servers
const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let iceServersList = defaultIceServers;
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

export const webrtcServersConfig = {
  iceServers: iceServersList,
  iceCandidatePoolSize: 10,
};
