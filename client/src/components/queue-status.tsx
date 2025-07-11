import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function QueueStatus() {
  const [showStatus, setShowStatus] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  const { data: queue = [] } = useQuery({
    queryKey: ["/api/queue"],
    refetchInterval: 5000,
  });

  const { data: positionData } = useQuery({
    queryKey: ["/api/queue/position", userPhone],
    enabled: !!userPhone,
    refetchInterval: 5000,
  });

  useEffect(() => {
    // Listen for form submissions to show status
    const handleFormSubmit = (event: CustomEvent) => {
      setUserPhone(event.detail.phone);
      setShowStatus(true);
    };

    window.addEventListener('queueJoined', handleFormSubmit as EventListener);
    return () => window.removeEventListener('queueJoined', handleFormSubmit as EventListener);
  }, []);

  if (!showStatus) return null;

  const position = positionData?.position || 0;
  const estimatedWait = Math.max(position * 5, 0);

  return (
    <Card className="bg-white rounded-2xl shadow-xl mt-6">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Added to Queue!</h3>
          <p className="text-gray-600 mb-4">You've been added to the queue. Please wait for your turn.</p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Your Position</span>
              <span className="text-lg font-bold text-primary">{position}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Estimated Wait</span>
              <span className="text-sm font-medium text-gray-900">{estimatedWait} minutes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
