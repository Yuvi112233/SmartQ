import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { QueueEntry } from "@shared/schema";

export default function CustomerQueue() {
  const [, navigate] = useLocation();
  const customerPhone = localStorage.getItem("customerPhone");

  useEffect(() => {
    if (!customerPhone) {
      navigate("/customer");
    }
  }, [customerPhone, navigate]);

  const { data: queue = [], isLoading } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 5000,
  });

  const { data: customerInfo } = useQuery({
    queryKey: ["/api/queue/customer", customerPhone],
    enabled: !!customerPhone,
    refetchInterval: 5000,
    retry: false,
  });

  useEffect(() => {
    // Check if customer is first in queue and redirect to "now" page
    if (customerInfo && customerInfo.position === 1 && customerInfo.status === "waiting") {
      navigate("/customer/now");
    }
  }, [customerInfo, navigate]);

  const maskPhone = (phone: string) => {
    return phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2");
  };

  const getEstimatedWaitTime = (position: number) => {
    return Math.max((position - 1) * 5, 0);
  };

  const waitingQueue = queue.filter(entry => entry.status === "waiting");
  const totalInQueue = waitingQueue.length;
  const currentPosition = customerInfo?.position || 0;
  const estimatedWait = getEstimatedWaitTime(currentPosition);
  const progressPercentage = totalInQueue > 0 ? ((totalInQueue - currentPosition + 1) / totalInQueue) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customerInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Users className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Not Found</h2>
            <p className="text-gray-600 mb-4">You are not in the queue.</p>
            <Button onClick={() => navigate("/customer")}>
              Join Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're in Queue!</h1>
          <p className="text-gray-600">Please wait for your turn</p>
        </div>

        {/* Status Card */}
        <Card className="bg-white rounded-2xl shadow-xl mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">Your Position</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-primary mb-2">
                {currentPosition}
              </div>
              <p className="text-gray-600">
                {currentPosition === 1 ? "You're next!" : `people ahead of you`}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Estimated wait time</span>
                <span className="text-lg font-bold text-gray-900">{estimatedWait} min</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total in queue</span>
                <span className="text-lg font-bold text-gray-900">{totalInQueue}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Queue Progress</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue List */}
        <Card className="bg-white rounded-2xl shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Queue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {waitingQueue.slice(0, 5).map((customer, index) => (
                <div
                  key={customer.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    customer.phone === customerPhone
                      ? "bg-primary bg-opacity-10 border-2 border-primary"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      customer.phone === customerPhone
                        ? "bg-primary text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}>
                      <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {customer.phone === customerPhone ? "You" : customer.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {customer.phone === customerPhone ? customer.phone : maskPhone(customer.phone)}
                      </p>
                    </div>
                  </div>
                  {customer.phone === customerPhone && (
                    <Badge className="bg-primary text-white">
                      You
                    </Badge>
                  )}
                </div>
              ))}
              {waitingQueue.length > 5 && (
                <p className="text-center text-sm text-gray-500 py-2">
                  +{waitingQueue.length - 5} more customers
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={() => navigate("/customer")}
            variant="outline"
            className="w-full"
          >
            Back to Home
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              This page updates automatically every 5 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}