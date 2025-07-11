import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QueueEntry } from "@shared/schema";

interface QueueListProps {
  queue: QueueEntry[];
  isLoading: boolean;
}

export function QueueList({ queue, isLoading }: QueueListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const formatTimeAdded = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(timestamp).getTime()) / 60000);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    return `${diffInMinutes} minutes ago`;
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <CardHeader className="px-6 py-4 bg-slate-700 border-b border-slate-600">
          <CardTitle className="text-lg font-semibold text-white">Current Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-700">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      <CardHeader className="px-6 py-4 bg-slate-700 border-b border-slate-600">
        <CardTitle className="text-lg font-semibold text-white">Current Queue</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {queue.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 text-lg">No customers in queue</div>
            <p className="text-slate-500 text-sm mt-2">Queue is empty. Customers will appear here when they join.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {queue.map((customer, index) => (
              <div key={customer.id} className="p-6 hover:bg-slate-750 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-primary' : 'bg-slate-600'
                      }`}>
                        <span className="text-white font-bold">{index + 1}</span>
                      </div>
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
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Waiting
                    </Badge>
                    <Button
                      onClick={() => removeFromQueueMutation.mutate(customer.id)}
                      disabled={removeFromQueueMutation.isPending}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                    >
                      <X className="h-4 w-4 mr-1" />
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
  );
}
