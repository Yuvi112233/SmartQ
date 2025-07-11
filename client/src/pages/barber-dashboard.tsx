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
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";

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
      const response = await fetch(`/api/queue/${id}`, {
        method: "DELETE",
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

  // WhatsApp QR and connection logic (copied from admin dashboard)
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const [qrCopied, setQrCopied] = useState(false);

  useEffect(() => {
    const socket = io();
    socket.on('qr', (qrCodeData: string) => {
      setQrCode(qrCodeData);
      setIsWhatsAppConnected(false);
    });
    socket.on('connected', () => {
      setIsWhatsAppConnected(true);
      setQrCode(null);
    });
    socket.on('disconnected', () => {
      setIsWhatsAppConnected(false);
      setQrCode(null);
    });
    // Check initial connection status
    const checkInitialStatus = async () => {
      try {
        const response = await fetch("/api/whatsapp/status", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setIsWhatsAppConnected(data.connected);
          if (data.qrCode && !data.connected) {
            setQrCode(data.qrCode);
          }
        }
      } catch {}
    };
    checkInitialStatus();
    return () => { socket.disconnect(); };
  }, []);

  // Block dashboard with a full-screen modal if WhatsApp is not connected
  if (!isWhatsAppConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="max-w-md w-full p-6 bg-gray-800 rounded-lg shadow-lg flex flex-col items-center">
          <MessageCircle className="h-8 w-8 mb-2 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Connect WhatsApp</h2>
          <p className="text-sm text-gray-400 mb-4 text-center">
            {isMobile
              ? "You are on a mobile device. Scan this QR code using WhatsApp on another device, or tap the button below to copy the QR data."
              : "Scan this QR code with your WhatsApp app to connect."}
          </p>
          {qrCode ? (
            <div className="p-4 bg-white rounded-lg mb-4">
              <QRCodeSVG value={qrCode} size={isMobile ? 180 : 256} />
            </div>
          ) : (
            <div className="text-gray-400 mb-4">Waiting for QR code...</div>
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
              <p className="text-xs text-gray-400 text-center mb-2">
                Open WhatsApp, tap the three dots → Linked Devices → Link a Device, and paste the copied QR if needed.
              </p>
            </>
          )}
          <p className="text-xs text-gray-500 text-center">
            Make sure you have WhatsApp installed on your phone. If you have trouble, try reconnecting or generating a new QR from another device.
          </p>
        </div>
      </div>
    );
  }

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
        
      </div>
      </div>
    </div>
  );
}