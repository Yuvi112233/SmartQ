import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Barber() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to barber login
    navigate("/barber/login");
  }, [navigate]);

  return null;
}