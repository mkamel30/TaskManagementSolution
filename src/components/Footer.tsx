import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="text-center py-4 mt-8 text-gray-500 text-sm">
      <p>Analyzed and Designed by Mostafa Kamel</p>
      <p>Email: <a href="mailto:m.kamel@live.com" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">m.kamel@live.com</a></p>
    </footer>
  );
};