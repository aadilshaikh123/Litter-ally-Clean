import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const LandingPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 via-white to-green-500 p-6">
            {/* Animated Card Container */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl text-center border border-gray-200"
            >
                {/* Title */}
                <h1 className="text-5xl font-extrabold text-blue-800 drop-shadow-md mb-4">
                    🏛 Public Service Portal
                </h1>
                {/* Subtitle */}
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                    Join our initiative to keep our communities clean and green. Report garbage issues directly to your local municipal ward supervisors and contribute to a cleaner, safer environment for all.
                </p>

                {/* Buttons */}
                <div className="flex justify-center gap-6">
                    <Link
                        to="/login"
                        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md transition-all duration-300 transform hover:scale-105 hover:bg-blue-700"
                    >
                        Login
                    </Link>
                    <Link
                        to="/register"
                        className="px-8 py-3 bg-green-600 text-white font-semibold rounded-full shadow-md transition-all duration-300 transform hover:scale-105 hover:bg-green-700"
                    >
                        Citizen
                    </Link>
                    <Link
                        to="/register2"
                        className="px-8 py-3 bg-green-600 text-white font-semibold rounded-full shadow-md transition-all duration-300 transform hover:scale-105 hover:bg-green-700"
                    >
                        Gov Employee
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

// export default LandingPage;