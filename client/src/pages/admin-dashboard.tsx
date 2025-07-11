import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Clock, Phone, LogOut, Wifi, WifiOff, MessageCircle, X, RefreshCw, QrCode } from "lucide-react";
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
  const [whatsAppStatus, setWhatsAppStatus] = useState<{
    connected: boolean;
    sessionExists: boolean;
    qrCode: string | null;
  }>({ connected: false, sessionExists: false, qrCode: null });

  // Add a utility to detect mobile
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const [qrCopied, setQrCopied] = useState(false);

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
          setWhatsAppStatus(data);
          
          // If QR code is available, show it
          if (data.qrCode && !data.connected) {
            setQrCode(data.qrCode);
            setShowQRModal(true);
          }
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
    mutationFn: async (clearSession: boolean = false) => {
      console.log("Reconnect mutation started with clearSession:", clearSession);
      const token = localStorage.getItem("adminToken");
      console.log("Token exists:", !!token);
      
      const response = await fetch("/api/whatsapp/login", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ clearSession }),
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Error response:", error);
        throw new Error(error.message);
      }
      
      const data = await response.json();
      console.log("Success response:", data);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "WhatsApp Reconnecting",
        description: data.message || "WhatsApp connection is being reestablished...",
      });
      
      // Update status immediately
      if (data.status) {
        setWhatsAppStatus(data.status);
        setIsWhatsAppConnected(data.status.connected);
        
        // Show QR modal if needed
        if (data.status.qrCode && !data.status.connected) {
          setQrCode(data.status.qrCode);
          setShowQRModal(true);
        }
      }
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

  // Block dashboard with a full-screen modal if WhatsApp is not connected
  if (!isWhatsAppConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="max-w-md w-full p-6 bg-slate-800 rounded-lg shadow-lg flex flex-col items-center">
          <MessageCircle className="h-8 w-8 mb-2 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Connect WhatsApp</h2>
          <p className="text-sm text-slate-400 mb-4 text-center">
            {isMobile
              ? "You are on a mobile device. Scan this QR code using WhatsApp on another device, or tap the button below to copy the QR data."
              : "Scan this QR code with your WhatsApp app to connect."}
          </p>
          {qrCode ? (
            <div className="p-4 bg-white rounded-lg mb-4">
              <QRCodeSVG value={qrCode} size={isMobile ? 180 : 256} />
            </div>
          ) : (
            <div className="text-slate-400 mb-4">Waiting for QR code...</div>
          )}
          {isMobile && qrCode && (
            <>
              <Button
                className="mb-2 w-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(qrCode);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                }}
              >
                {qrCopied ? "Copied!" : "Copy QR Data"}
              </Button>
              <p className="text-xs text-slate-400 text-center mb-2">
                Open WhatsApp, tap the three dots → Linked Devices → Link a Device, and paste the copied QR if needed.
              </p>
            </>
          )}
          <p className="text-xs text-slate-500 text-center">
            Make sure you have WhatsApp installed on your phone. If you have trouble, try reconnecting or generating a new QR from another device.
          </p>
        </div>
      </div>
    );
  }

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
                    <span className="text-sm">
                      {whatsAppStatus.sessionExists ? "WhatsApp Session Lost" : "WhatsApp Not Connected"}
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          console.log("Reconnect button clicked");
                          reconnectWhatsAppMutation.mutate(false);
                        }}
                        disabled={reconnectWhatsAppMutation.isPending}
                        size="sm"
                        variant="outline"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {reconnectWhatsAppMutation.isPending ? "Reconnecting..." : "Reconnect"}
                      </Button>
                      {whatsAppStatus.sessionExists && (
                        <Button
                          onClick={() => reconnectWhatsAppMutation.mutate(true)}
                          disabled={reconnectWhatsAppMutation.isPending}
                          size="sm"
                          variant="outline"
                        >
                          <QrCode className="h-3 w-3 mr-1" />
                          New QR
                        </Button>
                      )}
                    </div>
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