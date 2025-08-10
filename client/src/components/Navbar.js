import React from "react";
import { FiLogOut } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const hideTabs = ["/si-dashboard", "/muqaddam-dashboard"].includes(location.pathname);

  const handleLogout = () => {
    // Add your logout logic here (e.g., clearing tokens, redirecting)
    console.log("User logged out");
    navigate('/');
  };

  return (
    <nav style={styles.navbar}>
      <h2 style={styles.logo}>GeoClean</h2>
      <ul style={styles.navLinks}>
        {/* <li><Link to="/" style={styles.link}>Home</Link></li> */}
        {!hideTabs && (
          <>
            <li><Link to="/report" style={styles.link}>Report</Link></li>
            <li><Link to="/my-images" style={styles.link}>My Complaints</Link></li>
          </>
        )}
        {/* <li><Link to="/login" style={styles.link}>Login</Link></li>
        <li><Link to="/register" style={styles.link}>Register</Link></li> */}
        <li>
          <button onClick={handleLogout} style={styles.iconButton} title="Logout">
            <FiLogOut size={22} />
          </button>
        </li>
      </ul>
    </nav>
  );
};

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 30px",
    background: "#1a202c", // Darker, modern blue-gray
    color: "#edf2f7",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  logo: {
    margin: 0,
    fontWeight: "700",
    fontSize: "1.5rem",
    // letterSpacing: "2px",
    cursor: "default",
    userSelect: "none",
    marginLeft: "6%",
  },
  navLinks: {
    listStyle: "none",
    display: "flex",
    gap: "7px",
    margin: 0,
    padding: 0,
    marginRight: "3%",
  },
  link: {
    color: "#edf2f7",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: "500",
    padding: "8px 12px",
    borderRadius: "6px",
    transition: "background-color 0.3s ease, color 0.3s ease",
  },
  linkHover: {
    backgroundColor: "#2d3748",
    color: "#63b3ed", // subtle blue highlight on hover
  },
  iconButton: {
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    padding: "4px",
    transition: "opacity 0.3s",
  },
};

export default Navbar;

