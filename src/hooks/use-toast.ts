'use client';

interface ToastProps {
  variant?: 'default' | 'destructive';
  title?: string;
  description?: string;
}

export const useToast = () => {
  const toast = (props: ToastProps) => {
    console.log(props);
  };
  
  return { toast };
};