
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// const SIDashboard = () => {
//   const [complaints, setComplaints] = useState([]);
//   const [muqaddams, setMuqaddams] = useState([]);
//   const [selectedMuqaddam, setSelectedMuqaddam] = useState('');
//   const [siInstructions, setSiInstructions] = useState('');
//   const [error, setError] = useState('');
//   const [message, setMessage] = useState('');
//   const [pendingComplaints, setPendingComplaints] = useState([]);
//   const [assignedComplaints, setAssignedComplaints] = useState([]);

//   // Get SI details from localStorage
//   const siWard = localStorage.getItem('siWard');            // e.g., "57"
//   const siIdentifier = localStorage.getItem('siIdentifier');  // e.g., "SI1"

//   // Fetch SI's pending complaints
//   useEffect(() => {
//     const fetchComplaints = async () => {
//       try {
//         const res = await axios.get('http://localhost:5000/api/complaints/si', {
//           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//         });
//         setComplaints(res.data.complaints || []);
//       } catch (err) {
//         setError(err.response?.data?.message || 'Error fetching complaints');
//       }
//     };
//     fetchComplaints();
//   }, []);

//   // Fetch Muqaddams for the SI based on ward and siIdentifier
//   useEffect(() => {
//     const fetchMuqaddams = async () => {
//       try {
//         if (!siWard || !siIdentifier) return;
//         const res = await axios.get(`http://localhost:5000/api/govEmployees/muqaddams?ward=${siWard}&siIdentifier=${siIdentifier}`, {
//           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//         });
//         setMuqaddams(res.data.muqaddams || []);
//       } catch (err) {
//         setError(err.response?.data?.message || 'Error fetching muqaddams');
//       }
//     };
//     fetchMuqaddams();
//   }, [siWard, siIdentifier]);

//   const handleAssignMuqaddam = async (complaintId) => {
//     if (!selectedMuqaddam) {
//       setError("Please select a Muqaddam to assign");
//       return;
//     }
//     try {
//       const res = await axios.post(`http://localhost:5000/api/complaints/${complaintId}/assign-muqaddam`, {
//         muqaddamId: selectedMuqaddam,
//         siInstructions
//       }, {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
//       });
//       setMessage(res.data.message);
//       setComplaints(complaints.filter(c => c._id !== complaintId));
//     } catch (err) {
//       setError(err.response?.data?.message || 'Error assigning complaint');
//     }
//   };

//   return (
//     <div style={{ padding: '20px' }}>
//       <h1>SI Dashboard</h1>
//       <p><strong>Your Ward:</strong> {siWard} | <strong>Your Identifier:</strong> {siIdentifier}</p>
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//       {message && <p style={{ color: 'green' }}>{message}</p>}
//       {complaints.length === 0 ? (
//         <p>No pending complaints.</p>
//       ) : (
//         complaints.map((complaint) => (
//           <div key={complaint._id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
//             <img src={`${complaint.imageUrl}`} alt="Complaint" style={{ width: '200px', marginBottom: '10px' }} />
//             <p><strong>Prediction:</strong> {complaint.flaskData.prediction}</p>
//             <p><strong>Garbage Probability:</strong> {complaint.flaskData.garbage_probability}%</p>
//             <p><strong>Ward:</strong> {complaint.flaskData.ward_number}</p>
//             <div style={{ marginBottom: '10px' }}>
//               <label><strong>Assign to Muqaddam:</strong></label>
//               <select
//                 value={selectedMuqaddam}
//                 onChange={(e) => setSelectedMuqaddam(e.target.value)}
//                 style={{ marginLeft: '10px' }}
//               >
//                 <option value="">Select Muqaddam</option>
//                 {muqaddams.map((muq) => (
//                   <option key={muq._id} value={muq._id}>
//                     {muq.name} ({muq.identifier})
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div style={{ marginBottom: '10px' }}>
//               <input
//                 type="text"
//                 placeholder="Enter instructions (optional)"
//                 value={siInstructions}
//                 onChange={(e) => setSiInstructions(e.target.value)}
//                 style={{ padding: '5px' }}
//               />
//             </div>
//             <button onClick={() => handleAssignMuqaddam(complaint._id)}>
//               Forward Complaint to Muqaddam
//             </button>
//           </div>
//         ))
//       )}
//     </div>
//   );
// };

