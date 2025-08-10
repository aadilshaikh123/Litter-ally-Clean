import React, { useState } from "react";
import PostForm from "../components/posts/PostForm";

export const ReportPage = () => {
  const [postData, setPostData] = useState(null);

  const handlePostSubmit = (newPost) => {
    console.log("New Post Submitted:", newPost);
    setPostData(newPost);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200  shadow-sm rounded-xl p-8">
        <h1 className="text-center text-4xl font-bold text-gray-800 mb-6 tracking-tight">
          Garbage Reporting System
        </h1>

        <PostForm onSubmit={handlePostSubmit} />

        {postData && (
          <div className="mt-10 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              📝 Submitted Report
            </h2>

            <div className="space-y-4 text-gray-600">
              <p>
                <span className="font-medium text-gray-900">📍 Location:</span>{" "}
                {postData.location}
              </p>
              <p>
                <span className="font-medium text-gray-900">🗒 Description:</span>{" "}
                {postData.description}
              </p>
              {postData.image && (
                <img
                  src={postData.image}
                  alt="Reported Garbage"
                  className="mt-4 rounded-lg border border-gray-300 w-full max-w-md"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// export default ReportPage;
