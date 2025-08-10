// // src/pages/Login.js
// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';

// const Login = () => {
//   const navigate = useNavigate();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setError('');
//     try {
//       const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
//       const { token, role } = res.data;
//       localStorage.setItem('token', token);
	  
//       // Route based on the user's role
//       if (role === 'user' || role === 'citizen') {
//         navigate('/report');
//       } else if (role === 'SI' || role === 'CSI' || role === 'DSI') {
//         navigate('/si-dashboard');
//       } else if (role === 'muqaadam') {
//         navigate('/muqaddam-dashboard');
//       } else if (role === 'worker') {
//         navigate('/worker-dashboard');
//       } else {
//         navigate('/');
//       }
//     } catch (err) {
//       setError(err.response?.data?.message || 'Login failed');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center p-6">
//       <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
//         <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h1>
//         {error && <div className="mb-4 text-center text-red-600 font-medium">{error}</div>}
//         <form onSubmit={handleLogin} className="space-y-4">
//           <div>
//             <label htmlFor="email" className="block text-gray-700 mb-1">Email</label>
//             <input
//               id="email"
//               type="email"
//               placeholder="you@example.com"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label htmlFor="password" className="block text-gray-700 mb-1">Password</label>
//             <input
//               id="password"
//               type="password"
//               placeholder="Your password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition">
//             Login
//           </button>
//         </form>
//         <p className="text-sm text-center text-gray-600 mt-6">
//           Don't have an account?{' '}
//           <Link to="/register" className="text-blue-600 hover:underline">
//             Register here
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Login;
// src/pages/Login.js
// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';

// const Login = () => {
//   const navigate = useNavigate();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');

//   const handleLogin = async (e) => {
// 	e.preventDefault();
// 	setError('');
// 	try {
// 	  const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
// 	  const { token, role } = res.data;
// 	  localStorage.setItem('token', token);
	  
// 	  // Normalize role to lowercase for consistent checking.
// 	  const normalizedRole = role.toLowerCase();
	  
	  
	  
// 	  if (normalizedRole === 'user' || normalizedRole === 'citizen') {
// 		navigate('/report');
// 	  } else if (['si', 'csi', 'dsi'].includes(normalizedRole)) {
// 		navigate('/si-dashboard');
// 	  } else if (normalizedRole === 'muqaddam') {
// 		navigate('/muqaddam-dashboard');
// 	  } else if (normalizedRole === 'worker') {
// 		navigate('/worker-dashboard');
// 	  } else {
// 		navigate('/');
// 	  }
// 	} catch (err) {
// 	  setError(err.response?.data?.message || 'Login failed');
// 	}
//   };

//   return (
// 	<div className="min-h-screen bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center p-6">
// 	  <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
// 		<h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h1>
// 		{error && <div className="mb-4 text-center text-red-600 font-medium">{error}</div>}
// 		<form onSubmit={handleLogin} className="space-y-4">
// 		  <div>
// 			<label htmlFor="email" className="block text-gray-700 mb-1">Email</label>
// 			<input
// 			  id="email"
// 			  type="email"
// 			  placeholder="you@example.com"
// 			  value={email}
// 			  onChange={(e) => setEmail(e.target.value)}
// 			  required
// 			  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
// 			/>
// 		  </div>
// 		  <div>
// 			<label htmlFor="password" className="block text-gray-700 mb-1">Password</label>
// 			<input
// 			  id="password"
// 			  type="password"
// 			  placeholder="Your password"
// 			  value={password}
// 			  onChange={(e) => setPassword(e.target.value)}
// 			  required
// 			  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
// 			/>
// 		  </div>
// 		  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition">
// 			Login
// 		  </button>
// 		</form>
// 		<p className="text-sm text-center text-gray-600 mt-6">
// 		  Don't have an account?{' '}
// 		  <Link to="/register" className="text-blue-600 hover:underline">Register here</Link>
// 		</p>
// 	  </div>
// 	</div>
//   );
// };


// export default Login;
// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { token, role, user } = res.data; // Expect the backend to return the "user" object as well.
      localStorage.setItem('token', token);
      
      // Normalize role to lowercase for consistent checking.
      const normalizedRole = role.toLowerCase();

      if (normalizedRole === 'user' || normalizedRole === 'citizen') {
        navigate('/report');
      } else if (['si', 'csi', 'dsi'].includes(normalizedRole)) {
        // For SI, store additional data (ward and identifier) in localStorage.
        if (user) {
          localStorage.setItem('siWard', user.ward);
          localStorage.setItem('siIdentifier', user.identifier);
        }
        navigate('/si-dashboard');
      } else if (normalizedRole === 'muqaddam') {
        navigate('/muqaddam-dashboard');
      } else if (normalizedRole === 'worker') {
        navigate('/worker-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-white to-orange-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h1>
        {error && <div className="mb-4 text-center text-red-600 font-medium">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition">
            Login
          </button>
        </form>
        <p className="text-sm text-center text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
