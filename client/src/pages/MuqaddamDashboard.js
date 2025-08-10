  import React, { useState, useEffect } from 'react';
  import axios from 'axios';
  import ImageUploader from '../components/posts/ImageUploader';

  const MuqaddamDashboard = () => {
    const [complaints, setComplaints] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState({});

    useEffect(() => {
      const fetchComplaints = async () => {
        try {
          const res = await axios.get('http://localhost:5000/api/complaints/muqaddam', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setComplaints(res.data.complaints || []);
        } catch (err) {
          setError(err.response?.data?.message || 'Error fetching complaints');
        }
      };
      fetchComplaints();
    }, []);

    const handleSubmit = async (e, complaintId, complaintLocation, complaintLat, complaintLng, muqaddamImage, muqaddamLocation, muqaddamLat, muqaddamLng, description) => {
      e.preventDefault();
      
      if (!muqaddamImage || !muqaddamLocation || muqaddamLat === null || muqaddamLng === null) {
        setError('Please upload an image and fetch your location before submitting.');
        return;
      }

      const formData = new FormData();
      formData.append('complaintId', complaintId);
      formData.append('complaintLocation', complaintLocation);
      formData.append('complaintLatitude', complaintLat);
      formData.append('complaintLongitude', complaintLng);

      formData.append('image', muqaddamImage);
      formData.append('muqaddamLocation', muqaddamLocation);
      formData.append('muqaddamLatitude', muqaddamLat);
      formData.append('muqaddamLongitude', muqaddamLng);

      formData.append('description', description);

      setLoading(true);
      setSubmissionStatus((prev) => ({ ...prev, [complaintId]: 'Submitting...' }));

      try {
        const res = await fetch(`http://localhost:5000/api/complaints/${complaintId}/submit-cleanup`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        });
        
        // Get the response data regardless of status code
        let data;
        try {
          data = await res.json();
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          data = { message: "Server returned an invalid response" };
        }
        
        if (res.ok) {
          setMessage('Post submitted successfully!');
          setComplaints(complaints.filter(c => c._id !== complaintId));
          setSubmissionStatus((prev) => ({ ...prev, [complaintId]: 'Submitted' }));
        } else {
          // Extract specific error message from the response
          const errorMessage = data.message || 'Failed to submit post.';
          
          // Handle specific error cases
          let detailedError = errorMessage;
          
          // Add distance information if available
          if (data.distance) {
            detailedError += ` Distance from complaint location: ${Math.round(data.distance)}m.`;
          }
          
          setError(detailedError);
          setSubmissionStatus((prev) => ({ ...prev, [complaintId]: 'Failed' }));
        }
      } catch (err) {
        console.error("Network or other error:", err);
        setError('Network error. Please check your connection and try again.');
        setSubmissionStatus((prev) => ({ ...prev, [complaintId]: 'Failed' }));
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Muqaddam Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-5 py-4 rounded-md shadow-sm mb-4" role="alert">
          <strong className="font-semibold">Error:</strong>
          <span className="ml-2">{error}</span>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-5 py-4 rounded-md shadow-sm mb-4" role="alert">
          <span>{message}</span>
        </div>
      )}

      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Assigned Complaints</h2>

      {complaints.length === 0 ? (
        <p className="text-gray-500">No complaints assigned to you.</p>
      ) : (
        complaints.map((complaint) => (
          <div key={complaint._id} className="border border-gray-200 rounded-lg p-5 mb-8 shadow-md bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Section */}
              <div>
                <img src={complaint.imageUrl} alt="complaint" className="w-full rounded-lg mb-3 object-cover max-h-60" />
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="mb-2"><strong>Prediction:</strong> {complaint.flaskData.prediction}</p>
                  <p className="mb-2"><strong>Ward:</strong> {complaint.flaskData.ward_number}</p>
                  <p className="mb-2"><strong>Location:</strong> {complaint.location}</p>
                  <p><strong>Coordinates:</strong> {complaint.latitude}, {complaint.longitude}</p>
                </div>
              </div>

              {/* Right Section */}
              <div>
                <h3 className="text-xl font-medium mb-4 text-gray-700">Submit Cleanup Proof</h3>

                <ImageUploader
                  onImageUpload={(img, previewUrl) => {
                    setSubmissionStatus((prev) => ({
                      ...prev,
                      [complaint._id]: { image: img, preview: previewUrl, location: '', latitude: null, longitude: null, description: '' }
                    }));
                  }}
                  initialPreview={submissionStatus[complaint._id]?.preview}
                />

                {/* Location */}
                <div className="mb-4">
                  <label className="block font-medium mb-1 text-gray-600">Current Location</label>
                  <input type="text" value={submissionStatus[complaint._id]?.location || ''} readOnly className="w-full border border-gray-300 p-2 rounded mb-2 text-gray-700" />
                  <button
                    type="button"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-md transition-colors duration-200"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((position) => {
                          const { latitude, longitude } = position.coords;
                          setSubmissionStatus((prev) => ({
                            ...prev,
                            [complaint._id]: {
                              ...prev[complaint._id],
                              location: `Lat: ${latitude}, Lng: ${longitude}`,
                              latitude,
                              longitude
                            }
                          }));
                        }, (err) => {
                          setError(`Location error: ${err.message}`);
                        });
                      } else {
                        setError("Geolocation is not supported by this browser.");
                      }
                    }}
                  >
                    Get Current Location
                  </button>
                </div>

                {/* Description */}
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md mb-4 text-gray-700"
                  rows="3"
                  placeholder="Add a description of cleanup work completed..."
                  value={submissionStatus[complaint._id]?.description || ''}
                  onChange={(e) => setSubmissionStatus((prev) => ({
                    ...prev,
                    [complaint._id]: { ...prev[complaint._id], description: e.target.value }
                  }))}
                />

                {/* Submit Button */}
                <button
                  onClick={(e) =>
                    handleSubmit(
                      e,
                      complaint._id,
                      complaint.location,
                      complaint.latitude,
                      complaint.longitude,
                      submissionStatus[complaint._id]?.image,
                      submissionStatus[complaint._id]?.location,
                      submissionStatus[complaint._id]?.latitude,
                      submissionStatus[complaint._id]?.longitude,
                      submissionStatus[complaint._id]?.description
                    )
                  }
                  className={`w-full py-2 rounded-md text-white font-medium transition-all duration-200 ${
                    !submissionStatus[complaint._id]?.image || !submissionStatus[complaint._id]?.location
                      ? 'bg-gray-400 cursor-not-allowed'
                      : loading
                        ? 'bg-blue-400'
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={loading || !submissionStatus[complaint._id]?.image || !submissionStatus[complaint._id]?.location}
                >
                  {submissionStatus[complaint._id] === 'Submitting...'
                    ? <span>Submitting <span className="animate-pulse">...</span></span>
                    : 'Submit Cleanup Verification'}
                </button>

                {/* Error after submission */}
                {submissionStatus[complaint._id] === 'Failed' && (
                  <p className="text-red-500 text-sm mt-3">
                    Submission failed. Please check the error message above and try again.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
  };

  export default MuqaddamDashboard;
