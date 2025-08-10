// src/pages/MyImages.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyImages = () => {
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/images/my-images", {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setComplaints(res.data.complaints || []);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch complaints');
      }
    };
    fetchComplaints();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
  <div className="max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold text-blue-800 mb-8 text-center">
      My Uploaded Complaints
    </h2>

    {error && <div className="text-red-600 mb-4 text-center">{error}</div>}

    {complaints.length > 0 ? (
      <div className="grid md:grid-cols-2 gap-6">
        {complaints.map((complaint, index) => (
          <div
            key={index}
            className="bg-white shadow-md rounded-xl p-5 border hover:shadow-lg transition-shadow duration-300"
          >
            <img
              src={complaint.imageUrl}
              alt={`Complaint ${index}`}
              className="w-full h-48 object-cover rounded-md mb-4"
            />

            {/* Status Badge */}
            <div className="mb-2">
              <span className="font-semibold text-gray-700">Status:</span>{" "}
              <span
                className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                  complaint.status === "Resolved"
                    ? "bg-green-100 text-green-700"
                    : complaint.status === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {complaint.status}
              </span>
            </div>

            {/* Prediction */}
            <p className="mb-2 text-gray-800">
              <span className="font-semibold text-gray-700">Prediction:</span>{" "}
              {complaint.flaskData.prediction}
            </p>

            {/* Garbage Probability (as plain text) */}
            <p className="text-gray-800">
              <span className="font-semibold text-gray-700">Garbage Probability:</span>{" "}
              {complaint.flaskData.garbage_probability.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-gray-600 text-center">No complaints found</div>
    )}
  </div>
</div>

  );
};

export default MyImages;
