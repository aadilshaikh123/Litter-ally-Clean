import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Register2 from "./pages/Register2";
import { ReportPage } from "./pages/ReportPage";
import MyImages from "./pages/MyImages";
import SIDashboard from "./pages/SIDashboard";
import MuqaddamDashboard from "./pages/MuqaddamDashboard";
import Navbar from "./components/Navbar";
import WorkerDashboard from "./pages/WorkerDashboard";

const Layout = ({ children }) => {
	const location = useLocation();
	const hideNavbar = location.pathname === "/"; // Hide navbar only on landing page
	return (
		<>
			{!hideNavbar && <Navbar />}
			{children}
		</>
	);
};

function App() {
	return (
		<Router>
			<Layout>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/register2" element={<Register2 />} />
					<Route path="/report" element={<ReportPage />} />
					<Route path="/my-images" element={<MyImages />} />
					<Route path="/si-dashboard" element={<SIDashboard />} />
					<Route path="/muqaddam-dashboard" element={<MuqaddamDashboard />} />
					<Route path="/worker-dashboard" element={<WorkerDashboard />} />
				</Routes>
			</Layout>
		</Router>
	);
}

export default App;


// ----------------------

// import React from "react";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Navbar from "./components/Navbar"; // ✅ Import Navbar
// import { LandingPage } from "./pages/LandingPage";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import Register2 from "./pages/Register2";
// // import MuqaddamRegister from './pages/MuqaddamRegister';
// import { ReportPage } from "./pages/ReportPage";
// import MyImages from "./pages/MyImages";
// import SIDashboard from "./pages/SIDashboard";
// import MuqaddamDashboard from "./pages/MuqaddamDashboard";

// function App() {
// 	return (
// 		<Router>
			
// 			<Routes>
// 				<Route path="/" element={<LandingPage />} />
// 				<Route path="/login" element={<Login />} />
// 				<Route path="/register" element={<Register />} />
// 				<Route path="/register2" element={<Register2 />} />
// 				{/* <Route path="/muqaddam-register" element={<MuqaddamRegister />} /> */}
// 				<Route path="/report" element={<ReportPage />} />
// 				<Route path="/my-images" element={<MyImages />} />
// 				<Route path="/si-dashboard" element={<SIDashboard />} />
// 				<Route path="/muqaddam-dashboard" element={<MuqaddamDashboard />} />
// 			</Routes>
// 		</Router>
// 	);
// }

// export default App;
