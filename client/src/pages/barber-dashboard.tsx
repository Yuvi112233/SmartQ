import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Users, Phone, Clock, MessageCircle, Wifi, WifiOff, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QueueEntry } from "@shared/schema";

export default function BarberDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("barberToken");
    if (!token) {
      navigate("/barber/login");
    }
  }, [navigate]);

  const { data: queue = [], isLoading: queueLoading } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 3000,
  });

  const { data: whatsappStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: 5000,
    retry: false,
  });

  const callNextMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("barberToken");
      const response = await apiRequest("POST", "/api/queue/call-next", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Customer Called",
        description: `${data.customer.name} has been called and notified via WhatsApp.`,
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

  const removeCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("barberToken");
      const response = await apiRequest("DELETE", `/api/queue/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Customer Removed",
        description: "Customer has been removed from the queue.",
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

  const handleLogout = () => {
    localStorage.removeItem("barberToken");
    navigate("/barber/login");
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 3) + "*".repeat(phone.length - 6) + phone.slice(-3);
  };

  const formatTimeAdded = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes === 0) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const isWhatsAppConnected = whatsappStatus?.connected || false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <Users className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">SmartQ</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isWhatsAppConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  WhatsApp {isWhatsAppConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* WhatsApp Status Warning */}
        {!isWhatsAppConnected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <WifiOff className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800">
                  WhatsApp is not connected. Customer notifications will not be sent.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reconnect
              </Button>
            </div>
          </div>
        )}

        {/* Queue Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total in Queue</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queue.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queue.length * 5} min</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp Status</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isWhatsAppConnected ? "Connected" : "Disconnected"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Management */}
        <div className="relative">
          <Card className={!isWhatsAppConnected ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">Queue Management</CardTitle>
                <Button
                  onClick={() => callNextMutation.mutate()}
                  disabled={callNextMutation.isPending || queue.length === 0 || !isWhatsAppConnected}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {callNextMutation.isPending ? "Calling..." : "Call Next Customer"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
            {queueLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No customers in queue</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={`p-4 border rounded-lg transition-all ${
                      index === 0 ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? "bg-green-600" : "bg-gray-400"
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{customer.name}</p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {maskPhoneNumber(customer.phone)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {index === 0 ? "Next" : `Position ${index + 1}`}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatTimeAdded(customer.timestamp)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomerMutation.mutate(customer.id)}
                          disabled={removeCustomerMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* WhatsApp Disconnected Overlay */}
        {!isWhatsAppConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
            <div className="text-center">
              <WifiOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-700 mb-2">WhatsApp Not Connected</p>
              <p className="text-sm text-gray-500 mb-4">Please connect WhatsApp to manage queue</p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Reconnect
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}