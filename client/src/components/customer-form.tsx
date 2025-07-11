import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertQueueEntrySchema, type InsertQueueEntry } from "@shared/schema";

export function CustomerForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<InsertQueueEntry>({
    resolver: zodResolver(insertQueueEntrySchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (data: InsertQueueEntry) => {
      const response = await apiRequest("POST", "/api/queue", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      setIsSubmitted(true);
      form.reset();
      toast({
        title: "Success!",
        description: "You've been added to the queue. Please wait for your turn.",
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

  const onSubmit = (data: InsertQueueEntry) => {
    addToQueueMutation.mutate(data);
  };

  return (
    <Card className="bg-white rounded-2xl shadow-xl">
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder=" "
                        className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-transparent"
                      />
                    </FormControl>
                    <FormLabel className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-gray-600 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-primary peer-focus:text-sm transition-all">
                      Full Name
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Field */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder=" "
                        className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-transparent"
                      />
                    </FormControl>
                    <FormLabel className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-gray-600 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-primary peer-focus:text-sm transition-all">
                      Phone Number
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={addToQueueMutation.isPending}
              className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addToQueueMutation.isPending ? "Adding..." : "Join Queue"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
