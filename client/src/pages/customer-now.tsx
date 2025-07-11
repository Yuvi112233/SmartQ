import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, ArrowRight, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QueueEntry } from "@shared/schema";

export default function CustomerNow() {
  const [, navigate] = useLocation();
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const customerPhone = localStorage.getItem("customerPhone");
  const { toast } = useToast();

  useEffect(() => {
    if (!customerPhone) {
      navigate("/customer");
    }
  }, [customerPhone, navigate]);

  const { data: customerInfo, isLoading } = useQuery({
    queryKey: ["/api/queue/customer", customerPhone],
    enabled: !!customerPhone,
    refetchInterval: 5000,
    retry: false,
  });

  const { data: queue = [] } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 5000,
  });

  const confirmReachedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/customer/reached/${customerPhone}`);
    },
    onSuccess: () => {
      setHasConfirmed(true);
      toast({
        title: "Confirmed!",
        description: "Thank you for confirming your arrival. Please wait inside.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Check if customer status is not "called" anymore
    if (customerInfo && customerInfo.status !== "called") {
      navigate("/customer/queue");
    }
  }, [customerInfo, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!customerInfo || customerInfo.status !== "called") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="text-blue-500 mb-4">
              <Clock className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Not Your Turn Yet</h2>
            <p className="text-gray-600 mb-4">Please wait for your turn in the queue.</p>
            <Button onClick={() => navigate("/customer/queue")}>
              Back to Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasConfirmed || customerInfo.status === "reached") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="text-green-500 mb-6">
              <CheckCircle className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your arrival has been confirmed. Please wait inside for service.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                The staff will attend to you shortly. Thank you for using SmartQ!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4 animate-pulse">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">It's Your Turn!</h1>
          <p className="text-lg text-gray-600">Please head to the shop</p>
        </div>

        {/* Main Card */}
        <Card className="bg-white rounded-2xl shadow-xl mb-6">
          <CardHeader className="text-center bg-green-500 text-white rounded-t-2xl">
            <CardTitle className="text-2xl">🎉 You're Next!</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <ArrowRight className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Hello {customerInfo.name}!
              </h2>
              <p className="text-gray-600">
                The staff is ready to serve you. Please proceed to the service area.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Your phone</span>
                <span className="text-sm font-medium text-gray-900">{customerInfo.phone}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Queue position</span>
                <span className="text-sm font-bold text-green-600">#1</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Status</span>
                <span className="text-sm font-medium text-green-600">
                  {customerInfo.status === "called" ? "Called" : "Ready"}
                </span>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-green-800 text-center">
                📍 Please head to the shop and confirm your arrival below
              </p>
            </div>

            <Button
              onClick={() => confirmReachedMutation.mutate()}
              disabled={confirmReachedMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg"
            >
              {confirmReachedMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  I Have Reached
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardContent className="p-6">
            <div className="text-center">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Steps</h3>
              <p className="text-sm text-gray-600 mb-4">
                After confirming your arrival, please wait inside for the staff to attend to you.
              </p>
              <div className="text-xs text-gray-500">
                This page will automatically update when you confirm your arrival
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}