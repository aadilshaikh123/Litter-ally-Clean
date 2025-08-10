import { useState } from "react";
import ImageUploader from "./ImageUploader";

const PostForm = () => {
    const [image, setImage] = useState(null);
    const [location, setLocation] = useState("");
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(""); 
    const [preview, setPreview] = useState(null);

    const fetchCurrentLocation = () => {
        setError(""); 
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLatitude(latitude);
                    setLongitude(longitude);

                    try {
                        // Fetch real address using OpenStreetMap API
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                        );
                        const data = await response.json();
                        
                        if (data.display_name) {
                            setLocation(data.display_name); // Set real address
                        } else {
                            setError("Could not fetch address. Please try again.");
                        }
                    } catch (err) {
                        setError("Error fetching address: " + err.message);
                    }
                },
                (error) => {
                    setError("Failed to get current location: " + error.message);
                }
            );
        } else {
            setError("Geolocation is not supported by this browser.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); 

        if (!image || !location || latitude === null || longitude === null) {
            setError("Please upload an image and fetch location before submitting.");
            return;
        }

        const formData = new FormData();
        formData.append("image", image);
        formData.append("location", location);
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("description", description);

        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/images/upload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                alert("Post submitted successfully!");
                setImage(null);
                setLocation("");
                setLatitude(null);
                setLongitude(null);
                setDescription("");
                setPreview(null);
            } else {
                setError(data.message || "Failed to submit post.");
            }
        } catch (err) {
            setError("Error submitting post. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUploaded = (img, previewUrl) => {
        setImage(img);
        setPreview(previewUrl);
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">Report Garbage</h2>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <form onSubmit={handleSubmit}>
                <ImageUploader onImageUpload={handleImageUploaded} initialPreview={preview} />

                <div className="mb-4">
                    <label className="block mb-2 font-semibold">Location:</label>
                    <input
                        type="text"
                        value={location}
                        readOnly
                        className="w-full border p-2 rounded mb-2"
                    />
                    <button
                        type="button"
                        className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                        onClick={fetchCurrentLocation}
                    >
                        Use Current Location
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block mb-2 font-semibold">Latitude:</label>
                    <input
                        type="text"
                        value={latitude || ""}
                        readOnly
                        className="w-full border p-2 rounded mb-2"
                    />
                </div>

                <div className="mb-4">
                    <label className="block mb-2 font-semibold">Longitude:</label>
                    <input
                        type="text"
                        value={longitude || ""}
                        readOnly
                        className="w-full border p-2 rounded mb-2"
                    />
                </div>

                <textarea
                    className="w-full p-2 border rounded mt-3"
                    placeholder="Add an optional description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <button
                    type="submit"
                    className={`w-full mt-4 py-2 rounded text-white ${
                        loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
                    }`}
                    disabled={loading}
                >
                    {loading ? "Submitting..." : "Submit"}
                </button>
            </form>
        </div>
    );
};

export default PostForm;
