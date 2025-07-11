import { Users, Clock, User, Phone } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customer-form";
import { QueueStatus } from "@/components/queue-status";
import { useQuery } from "@tanstack/react-query";
import type { QueueEntry } from "@shared/schema";

export default function Customer() {
  const { data: queue = [] } = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const queueLength = queue.length;
  const avgWaitTime = Math.max(queueLength * 5, 5); // Rough estimate: 5 minutes per person

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">SmartQ</h1>
            </div>
            <nav className="flex space-x-4">
              <Button variant="default" size="sm" asChild>
                <Link href="/customer">Customer</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/barber">Barber Panel</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Customer Panel */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Join the Queue</h2>
            <p className="text-gray-600">Skip the wait, book your spot</p>
          </div>

          {/* Customer Form */}
          <CustomerForm />

          {/* Queue Status */}
          <QueueStatus />

          {/* Current Queue Info */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Current Queue
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">People in queue</span>
                <span className="text-lg font-bold text-primary">{queueLength}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Average wait time</span>
                <span className="text-sm font-medium text-gray-900">{avgWaitTime} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
