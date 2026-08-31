/** Current position as { lat, lng, accuracy }. Rejects with a readable message. */
export function getPosition({ timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("This device can't share its location."));
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? "Location permission denied. Enable it to file a report."
          : "Couldn't get your location. Try again outdoors.",
      )),
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
}
