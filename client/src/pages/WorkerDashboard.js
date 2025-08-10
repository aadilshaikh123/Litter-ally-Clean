import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WorkerDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/worker/tasks', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setTasks(res.data.tasks || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching tasks');
      }
    };

    fetchTasks();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedTask || !file) {
      setError("Please select a task and a file to upload.");
      return;
    }
    setError('');
    try {
      const formData = new FormData();
      formData.append("postCleaningImage", file);
      
      const res = await axios.post(`http://localhost:5000/api/complaints/${selectedTask}/complete`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          "Content-Type": "multipart/form-data"
        }
      });
      
      setMessage(res.data.message);
      // Remove the task that has been completed from the list
      setTasks(tasks.filter(task => task._id !== selectedTask));
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading image');
    }
  };

  return (
    <div>
      <h1>Worker Dashboard</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {tasks.length === 0 ? (
        <p>No tasks assigned.</p>
      ) : (
        <div>
          <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}>
            <option value="">Select a task</option>
            {tasks.map(task => (
              <option key={task._id} value={task._id}>
                {task.flaskData.prediction} - {task.status}
              </option>
            ))}
          </select>
          <br/>
          <input type="file" onChange={handleFileChange} />
          <br/>
          <button onClick={handleUpload}>Upload Post-Cleaning Image</button>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
