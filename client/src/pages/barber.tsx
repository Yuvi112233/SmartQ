import { Users, Clock, Check, TrendingUp, Phone, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { QueueList } from "@/components/queue-list";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QueueEntry } from "@shared/schema";

export default function Barber() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: queue = [], isLoading } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const callNextMutation = useMutation({
    mutationFn: async () => {
      // For the public barber panel, we'll use the old method
      if (queue.length === 0) {
        throw new Error("No customers in queue");
      }
      const firstCustomer = queue[0];
      await apiRequest("DELETE", `/api/queue/${firstCustomer.id}`);
      return firstCustomer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Customer Called",
        description: `${customer.name} has been called for service`,
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

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    },
    onSuccess: () => {
      toast({
        title: "Refreshed",
        description: "Queue data has been refreshed",
      });
    },
  });

  const totalQueue = queue.length;
  const avgWaitTime = Math.max(totalQueue * 5, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">SmartQ</h1>
            </div>
            <nav className="flex space-x-4">
              <Button variant="ghost" size="sm" asChild className="text-gray-600">
                <Link href="/customer">Customer</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/barber">Barber Panel</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-gray-600">
                <Link href="/admin/login">Admin</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Barber Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Users className="h-8 w-8 mr-3 text-primary" />
                Barber Dashboard
              </h2>
              <p className="text-slate-400 mt-1">Manage your queue and serve customers</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">Total in Queue</p>
                <p className="text-2xl font-bold text-green-400">{totalQueue}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Avg Wait Time</p>
                <p className="text-xl font-semibold text-white">{avgWaitTime} min</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <Button
              onClick={() => callNextMutation.mutate()}
              disabled={callNextMutation.isPending || queue.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Next Customer
            </Button>
            <Button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              variant="secondary"
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-400">Live Queue</span>
          </div>
        </div>

        {/* Queue List */}
        <QueueList queue={queue} isLoading={isLoading} />

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Customers Served Today</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-green-600 bg-opacity-20 rounded-lg flex items-center justify-center">
                <Check className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Average Service Time</p>
                <p className="text-2xl font-bold text-white">15 min</p>
              </div>
              <div className="w-12 h-12 bg-primary bg-opacity-20 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Peak Hours</p>
                <p className="text-2xl font-bold text-white">2-4 PM</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600 bg-opacity-20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
