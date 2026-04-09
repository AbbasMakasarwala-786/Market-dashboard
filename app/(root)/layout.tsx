import React from "react";
import Header from "../../components/Header";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="min-h-screen text-gray-400">
      {/* // makes the contenrt the full size of screen */}
      <Header />
      <div className="container py-10">
        {/* // container center the element and also havbe responsive width  */}
        {children}
      </div>
    </main>
  );
};

export default layout;