// export default SIDashboard;
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SIDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [forwardedComplaints, setForwardedComplaints] = useState([]);
  const [muqaddams, setMuqaddams] = useState([]);
  const [selectedMuqaddam, setSelectedMuqaddam] = useState('');
  const [siInstructions, setSiInstructions] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Get SI details from localStorage
  const siWard = localStorage.getItem('siWard');            // e.g., "57"
  const siIdentifier = localStorage.getItem('siIdentifier');  // e.g., "SI1"

  // Fetch SI's pending complaints
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/complaints/si', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setComplaints(res.data.complaints || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching complaints');
      }
    };
    fetchComplaints();
  }, []);

  // Fetch SI's forwarded complaints
  useEffect(() => {
    const fetchForwardedComplaints = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/complaints/si/forwarded', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setForwardedComplaints(res.data.forwardedComplaints || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching forwarded complaints');
      }
    };
    fetchForwardedComplaints();
  }, []);

  // Fetch Muqaddams for the SI based on ward and siIdentifier
  useEffect(() => {
    const fetchMuqaddams = async () => {
      try {
        if (!siWard || !siIdentifier) return;
        const res = await axios.get(`http://localhost:5000/api/govEmployees/muqaddams?ward=${siWard}&siIdentifier=${siIdentifier}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMuqaddams(res.data.muqaddams || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching muqaddams');
      }
    };
    fetchMuqaddams();
  }, [siWard, siIdentifier]);

  const handleAssignMuqaddam = async (complaintId) => {
    if (!selectedMuqaddam) {
      setError("Please select a Muqaddam to assign");
      return;
    }
    try {
      const res = await axios.post(`http://localhost:5000/api/complaints/${complaintId}/assign-muqaddam`, {
        muqaddamId: selectedMuqaddam,
        siInstructions
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage(res.data.message);
      setComplaints(complaints.filter(c => c._id !== complaintId));
      // Refresh forwarded complaints after forwarding
      setForwardedComplaints([...forwardedComplaints, res.data.complaint]);
    } catch (err) {
      setError(err.response?.data?.message || 'Error assigning complaint');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans text-gray-800 leading-relaxed">
      {/* <h1 className="text-3xl font-semibold mb-4 text-gray-900">SI Dashboard</h1> */}
      <h1 className="text-3xl font-bold mb-7 text-gray-900">SI Dashboard</h1>
      <p className="text-base mb-6">
        <strong className="font-semibold">Your Ward:</strong> {siWard} {' | '}
        <strong className="font-semibold">Your Identifier:</strong> {siIdentifier}
      </p>

      {/* Summary Bar */}
      <div className="flex flex-wrap gap-2 mb-8 text-sm">
        <div className="bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-3 py-1">
          <span className="font-semibold">Total Complaints:</span>{' '}
          {complaints.length + forwardedComplaints.length}
        </div>
        <div className="bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-lg px-3 py-1">
          <span className="font-semibold">Pending:</span> {complaints.length}
        </div>
        <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg px-3 py-1">
          <span className="font-semibold">Forwarded:</span> {forwardedComplaints.length}
        </div>
        <div className="bg-purple-50 text-purple-700 border border-purple-100 rounded-lg px-3 py-1">
          <span className="font-semibold">Muqaddams Available:</span> {muqaddams.length}
        </div>
      </div>



      {error && (
        <p className="bg-red-100 text-red-700 font-semibold p-3 rounded mb-6 border border-red-300">
          {error}
        </p>
      )}

      {message && (
        <p className="bg-green-100 text-green-700 font-semibold p-3 rounded mb-6 border border-green-300">
          {message}
        </p>
      )}

      {/* Pending Complaints Section */}
      <h2 className="text-2xl font-semibold border-b-4 border-blue-600 pb-2 mb-6 text-blue-600">
        Pending Complaints
      </h2>

      {complaints.length === 0 ? (
        <p>No pending complaints.</p>
      ) : (
        complaints.map((complaint) => (
          <div
            key={complaint._id}
            className="flex gap-6 p-5 mb-6 bg-white rounded-lg shadow-sm border border-gray-300"
          >
            <img
              src={complaint.imageUrl}
              alt="Complaint"
              className="w-56 h-36 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1">
              <p className="mb-2 text-base">
                <span className="font-semibold text-gray-700">Prediction:</span>{' '}
                {complaint.flaskData.prediction}
              </p>
              <p className="mb-2 text-base font-semibold text-gray-800">
                Garbage Probability:{" "}
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold text-sm">
                  {complaint.flaskData.garbage_probability}%
                </span>
              </p>

              <p className="mb-4 text-base font-semibold text-gray-800">
                Ward:{" "}
                <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded font-semibold text-sm">
                  {complaint.flaskData.ward_number}
                </span>
              </p>


              <div className="mb-4">
                <label className="block font-semibold text-gray-700 mb-1">
                  Assign to Muqaddam:
                </label>
                <select
                  value={selectedMuqaddam}
                  onChange={(e) => setSelectedMuqaddam(e.target.value)}
                  className="w-full max-w-xs p-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Muqaddam</option>
                  {muqaddams.map((muq) => (
                    <option key={muq._id} value={muq._id}>
                      {muq.name} ({muq.identifier})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Enter instructions (optional)"
                  value={siInstructions}
                  onChange={(e) => setSiInstructions(e.target.value)}
                  className="w-full max-w-md p-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => handleAssignMuqaddam(complaint._id)}
                className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-300"
              >
                Forward Complaint to Muqaddam
              </button>
            </div>
          </div>
        ))
      )}

      {/* Forwarded Complaints Section */}
      <h2 className="text-2xl font-semibold border-b-4 border-blue-600 pb-2 mb-6 text-blue-600">
        Forwarded Complaints
      </h2>

      {forwardedComplaints.length === 0 ? (
        <p>No forwarded complaints.</p>
      ) : (
        forwardedComplaints.map((complaint) => (
          <div
            key={complaint._id}
            className="flex gap-6 p-5 mb-6 bg-blue-50 rounded-lg shadow-sm border border-blue-400"
          >
            <img
              src={complaint.imageUrl}
              alt="Complaint"
              className="w-56 h-36 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1">
              <p className="mb-2 text-base">
                <span className="font-semibold text-gray-700">Prediction:</span>{' '}
                {complaint.flaskData.prediction}
              </p>
              <p className="mb-2 text-base">
                <span className="font-semibold text-gray-700">Garbage Probability:</span>{' '}
                {complaint.flaskData.garbage_probability}%
              </p>
              <p className="mb-2 text-base">
                <span className="font-semibold text-gray-700">Ward:</span>{' '}
                {complaint.flaskData.ward_number}
              </p>
              <p className="text-base">
                <span className="font-semibold text-gray-700">Status:</span>{' '}
                {complaint.status}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SIDashboard;
