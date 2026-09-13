import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonExampleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function ButtonExample({ children, className = '', ...props }: ButtonExampleProps) {
  return (
    <button
      type="button"
      className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
