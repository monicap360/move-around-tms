import React from "react";

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  readOnly?: boolean;
}

export const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
  id,
  name,
  maxLength,
  min,
  max,
  step,
  readOnly,
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value?.toString()}
      onChange={onChange}
      disabled={disabled}
      required={required}
      id={id}
      name={name}
      maxLength={maxLength}
      min={min}
      max={max}
      step={step}
      readOnly={readOnly}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
};
