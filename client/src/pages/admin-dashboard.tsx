import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Clock, Phone, LogOut, Wifi, WifiOff, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QueueEntry } from "@shared/schema";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);

  // Check if admin is authenticated
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  // Socket.IO connection
  useEffect(() => {
    const socket = io();
    
    socket.on('qr', (qrCodeData: string) => {
      setQrCode(qrCodeData);
      setShowQRModal(true);
      setIsWhatsAppConnected(false);
    });
    
    socket.on('connected', () => {
      setIsWhatsAppConnected(true);
      setQrCode(null);
      setShowQRModal(false);
      toast({
        title: "WhatsApp Connected",
        description: "WhatsApp is now connected and ready to send messages",
      });
    });
    
    socket.on('disconnected', () => {
      setIsWhatsAppConnected(false);
      setQrCode(null);
      setShowQRModal(false);
      toast({
        title: "WhatsApp Disconnected",
        description: "WhatsApp connection lost",
        variant: "destructive",
      });
    });
    
    // Check initial connection status
    const checkInitialStatus = async () => {
      try {
        const response = await fetch("/api/whatsapp/status", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setIsWhatsAppConnected(data.connected);
        }
      } catch (error) {
        console.log("Failed to check initial WhatsApp status:", error);
      }
    };
    
    checkInitialStatus();
    
    return () => {
      socket.disconnect();
    };
  }, [toast]);

  const { data: queue = [], isLoading: queueLoading } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 3000,
  });

  // Remove the polling query since we're using Socket.IO for real-time updates
  // const { data: whatsappStatus } = useQuery({
  //   queryKey: ["/api/whatsapp/status"],
  //   refetchInterval: 10000,
  //   retry: false,
  // });

  const callNextMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/queue/call-next", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Customer Called",
        description: `${data.customer.name} has been called for service`,
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

  const removeFromQueueMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/queue/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Customer Removed",
        description: "Customer has been removed from the queue",
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

  const reconnectWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/whatsapp/login", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "WhatsApp Reconnecting",
        description: "WhatsApp connection is being reestablished...",
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
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login");
  };

  const formatTimeAdded = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(timestamp).getTime()) / 60000);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    return `${diffInMinutes} minutes ago`;
  };

  const waitingQueue = queue.filter(entry => entry.status === "waiting");
  const calledQueue = queue.filter(entry => entry.status === "called");
  const reachedQueue = queue.filter(entry => entry.status === "reached");

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-white">SmartQ Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isWhatsAppConnected ? (
                  <div className="flex items-center space-x-2 text-green-400">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm">WhatsApp Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-400">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm">WhatsApp Disconnected</span>
                    <Button
                      onClick={() => reconnectWhatsAppMutation.mutate()}
                      disabled={reconnectWhatsAppMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      {reconnectWhatsAppMutation.isPending ? "Reconnecting..." : "Reconnect"}
                    </Button>
                  </div>
                )}
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total in Queue</p>
                  <p className="text-2xl font-bold text-white">{queue.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Waiting</p>
                  <p className="text-2xl font-bold text-yellow-400">{waitingQueue.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Called</p>
                  <p className="text-2xl font-bold text-blue-400">{calledQueue.length}</p>
                </div>
                <Phone className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Reached</p>
                  <p className="text-2xl font-bold text-green-400">{reachedQueue.length}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Controls */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Queue Management</h2>
          <Button
            onClick={() => callNextMutation.mutate()}
            disabled={callNextMutation.isPending || waitingQueue.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Next Customer
          </Button>
        </div>

        {/* Queue List */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Current Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading queue...</p>
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No customers in queue</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        customer.status === "waiting" ? "bg-yellow-500" :
                        customer.status === "called" ? "bg-blue-500" :
                        "bg-green-500"
                      }`}>
                        <span className="text-white font-bold text-sm">
                          {customer.status === "waiting" ? index + 1 : "✓"}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{customer.name}</h4>
                        <p className="text-slate-400">{customer.phone}</p>
                        <p className="text-sm text-slate-500">
                          Added {formatTimeAdded(customer.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={
                          customer.status === "waiting" ? "secondary" :
                          customer.status === "called" ? "default" :
                          "outline"
                        }
                        className={
                          customer.status === "waiting" ? "bg-yellow-100 text-yellow-800" :
                          customer.status === "called" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        }
                      >
                        {customer.status === "waiting" ? "Waiting" :
                         customer.status === "called" ? "Called" :
                         "Reached"}
                      </Badge>
                      <Button
                        onClick={() => removeFromQueueMutation.mutate(customer.id)}
                        disabled={removeFromQueueMutation.isPending}
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Connect WhatsApp</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with your WhatsApp app to connect
            </p>
            {qrCode && (
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrCode} size={256} />
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Make sure you have WhatsApp installed on your phone
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}