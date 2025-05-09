import { Loader2 } from 'lucide-react';
import type React from 'react';

const LoadingPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center bg-[#f8fafc]/80 backdrop-blur-sm h-full">
      <Loader2 className="animate-spin" />
    </div>
  );
};

export default LoadingPage;
