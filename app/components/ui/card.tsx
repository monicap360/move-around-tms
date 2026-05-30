import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = "", style }) => {
  return <div className={`card-professional ${className}`} style={style}>{children}</div>;
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = "",
  style,
}) => {
  return (
    <div className={`card-header-professional ${className}`} style={style}>{children}</div>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = "",
  style,
}) => {
  return <h3 className={`card-title-professional ${className}`} style={style}>{children}</h3>;
};

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = "",
  style,
}) => {
  return (
    <div className={`card-content-professional ${className}`} style={style}>{children}</div>
  );
};
