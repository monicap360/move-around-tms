import React from "react";

type CardProps = {
  children: React.ReactNode;
  onClick?: () => void;
};

export function Card({ children, onClick }: CardProps) {
  return (
    <div className="rounded-lg shadow" onClick={onClick}>
      {children}
    </div>
  );
}
