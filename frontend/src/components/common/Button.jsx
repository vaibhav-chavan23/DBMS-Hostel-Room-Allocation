import React from 'react';

const Button = ({ children, onClick, disabled, variant = 'primary', type = 'button' }) => {
  let baseClasses = "px-4 py-2 rounded text-sm font-medium focus:outline-none transition-colors";
  let variantClasses = "";

  if (disabled) {
    variantClasses = "bg-gray-200 text-gray-400 cursor-not-allowed";
  } else {
    if (variant === 'primary') {
      variantClasses = "bg-blue-600 hover:bg-blue-700 text-white";
    } else if (variant === 'secondary') {
      variantClasses = "bg-gray-600 hover:bg-gray-700 text-white";
    } else if (variant === 'danger') {
      variantClasses = "bg-red-600 hover:bg-red-700 text-white";
    }
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses}`}
    >
      {children}
    </button>
  );
};

export default Button;
