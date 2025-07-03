import React from 'react';

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["card", className].join(' ')} {...props} />;
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["card-header", className].join(' ')} {...props} />;
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={["card-title", className].join(' ')} {...props} />;
}

export function CardDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={["card-description", className].join(' ')} {...props} />;
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["card-content", className].join(' ')} {...props} />;
}

export function CardFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["card-footer", className].join(' ')} {...props} />;
} 